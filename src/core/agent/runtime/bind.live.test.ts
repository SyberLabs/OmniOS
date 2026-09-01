// ============================================
// Live bind: adopt an already-open Chrome page, act, unbind.
// Skips when this machine cannot start Chrome+CDP.
// Does not fake bind with Playwright.
// ============================================

import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as discoverPost } from '@/app/api/agent/route';
import { POST as tabsPost } from '@/app/api/agent/tabs/route';
import { GET as tabGet, DELETE as tabDelete } from '@/app/api/agent/tabs/[id]/route';
import { POST as tabAct } from '@/app/api/agent/tabs/[id]/act/route';
import { GET as screenshotGet } from '@/app/api/agent/tabs/[id]/screenshot/route';
import { __resetAgentTabs } from '../browserTabs';
import { AGENT_TAB_SNAPSHOT_SCHEMA, FORBIDDEN_CALLER_KEYS, validateAgainstSchema } from '../contract';
import { findChrome } from './chrome';
import { createCdpRuntime } from './cdpRuntime';
import { setTabRuntimeForTests } from './resolve';

const chrome = findChrome();
const runLiveBind = Boolean(chrome) && process.env.OMNI_TAB_RUNTIME !== 'playwright';

async function json(res: Response) {
    return { status: res.status, body: await res.json() };
}

function collectKeys(value: unknown, into: Set<string> = new Set()): Set<string> {
    if (!value || typeof value !== 'object') return into;
    if (Array.isArray(value)) {
        for (const item of value) collectKeys(item, into);
        return into;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        into.add(key);
        collectKeys(child, into);
    }
    return into;
}

function expectNoRuntimeLeak(value: unknown) {
    const keys = collectKeys(value);
    for (const forbidden of FORBIDDEN_CALLER_KEYS) {
        expect(keys.has(forbidden), `caller-visible leak: ${forbidden}`).toBe(false);
    }
}

async function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            if (!addr || typeof addr === 'string') {
                server.close();
                reject(new Error('Failed to allocate a debug port'));
                return;
            }
            const port = addr.port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

async function waitForJson(url: string, timeoutMs = 15_000): Promise<unknown> {
    const start = Date.now();
    let last = '';
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
            last = `HTTP ${res.status}`;
        } catch (error) {
            last = error instanceof Error ? error.message : 'fetch failed';
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`CDP did not come up at ${url}: ${last}`);
}

