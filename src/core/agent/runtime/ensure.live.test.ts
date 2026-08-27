// ============================================
// Live runtime.ensure: launch or reuse a real Chrome with remote debugging.
// Skips when this machine cannot start Chrome, or under OMNI_TAB_RUNTIME=playwright.
// Does not fake ensure with Playwright.
// ============================================

import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as discoverGet, POST as discoverPost } from '@/app/api/agent/route';
import { POST as tabsPost } from '@/app/api/agent/tabs/route';
import { GET as tabGet, DELETE as tabDelete } from '@/app/api/agent/tabs/[id]/route';
import { __resetAgentTabs } from '../browserTabs';
import { FORBIDDEN_CALLER_KEYS } from '../contract';
import { findChrome } from './chrome';
import { createCdpRuntime } from './cdpRuntime';
import { __stopEnsuredChrome } from './ensure';
import { setTabRuntimeForTests } from './resolve';

const chrome = findChrome();
const runLiveEnsure = Boolean(chrome) && process.env.OMNI_TAB_RUNTIME !== 'playwright';

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

describe.skipIf(!runLiveEnsure)('runtime.ensure launches or reuses a real Chrome', () => {
    let fixtureOrigin = '';
    let fixtureServer: http.Server;

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
    }, 30_000);

    afterAll(async () => {
        await __resetAgentTabs();
        await __stopEnsuredChrome();
        setTabRuntimeForTests(null);
        await new Promise<void>((resolve, reject) => {
            fixtureServer.close((err) => (err ? reject(err) : resolve()));
        });
    }, 30_000);

    beforeEach(async () => {
        await __resetAgentTabs();
        await __stopEnsuredChrome();
        delete process.env.OMNI_CDP_URL;
        setTabRuntimeForTests(createCdpRuntime());
    });

    it('this file does not import Playwright', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
    });

    it('ensure with empty input attaches, then the tab loop works without runtime.attach', async () => {
        const ensured = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                })
            )
        );
        expect(ensured.status).toBe(200);
        expect(ensured.body.keyRequired).toBe(false);
        expect(ensured.body.attached).toBe(true);
        expect(typeof ensured.body.launched).toBe('boolean');
        expect(ensured.body.tabRuntime).toBe('cdp');
        expect(ensured.body.disposeCloses).toBe('omni-target');
        expectNoRuntimeLeak(ensured.body);

        const again = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                })
            )
        );
        expect(again.status).toBe(200);
        expect(again.body.attached).toBe(true);
        expect(again.body.launched).toBe(false);
        expectNoRuntimeLeak(again.body);

        const targets = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.targets', input: {} })
                })
            )
        );
        expect(targets.status).toBe(200);
        expect(Array.isArray(targets.body.targets)).toBe(true);
        expectNoRuntimeLeak(targets.body);

        const created = await json(
            await tabsPost(
                new Request('http://local/api/agent/tabs', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ url: `${fixtureOrigin}/agent-fixture.html` })
                })
            )
        );
        expect(created.status).toBe(201);
        expect(created.body.tab.title).toBe('Agent Fixture A');
        expectNoRuntimeLeak(created.body);
        const tabId = created.body.tab.id as string;

        const read = await json(
            await tabGet(new Request(`http://local/api/agent/tabs/${tabId}`), {
                params: Promise.resolve({ id: tabId })
            })
        );
        expect(read.status).toBe(200);
        expect(read.body.tab.id).toBe(tabId);

        const disposed = await json(
            await tabDelete(new Request(`http://local/api/agent/tabs/${tabId}`), {
                params: Promise.resolve({ id: tabId })
            })
        );
        expect(disposed.status).toBe(200);

        const reused = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                })
            )
        );
        expect(reused.status).toBe(200);
        expect(reused.body.attached).toBe(true);
        expect(reused.body.launched).toBe(false);

        const listed = await json(await discoverGet());
        expect(listed.body.affordances.map((a: { id: string }) => a.id)).toContain('runtime.ensure');
    }, 90_000);

    it('prefers an already-open debug Chrome over launching a second one', async () => {
        const debugPort = await freePort();
        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-ensure-existing-'));
        let chromeProc: ChildProcess | null = spawn(
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
        try {
            await waitForJson(`http://127.0.0.1:${debugPort}/json/version`);
            process.env.OMNI_CDP_URL = `http://127.0.0.1:${debugPort}`;

            const ensured = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                    })
                )
            );
            expect(ensured.status).toBe(200);
            expect(ensured.body.attached).toBe(true);
            expect(ensured.body.launched).toBe(false);
            expectNoRuntimeLeak(ensured.body);
            expect(chromeProc?.exitCode).toBeNull();
        } finally {
            delete process.env.OMNI_CDP_URL;
            if (chromeProc && chromeProc.exitCode == null) {
                chromeProc.kill('SIGTERM');
                await new Promise((resolve) => setTimeout(resolve, 400));
                if (chromeProc.exitCode == null) chromeProc.kill('SIGKILL');
            }
            chromeProc = null;
            try {
                fs.rmSync(userDataDir, { recursive: true, force: true });
            } catch {
                // leftover profile
            }
        }
    }, 90_000);

    it('does not launch chrome-debug when everyday Chrome is already open without a debug port', async () => {
        const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-ensure-everyday-'));
        let chromeProc: ChildProcess | null = spawn(
            chrome!,
            [
                `--user-data-dir=${userDataDir}`,
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
        try {
            await new Promise((resolve) => setTimeout(resolve, 800));
            expect(chromeProc.exitCode).toBeNull();

            const blocked = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                    })
                )
            );
            expect(blocked.status).toBe(409);
            expect(blocked.status).not.toBe(500);
            expect(blocked.status).not.toBe(503);
            expect(blocked.body.keyRequired).toBe(false);
            expect(String(blocked.body.error)).toMatch(/already open/i);
            expect(String(blocked.body.error)).toMatch(/not debuggable/i);
            expect(blocked.body.attached).toBeUndefined();
            expectNoRuntimeLeak(blocked.body);
            expect(chromeProc.exitCode).toBeNull();
        } finally {
            if (chromeProc && chromeProc.exitCode == null) {
                chromeProc.kill('SIGTERM');
                await new Promise((resolve) => setTimeout(resolve, 400));
                if (chromeProc.exitCode == null) chromeProc.kill('SIGKILL');
            }
            chromeProc = null;
            try {
                fs.rmSync(userDataDir, { recursive: true, force: true });
            } catch {
                // leftover profile
            }
        }

        const launched = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                })
            )
        );
        expect(launched.status).toBe(200);
        expect(launched.body.attached).toBe(true);
        expect(launched.body.launched).toBe(true);
        expectNoRuntimeLeak(launched.body);
    }, 90_000);
});

describe('runtime.ensure availability', () => {
    it('does not fake ensure with Playwright when the live suite is skipped', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
        if (process.env.OMNI_TAB_RUNTIME === 'playwright') {
            expect(runLiveEnsure).toBe(false);
        }
    });
});
