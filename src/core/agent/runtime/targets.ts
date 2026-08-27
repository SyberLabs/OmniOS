// ============================================
// List already-open Chrome pages after runtime.attach.
// Uses /json/list (same HTTP surface as attach). No Playwright.
// Caller-visible rows are {id, title, url} only.
// ============================================

import fs from 'node:fs';
import { AgentTabError } from '../errors';
import { getProcessAttachHttp } from './attach';
import { persistRoot, runtimeStatePath } from './paths';

export type AttachedPage = {
    id: string;
    title: string;
    url: string;
};

export type AttachedPageRecord = AttachedPage & {
    webSocketDebuggerUrl?: string;
};

function attachHttp(affordance: string): string {
    const base = (getProcessAttachHttp() || process.env.OMNI_CDP_URL || '').replace(/\/$/, '');
    if (!base) {
        throw new AgentTabError(400, `${affordance} requires runtime.attach first`);
    }
    return base;
}

async function fetchList(httpBase: string): Promise<AttachedPageRecord[]> {
    let raw: unknown;
    try {
        const res = await fetch(`${httpBase}/json/list`);
        if (!res.ok) {
            throw new AgentTabError(502, `Cannot list Chrome pages at ${httpBase}: HTTP ${res.status}`);
        }
        raw = await res.json();
    } catch (error) {
        if (error instanceof AgentTabError) throw error;
        throw new AgentTabError(
            502,
            error instanceof Error ? error.message : `Cannot list Chrome pages at ${httpBase}`
        );
    }
    if (!Array.isArray(raw)) {
        throw new AgentTabError(502, 'Chrome page list was not an array');
    }
    const pages: AttachedPageRecord[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
        const row = item as Record<string, unknown>;
        if (row.type !== 'page' || typeof row.id !== 'string' || !row.id) continue;
        pages.push({
            id: row.id,
            title: typeof row.title === 'string' ? row.title : '',
            url: typeof row.url === 'string' ? row.url : '',
            webSocketDebuggerUrl:
                typeof row.webSocketDebuggerUrl === 'string' ? row.webSocketDebuggerUrl : undefined
        });
    }
    return pages;
}

export async function listAttachedPages(): Promise<AttachedPage[]> {
    const records = await fetchList(attachHttp('runtime.targets'));
    return records.map(({ id, title, url }) => ({ id, title, url }));
}

export async function resolveAttachedPage(targetId: string): Promise<AttachedPageRecord> {
    const trimmed = targetId.trim();
    if (!trimmed) {
        throw new AgentTabError(400, 'tabs.bind requires targetId');
    }
    const records = await fetchList(attachHttp('tabs.bind'));
    const page = records.find((item) => item.id === trimmed);
    if (!page) {
        throw new AgentTabError(404, `Target not found: ${trimmed}`);
    }
    return page;
}

export function findTabIdByTarget(targetId: string): string | null {
    const root = persistRoot();
    if (!fs.existsSync(root)) return null;
    for (const id of fs.readdirSync(root)) {
        try {
            const state = JSON.parse(fs.readFileSync(runtimeStatePath(id), 'utf8')) as {
                targetId?: string;
            };
            if (state.targetId === targetId) return id;
        } catch {
            // no runtime.json for this tab
        }
    }
    return null;
}