async function jsonNew(port: number, pageUrl: string): Promise<{ id: string; url?: string; title?: string }> {
    const res = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(pageUrl)}`, {
        method: 'PUT'
    });
    if (!res.ok) throw new Error(`json/new failed: HTTP ${res.status}`);
    return (await res.json()) as { id: string; url?: string; title?: string };
}

async function jsonList(port: number): Promise<Array<{ id?: string; type?: string; url?: string; title?: string }>> {
    return (await waitForJson(`http://127.0.0.1:${port}/json/list`)) as Array<{
        id?: string;
        type?: string;
        url?: string;
        title?: string;
    }>;
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe.skipIf(!runLiveBind)('tabs.bind to an already-open Chrome page', () => {
    let fixtureOrigin = '';
    let fixtureServer: http.Server;
    let chromeProc: ChildProcess | null = null;
    let debugPort = 0;
    let userDataDir = '';
    let chromeAlive = false;

    beforeAll(async () => {
        process.env.OMNI_CHROME_HEADLESS = '1';
        delete process.env.OMNI_CDP_URL;
        setTabRuntimeForTests(createCdpRuntime());

        fixtureServer = http.createServer((req, res) => {
            const url = req.url ?? '/';
            const file = url.includes('agent-fixture-b')
                ? 'agent-fixture-b.html'
                : 'agent-fixture.html';
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            res.end(fs.readFileSync(path.join(process.cwd(), 'public', file), 'utf8'));
        });
        await new Promise<void>((resolve) => {
            fixtureServer.listen(0, '127.0.0.1', () => resolve());
        });
        const addr = fixtureServer.address();
        if (!addr || typeof addr === 'string') throw new Error('fixture bind failed');
        fixtureOrigin = `http://127.0.0.1:${addr.port}`;

        debugPort = await freePort();
        userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-bind-chrome-'));
        chromeProc = spawn(
            chrome!,
            [
                `--user-data-dir=${userDataDir}`,
                `--remote-debugging-port=${debugPort}`,
                '--remote-debugging-address=127.0.0.1',
                '--no-first-run',
                '--no-default-browser-check',
                '--disable-sync',
                '--disable-extensions',
                '--disable-default-apps',
                '--headless=new',
                '--no-sandbox',
                '--disable-dev-shm-usage',
                'about:blank'
            ],
            { stdio: ['ignore', 'ignore', 'pipe'] }
        );
        chromeProc.once('exit', () => {
            chromeAlive = false;
        });
        await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
        chromeAlive = chromeProc.exitCode == null;
    }, 30_000);

    afterAll(async () => {
        await __resetAgentTabs();
        setTabRuntimeForTests(null);
        if (chromeProc && chromeProc.exitCode == null) {
            chromeProc.kill('SIGTERM');
            await new Promise((resolve) => setTimeout(resolve, 400));
            if (chromeProc.exitCode == null) chromeProc.kill('SIGKILL');
        }
        await new Promise<void>((resolve, reject) => {
            fixtureServer.close((err) => (err ? reject(err) : resolve()));
        });
        try {
            fs.rmSync(userDataDir, { recursive: true, force: true });
        } catch {
            // leftover profile
        }
    }, 30_000);

    beforeEach(async () => {
        await __resetAgentTabs();
    });

    it('this file does not import Playwright', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
    });

    it('lists two pages, binds the non-OmniOS one, acts, unbinds without destroying it', async () => {
        expect(chromeAlive).toBe(true);

        const userPage = await jsonNew(debugPort, `${fixtureOrigin}/agent-fixture.html`);
        expect(userPage.id).toBeTruthy();
        const started = Date.now();
        while (Date.now() - started < 8_000) {
            const pages = await jsonList(debugPort);
            const ready = pages.find(
                (item) => item.id === userPage.id && (item.title === 'Agent Fixture A' || item.url?.includes('agent-fixture'))
            );
            if (ready) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const attached = await json(
            await discoverPost(
                new Request('http://localhost/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'runtime.attach',
                        input: { cdpUrl: `http://127.0.0.1:${debugPort}` }
                    })
                })
            )
        );
        expect(attached.status).toBe(200);
        expect(attached.body.keyRequired).toBe(false);
        expectNoRuntimeLeak(attached.body);

        const listed = await json(
            await discoverPost(
                new Request('http://localhost/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.targets', input: {} })
                })
            )
        );
        expect(listed.status).toBe(200);
        expect(listed.body.keyRequired).toBe(false);
        const targets = listed.body.targets as Array<{ id: string; title: string; url: string }>;
        expect(targets.length).toBeGreaterThanOrEqual(2);
        expect(targets.map((t) => t.id)).toContain(userPage.id);
        for (const target of targets) {
            expect(Object.keys(target).sort()).toEqual(['id', 'title', 'url']);
        }
        expectNoRuntimeLeak(listed.body);

        const bound = await json(
            await discoverPost(
                new Request('http://localhost/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'tabs.bind',
                        input: { targetId: userPage.id }
                    })
                })
            )
        );
        expect(bound.status).toBe(201);
        expect(bound.body.keyRequired).toBe(false);
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, bound.body.tab)).toEqual([]);
        expect(bound.body.tab.title).toBe('Agent Fixture A');
        expect(String(bound.body.tab.url)).toContain('agent-fixture.html');
        expectNoRuntimeLeak(bound.body);
        const tabId = bound.body.tab.id as string;
        const persistRef = (
            bound.body.tab.actions as Array<{ name: string; ref: string }>
        ).find((a) => a.name === 'Persist session')!.ref;

        const clicked = await json(
            await tabAct(
                new Request(`http://localhost/api/agent/tabs/${tabId}/act`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'tab.click',
                        input: { ref: persistRef }
                    })
                }),
                { params: Promise.resolve({ id: tabId }) }
            )
        );
        expect(clicked.status).toBe(200);
        expect(clicked.body.tab.text).toContain('session: alive / persisted');
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, clicked.body.tab)).toEqual([]);
        expectNoRuntimeLeak(clicked.body);

        const shot = await screenshotGet(
            new Request(`http://localhost/api/agent/tabs/${tabId}/screenshot`),
            { params: Promise.resolve({ id: tabId }) }
        );
        const bytes = Buffer.from(await shot.arrayBuffer());
        expect(shot.status).toBe(200);
        expect(bytes.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);

        const created = await json(
            await tabsPost(
                new Request('http://localhost/api/agent/tabs', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ url: `${fixtureOrigin}/agent-fixture-b.html` })
                })
            )
        );
        expect(created.status).toBe(201);
        const createdId = created.body.tab.id as string;
        const createdTarget = (
            (await jsonList(debugPort)).find(
                (item) => item.type === 'page' && item.title === 'Agent Fixture B'
            ) || {}
        ).id;

        const disposedBound = await json(
            await tabDelete(new Request(`http://localhost/api/agent/tabs/${tabId}`), {
                params: Promise.resolve({ id: tabId })
            })
        );
        expect(disposedBound.status).toBe(200);
        expect(disposedBound.body.disposed).toBe(tabId);
        expectNoRuntimeLeak(disposedBound.body);

        const gone = await json(
            await tabGet(new Request(`http://localhost/api/agent/tabs/${tabId}`), {
                params: Promise.resolve({ id: tabId })
            })
        );
        expect(gone.status).toBe(404);

        const stillOpen = await jsonList(debugPort);
        expect(stillOpen.some((item) => item.id === userPage.id)).toBe(true);
        expect(chromeProc?.exitCode).toBeNull();
        expect(chromeAlive).toBe(true);

        const disposedCreated = await json(
            await tabDelete(new Request(`http://localhost/api/agent/tabs/${createdId}`), {
                params: Promise.resolve({ id: createdId })
            })
        );
        expect(disposedCreated.status).toBe(200);
        if (createdTarget) {
            const afterCreated = await jsonList(debugPort);
            expect(afterCreated.some((item) => item.id === createdTarget)).toBe(false);
        }
        expect(stillOpen.some((item) => item.id === userPage.id)).toBe(true);
        const afterAll = await jsonList(debugPort);
        expect(afterAll.some((item) => item.id === userPage.id)).toBe(true);
    }, 90_000);
});

describe('tabs.bind availability', () => {
    it('does not fake bind with Playwright when the live suite is skipped', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
        if (process.env.OMNI_TAB_RUNTIME === 'playwright') {
            expect(runLiveBind).toBe(false);
        }
    });
});
