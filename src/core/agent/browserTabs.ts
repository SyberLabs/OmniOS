// ============================================
// PROJECT OMNI: AGENT SURFACE — LOCAL TABS
// A tab is a local lightweight browser state (Chrome/CDP profile).
// Playwright is only the test/CI adapter (OMNI_TAB_RUNTIME=playwright).
// ============================================

import fs from 'node:fs';
import { generateId } from '@/lib/utils';
import { AgentTabError } from './errors';
import { EXTRACT_ACTIONS_SOURCE, actionsFromRaw, linksFromActions } from './extract';
import { getTabRuntime } from './runtime';
import {
    metaPath,
    persistRoot,
    profileRoot,
    screenshotHref,
    screenshotPath,
    tabDir
} from './runtime/paths';
import type { LiveSession } from './runtime/types';
import type { Actionable, AgentTab } from './types';

export { AgentTabError };

type LiveTab = {
    session: LiveSession;
    createdAt: number;
    updatedAt: number;
};

type TabMeta = {
    id: string;
    url: string;
    createdAt: number;
    snapshot: AgentTab;
};

const live = new Map<string, LiveTab>();

function assertHttpUrl(raw: string): string {
    let parsed: URL;
    try {
        parsed = new URL(raw);
    } catch {
        throw new AgentTabError(400, 'Invalid URL');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new AgentTabError(400, 'Only http(s) URLs are allowed');
    }
    return parsed.toString();
}

function readMeta(id: string): TabMeta | null {
    try {
        const raw = JSON.parse(fs.readFileSync(metaPath(id), 'utf8')) as TabMeta;
        if (!raw || raw.id !== id) return null;
        return raw;
    } catch {
        return null;
    }
}

function writeMeta(id: string, snapshot: AgentTab): void {
    fs.mkdirSync(tabDir(id), { recursive: true });
    const meta: TabMeta = {
        id,
        url: snapshot.url,
        createdAt: snapshot.createdAt,
        snapshot
    };
    fs.writeFileSync(metaPath(id), JSON.stringify(meta));
}

async function extractActions(session: LiveSession): Promise<Actionable[]> {
    const raw = await session.evaluate<
        Array<{
            ref: string;
            role: Actionable['role'];
            name: string;
            href: string;
            value: string;
            actions: Array<'click' | 'type'>;
            selector: string;
        }>
    >(EXTRACT_ACTIONS_SOURCE);
    return actionsFromRaw(raw || []);
}

async function resolveSelector(
    session: LiveSession,
    last: AgentTab | undefined,
    target: { ref?: string; selector?: string }
): Promise<string> {
    if (target.selector?.trim()) return target.selector.trim();
    const ref = target.ref?.trim();
    if (!ref) {
        throw new AgentTabError(400, 'tab.click/type requires ref or selector');
    }

    const count = await session.evaluate<number>(
        `document.querySelectorAll(${JSON.stringify(`[data-omni-ref="${ref}"]`)}).length`
    );
    if (count) return `[data-omni-ref="${ref}"]`;

    const stored = last?.actions?.find((action) => action.ref === ref);
    if (stored?.selector) return stored.selector;

    const fresh = await extractActions(session);
    const again = fresh.find((action) => action.ref === ref);
    if (again?.selector) return again.selector;

    throw new AgentTabError(400, `Unknown action ref: ${ref}`);
}

async function snapshot(session: LiveSession, id: string, createdAt: number): Promise<AgentTab> {
    const title = await session.title();
    const url = await session.url();
    const text = await session.bodyText();
    const actions = await extractActions(session);
    const updatedAt = Date.now();
    return {
        id,
        title,
        url,
        text,
        links: linksFromActions(actions),
        actions,
        screenshot: screenshotHref(id, updatedAt),
        createdAt,
        updatedAt
    };
}

async function closeLive(id: string): Promise<void> {
    const entry = live.get(id);
    if (!entry) return;
    live.delete(id);
    await entry.session.close().catch(() => undefined);
}

async function ensureLive(id: string): Promise<LiveTab> {
    const meta = readMeta(id);
    if (!meta) {
        await closeLive(id);
        throw new AgentTabError(404, `Tab not found: ${id}`);
    }

    const existing = live.get(id);
    const diskUpdated = meta.snapshot?.updatedAt ?? 0;
    if (existing && existing.updatedAt >= diskUpdated) return existing;
    if (existing) await closeLive(id);

    const session = await getTabRuntime().restore(id);
    if (meta.url) await session.goto(meta.url);
    const entry = { session, createdAt: meta.createdAt, updatedAt: diskUpdated };
    live.set(id, entry);
    return entry;
}

