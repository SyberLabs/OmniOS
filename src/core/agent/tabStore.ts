// ============================================
// PROJECT OMNI: AGENT SURFACE — LOCAL TAB STORE
// Server-local persistent tabs so curl / fetch / another agent
// share the same lightweight session records. Not IndexedDB:
// browser IDB is invisible to an arbitrary HTTP client.
// ============================================

import fs from 'node:fs';
import path from 'node:path';
import { generateId } from '@/lib/utils';
import type { AgentTab } from './types';

const DEFAULT_PERSIST = path.join(process.cwd(), '.omni', 'agent-tabs.json');

export type CreateTabInput = {
    title?: string;
    url?: string;
    note?: string;
};

export type TabStore = {
    list(): AgentTab[];
    create(input?: CreateTabInput): AgentTab;
    read(id: string): AgentTab | undefined;
    writeNote(id: string, text: string): AgentTab | undefined;
    setUrl(id: string, url: string): AgentTab | undefined;
    dispose(id: string): AgentTab | undefined;
};

function clampString(value: unknown, max: number): string | null {
    if (value == null) return null;
    if (typeof value !== 'string') return null;
    return value.slice(0, max);
}

function loadPersisted(persistPath: string): AgentTab[] {
    try {
        const raw = fs.readFileSync(persistPath, 'utf8');
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(isAgentTab);
    } catch {
        return [];
    }
}

function isAgentTab(value: unknown): value is AgentTab {
    if (!value || typeof value !== 'object') return false;
    const t = value as AgentTab;
    return typeof t.id === 'string' && typeof t.title === 'string';
}

function writePersisted(persistPath: string, tabs: AgentTab[]): void {
    fs.mkdirSync(path.dirname(persistPath), { recursive: true });
    fs.writeFileSync(persistPath, JSON.stringify(tabs, null, 2));
}

export function createTabStore(options?: {
    seed?: AgentTab[];
    persistPath?: string;
}): TabStore {
    const persistPath = options?.persistPath;
    const initial = persistPath ? loadPersisted(persistPath) : (options?.seed ?? []);
    const tabs = new Map<string, AgentTab>(initial.map((t) => [t.id, t]));

    const persist = () => {
        if (persistPath) writePersisted(persistPath, [...tabs.values()]);
    };

    const touch = (tab: AgentTab, patch: Partial<AgentTab>): AgentTab => {
        const next: AgentTab = {
            ...tab,
            ...patch,
            state: { ...tab.state, ...(patch.state ?? {}) },
            updatedAt: Date.now()
        };
        tabs.set(tab.id, next);
        persist();
        return next;
    };

    return {
        list() {
            return [...tabs.values()].sort((a, b) => b.updatedAt - a.updatedAt);
        },

        create(input = {}) {
            const now = Date.now();
            const title = clampString(input.title, 200) || 'untitled';
            const url = clampString(input.url, 2000);
            const note = clampString(input.note, 8000);
            const tab: AgentTab = {
                id: generateId('tab'),
                title,
                url,
                note,
                state: {
                    ...(url ? { url } : {}),
                    ...(note ? { note } : {})
                },
                createdAt: now,
                updatedAt: now
            };
            tabs.set(tab.id, tab);
            persist();
            return tab;
        },

        read(id) {
            return tabs.get(id);
        },

        writeNote(id, text) {
            const tab = tabs.get(id);
            if (!tab) return undefined;
            const note = clampString(text, 8000) ?? '';
            return touch(tab, { note, state: { ...tab.state, note } });
        },

        setUrl(id, url) {
            const tab = tabs.get(id);
            if (!tab) return undefined;
            const nextUrl = clampString(url, 2000) ?? '';
            return touch(tab, { url: nextUrl || null, state: { ...tab.state, url: nextUrl || null } });
        },

        dispose(id) {
            const tab = tabs.get(id);
            if (!tab) return undefined;
            tabs.delete(id);
            persist();
            return tab;
        }
    };
}

function inTest(): boolean {
    return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

let store: TabStore = createTabStore({
    persistPath: inTest() ? undefined : DEFAULT_PERSIST
});

export function getAgentTabStore(): TabStore {
    return store;
}

/** Test hook: replace the singleton with a fresh in-memory store. */
export function __resetAgentTabStore(): void {
    store = createTabStore();
}
