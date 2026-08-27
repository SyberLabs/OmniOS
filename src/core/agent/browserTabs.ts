// ============================================
// PROJECT OMNI: AGENT SURFACE — LIVE BROWSER TABS
// One isolated Playwright context per tab. Cookies and
// storageState are written to disk so the next HTTP call
// can restore the page even if the live context was dropped.
// ============================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { generateId } from '@/lib/utils';
import type { AgentTab, PageLink } from './types';

export class AgentTabError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

type LiveTab = {
    context: BrowserContext;
    page: Page;
    createdAt: number;
};

type TabMeta = {
    id: string;
    url: string;
    createdAt: number;
    snapshot: AgentTab;
};

const live = new Map<string, LiveTab>();
let browserPromise: Promise<Browser> | null = null;

function inTest(): boolean {
    return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

function persistRoot(): string {
    if (process.env.OMNI_AGENT_TABS_DIR) return process.env.OMNI_AGENT_TABS_DIR;
    if (inTest()) return path.join(os.tmpdir(), 'omni-agent-tabs-vitest');
    return path.join(process.cwd(), '.omni', 'tabs');
}

function tabDir(id: string): string {
    return path.join(persistRoot(), id);
}

function storagePath(id: string): string {
    return path.join(tabDir(id), 'storage.json');
}

function metaPath(id: string): string {
    return path.join(tabDir(id), 'meta.json');
}

async function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
        browserPromise = chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserPromise;
}

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

async function writePersist(id: string, context: BrowserContext, snapshot: AgentTab): Promise<void> {
    fs.mkdirSync(tabDir(id), { recursive: true });
    await context.storageState({ path: storagePath(id) });
    const meta: TabMeta = {
        id,
        url: snapshot.url,
        createdAt: snapshot.createdAt,
        snapshot
    };
    fs.writeFileSync(metaPath(id), JSON.stringify(meta));
}

async function snapshot(page: Page, id: string, createdAt: number): Promise<AgentTab> {
    const title = await page.title();
    const url = page.url();
    const text = ((await page.locator('body').innerText().catch(() => '')) || '').slice(0, 4000);
    const links = (await page.locator('a[href]').evaluateAll((els) =>
        els.slice(0, 30).map((el) => ({
            href: (el as HTMLAnchorElement).href,
            text: ((el as HTMLElement).textContent || '').trim()
        }))
    ).catch(() => [])) as PageLink[];

    return {
        id,
        title,
        url,
        text,
        links,
        createdAt,
        updatedAt: Date.now()
    };
}

async function closeLive(id: string): Promise<void> {
    const entry = live.get(id);
    if (!entry) return;
    live.delete(id);
    await entry.page.close().catch(() => undefined);
    await entry.context.close().catch(() => undefined);
}

async function attach(id: string, createdAt: number): Promise<LiveTab> {
    const browser = await getBrowser();
    const stored = storagePath(id);
    const context = await browser.newContext({
        storageState: fs.existsSync(stored) ? stored : undefined
    });
    const page = await context.newPage();
    const entry = { context, page, createdAt };
    live.set(id, entry);
    return entry;
}

async function ensureLive(id: string): Promise<LiveTab> {
    const existing = live.get(id);
    if (existing) return existing;

    const meta = readMeta(id);
    if (!meta) throw new AgentTabError(404, `Tab not found: ${id}`);

    const entry = await attach(id, meta.createdAt);
    if (meta.url) {
        await entry.page.goto(meta.url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    }
    return entry;
}

async function capture(id: string, entry: LiveTab): Promise<AgentTab> {
    const tab = await snapshot(entry.page, id, entry.createdAt);
    await writePersist(id, entry.context, tab);
    return tab;
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
    const entry = await attach(id, createdAt);
    try {
        await entry.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20_000 });
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
    await entry.page.goto(target, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    return capture(id, entry);
}

export async function clickTab(id: string, selector: string): Promise<AgentTab> {
    if (!selector.trim()) throw new AgentTabError(400, 'tab.click requires selector');
    const entry = await ensureLive(id);
    await entry.page.locator(selector).click({ timeout: 10_000 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    return capture(id, entry);
}

export async function typeTab(id: string, selector: string, text: string): Promise<AgentTab> {
    if (!selector.trim()) throw new AgentTabError(400, 'tab.type requires selector');
    const entry = await ensureLive(id);
    await entry.page.locator(selector).fill(text, { timeout: 10_000 });
    return capture(id, entry);
}

export async function disposeTab(id: string): Promise<string> {
    const existed = live.has(id) || Boolean(readMeta(id));
    await closeLive(id);
    if (fs.existsSync(tabDir(id))) {
        fs.rmSync(tabDir(id), { recursive: true, force: true });
    }
    if (!existed) throw new AgentTabError(404, `Tab not found: ${id}`);
    return id;
}

/** Close live Playwright pages/contexts. Disk storageState stays. */
export async function __dropLiveContexts(): Promise<void> {
    const ids = [...live.keys()];
    await Promise.all(ids.map((id) => closeLive(id)));
}

/** Test hook: drop live contexts and wipe persisted tabs. */
export async function __resetAgentTabs(): Promise<void> {
    await __dropLiveContexts();
    const root = persistRoot();
    if (fs.existsSync(root)) {
        fs.rmSync(root, { recursive: true, force: true });
    }
}