async function capture(id: string, entry: LiveTab): Promise<AgentTab> {
    const tab = await snapshot(entry.session, id, entry.createdAt);
    const png = await entry.session.screenshotPng();
    fs.mkdirSync(tabDir(id), { recursive: true });
    fs.writeFileSync(screenshotPath(id), png);
    entry.updatedAt = tab.updatedAt;
    await entry.session.persist();
    writeMeta(id, tab);
    return tab;
}

export async function readTabScreenshot(id: string): Promise<Buffer> {
    const entry = await ensureLive(id);
    await capture(id, entry);
    return fs.readFileSync(screenshotPath(id));
}

export async function listTabs(): Promise<AgentTab[]> {
    const root = persistRoot();
    if (!fs.existsSync(root)) return [];
    const tabs: AgentTab[] = [];
    for (const id of fs.readdirSync(root)) {
        const meta = readMeta(id);
        if (meta?.snapshot) tabs.push(meta.snapshot);
    }
    return tabs.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function openTab(url: string): Promise<AgentTab> {
    const target = assertHttpUrl(url);
    const id = generateId('tab');
    const createdAt = Date.now();
    const session = await getTabRuntime().open(id);
    const entry = { session, createdAt, updatedAt: createdAt };
    live.set(id, entry);
    try {
        await session.goto(target);
        return await capture(id, entry);
    } catch (error) {
        await disposeTab(id).catch(() => undefined);
        if (error instanceof AgentTabError) throw error;
        throw new AgentTabError(
            502,
            error instanceof Error ? error.message : 'Failed to open page'
        );
    }
}

export async function readTab(id: string): Promise<AgentTab> {
    const entry = await ensureLive(id);
    return capture(id, entry);
}

export async function navigateTab(id: string, url: string): Promise<AgentTab> {
    const target = assertHttpUrl(url);
    const entry = await ensureLive(id);
    await entry.session.goto(target);
    return capture(id, entry);
}

export async function clickTab(
    id: string,
    target: { ref?: string; selector?: string }
): Promise<AgentTab> {
    const entry = await ensureLive(id);
    const last = readMeta(id)?.snapshot;
    const selector = await resolveSelector(entry.session, last, target);
    await entry.session.clickSelector(selector);
    return capture(id, entry);
}

export async function typeTab(
    id: string,
    target: { ref?: string; selector?: string },
    text: string
): Promise<AgentTab> {
    const entry = await ensureLive(id);
    const last = readMeta(id)?.snapshot;
    const selector = await resolveSelector(entry.session, last, target);
    await entry.session.fillSelector(selector, text);
    return capture(id, entry);
}

export async function disposeTab(id: string): Promise<string> {
    const existed = live.has(id) || Boolean(readMeta(id));
    await closeLive(id);
    if (fs.existsSync(tabDir(id))) {
        fs.rmSync(tabDir(id), { recursive: true, force: true });
    }
    await getTabRuntime().destroy(id);
    if (!existed) throw new AgentTabError(404, `Tab not found: ${id}`);
    return id;
}

/** Close live sessions. Disk profile / storageState stays. */
export async function __dropLiveContexts(): Promise<void> {
    const ids = [...live.keys()];
    await Promise.all(
        ids.map(async (id) => {
            await closeLive(id);
            await getTabRuntime().dropLive(id);
        })
    );
}

/** Test hook: mark the live page older than disk so the next call restores. */
export function __staleLive(id: string): void {
    const entry = live.get(id);
    if (entry) entry.updatedAt = 0;
}

/** Test hook: drop live sessions and wipe persisted tabs + profiles. */
export async function __resetAgentTabs(): Promise<void> {
    await __dropLiveContexts();
    for (const root of [persistRoot(), profileRoot()]) {
        for (let attempt = 0; attempt < 8; attempt++) {
            try {
                if (fs.existsSync(root)) {
                    fs.rmSync(root, { recursive: true, force: true });
                }
                break;
            } catch {
                await new Promise((resolve) => setTimeout(resolve, 80));
            }
        }
    }
}

export function currentTabRuntimeKind() {
    return getTabRuntime().kind;
}
