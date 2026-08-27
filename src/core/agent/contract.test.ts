// ============================================
// Frozen /api/agent contract. Runtime-agnostic.
// Hits HTTP / invoke only. Does not import Playwright or CDP internals.
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { GET as discoverGet, POST as discoverPost } from '@/app/api/agent/route';
import { GET as tabsGet, POST as tabsPost } from '@/app/api/agent/tabs/route';
import { GET as tabGet, DELETE as tabDelete } from '@/app/api/agent/tabs/[id]/route';
import { POST as tabAct } from '@/app/api/agent/tabs/[id]/act/route';
import { GET as screenshotGet } from '@/app/api/agent/tabs/[id]/screenshot/route';
import { invokeAffordance } from './invoke';
import {
    __stopEnsuredChrome,
    setEnsureChromeLocatorForTests,
    setEverydayChromeRunningForTests
} from './runtime/ensure';
import {
    AGENT_CONTRACT_VERSION,
    AGENT_DISCOVERY_SCHEMA,
    AGENT_TAB_SNAPSHOT_SCHEMA,
    AGENT_TARGET_SCHEMA,
    FORBIDDEN_CALLER_KEYS,
    FROZEN_AFFORDANCE_IDS,
    SNAPSHOT_REQUIRED_FIELDS,
    TAB_RUNTIME_KINDS,
    validateAgainstSchema
} from './contract';

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

function expectNoRuntimeLeak(value: unknown, allowed: readonly string[] = []) {
    const keys = collectKeys(value);
    for (const forbidden of FORBIDDEN_CALLER_KEYS) {
        if (allowed.includes(forbidden)) continue;
        expect(keys.has(forbidden), `caller-visible leak: ${forbidden}`).toBe(false);
    }
}

function publicFile(name: string) {
    return fs.readFileSync(path.join(process.cwd(), 'public', name), 'utf8');
}

let fixtureOrigin = '';
let fixtureServer: http.Server;

beforeAll(async () => {
    fixtureServer = http.createServer((req, res) => {
        const url = req.url ?? '/';
        const file = url.includes('agent-fixture-b') ? 'agent-fixture-b.html' : 'agent-fixture.html';
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        res.end(publicFile(file));
    });
    await new Promise<void>((resolve) => {
        fixtureServer.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = fixtureServer.address();
    if (!addr || typeof addr === 'string') throw new Error('fixture server failed to bind');
    fixtureOrigin = `http://127.0.0.1:${addr.port}`;
}, 30_000);

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        fixtureServer.close((err) => (err ? reject(err) : resolve()));
    });
});

afterEach(async () => {
    const listed = await invokeAffordance('tabs.list');
    const tabs = (listed.body.tabs as Array<{ id: string }>) || [];
    await Promise.all(tabs.map((tab) => invokeAffordance('tabs.dispose', { tabId: tab.id })));
});

describe('frozen agent contract (runtime-agnostic)', () => {
    it('this file does not import Playwright or CDP internals', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
        expect(imports).not.toMatch(/cdpRuntime|cdpClient|\/chrome['"]|runtime\/resolve/);
        expect(imports).not.toMatch(/browserTabs/);
    });

    it('GET /api/agent is the frozen discover contract', async () => {
        const { status, body } = await json(await discoverGet());
        expect(status).toBe(200);
        expect(validateAgainstSchema(AGENT_DISCOVERY_SCHEMA, body)).toEqual([]);
        expect(body.keyRequired).toBe(false);
        expect(body.auth).toBeUndefined();
        expect(TAB_RUNTIME_KINDS).toContain(body.tabRuntime);
        expect(body.contract.version).toBe(AGENT_CONTRACT_VERSION);
        expect(body.contract.snapshotRequired).toEqual([...SNAPSHOT_REQUIRED_FIELDS]);
        expect(body.contract.tabRuntime.discoveryOnly).toBe(true);

        const ids = (body.affordances as Array<{ id: string }>).map((a) => a.id);
        expect(ids).toEqual([...FROZEN_AFFORDANCE_IDS]);
        expect(ids).toContain('runtime.ensure');
        expect(ids).toContain('runtime.attach');
        expect(ids).toContain('runtime.targets');
        expect(ids).toContain('tabs.bind');
        for (const affordance of body.affordances as Array<{ keyRequired: boolean }>) {
            expect(affordance.keyRequired).toBe(false);
        }
        // cdpUrl is the advertised attach input, not a snapshot leak.
        expect(body.cdpUrl).toBeUndefined();
        expect(body.debugPort).toBeUndefined();
        expectNoRuntimeLeak(body, ['cdpUrl']);

        const ensure = (body.affordances as Array<{
            id: string;
            keyRequired: boolean;
            path: string;
            method: string;
            inputSchema: {
                required?: string[];
                properties?: Record<string, unknown>;
            };
        }>).find((a) => a.id === 'runtime.ensure');
        expect(ensure).toBeTruthy();
        expect(ensure!.keyRequired).toBe(false);
        expect(ensure!.method).toBe('POST');
        expect(ensure!.path).toBe('/api/agent');
        expect(ensure!.inputSchema.required ?? []).toEqual([]);

        const attach = (body.affordances as Array<{
            id: string;
            keyRequired: boolean;
            path: string;
            method: string;
            inputSchema: {
                properties?: Record<string, { type?: string }>;
            };
        }>).find((a) => a.id === 'runtime.attach');
        expect(attach).toBeTruthy();
        expect(attach!.keyRequired).toBe(false);
        expect(attach!.method).toBe('POST');
        expect(attach!.path).toBe('/api/agent');
        expect(attach!.inputSchema.properties?.cdpUrl?.type).toBe('string');
        expect(attach!.inputSchema.properties?.port).toBeTruthy();

        const targets = (body.affordances as Array<{
            id: string;
            keyRequired: boolean;
            path: string;
            method: string;
            mutates: string[];
        }>).find((a) => a.id === 'runtime.targets');
        expect(targets).toBeTruthy();
        expect(targets!.keyRequired).toBe(false);
        expect(targets!.method).toBe('POST');
        expect(targets!.path).toBe('/api/agent');
        expect(targets!.mutates).toEqual([]);

        const bind = (body.affordances as Array<{
            id: string;
            keyRequired: boolean;
            path: string;
            inputSchema: { required?: string[]; properties?: Record<string, { type?: string }> };
        }>).find((a) => a.id === 'tabs.bind');
        expect(bind).toBeTruthy();
        expect(bind!.keyRequired).toBe(false);
        expect(bind!.path).toBe('/api/agent');
        expect(bind!.inputSchema.required).toEqual(['targetId']);
        expect(bind!.inputSchema.properties?.targetId?.type).toBe('string');
    });

    it('runtime.targets and tabs.bind without attach fail cleanly, not 500', async () => {
        const listed = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.targets', input: {} })
                })
            )
        );
        expect(listed.status).toBe(400);
        expect(listed.status).not.toBe(500);
        expect(listed.body.keyRequired).toBe(false);
        expect(String(listed.body.error)).toMatch(/runtime\.attach/i);
        expectNoRuntimeLeak(listed.body);

        const missing = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'tabs.bind', input: {} })
                })
            )
        );
        expect(missing.status).toBe(400);
        expect(missing.status).not.toBe(500);
        expect(missing.body.keyRequired).toBe(false);
        expect(String(missing.body.error)).toMatch(/targetId/i);
        expectNoRuntimeLeak(missing.body);

        const unbound = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'tabs.bind',
                        input: { targetId: 'missing-target' }
                    })
                })
            )
        );
        expect(unbound.status).toBe(400);
        expect(unbound.status).not.toBe(500);
        expect(unbound.body.keyRequired).toBe(false);
        expect(String(unbound.body.error)).toMatch(/runtime\.attach/i);
        expectNoRuntimeLeak(unbound.body);
        expect(unbound.body.tab).toBeUndefined();
        expect(AGENT_TARGET_SCHEMA.required).toEqual(['id', 'title', 'url']);
    });

    it('runtime.ensure succeeds or fails clean, not 500, and never leaks debug fields', async () => {
        process.env.OMNI_CHROME_HEADLESS = '1';
        delete process.env.OMNI_CDP_URL;
        // Force the no-binary path here so this file cannot launch a real
        // Chrome into the Playwright adapter suite. Success is the live test.
        setEnsureChromeLocatorForTests(() => null);
        setEverydayChromeRunningForTests(false);
        try {
            const ensured = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                    })
                )
            );
            expect(ensured.status).not.toBe(500);
            expect(ensured.status).toBeGreaterThanOrEqual(400);
            expect(ensured.body.keyRequired).toBe(false);
            expect(typeof ensured.body.error).toBe('string');
            expect(String(ensured.body.error).length).toBeGreaterThan(0);
            expect(ensured.body.attached).toBeUndefined();
            expectNoRuntimeLeak(ensured.body);
            expect(ensured.body.debugPort).toBeUndefined();
            expect(ensured.body.profileDir).toBeUndefined();
            expect(ensured.body.userDataDir).toBeUndefined();
            expect(ensured.body.BrowserContext).toBeUndefined();
        } finally {
            setEnsureChromeLocatorForTests(null);
            setEverydayChromeRunningForTests(null);
            await __stopEnsuredChrome();
        }
    });

    it('runtime.attach rejects invalid CDP with a clean error, not 500', async () => {
        const missing = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.attach', input: {} })
                })
            )
        );
        expect(missing.status).toBe(400);
        expect(missing.status).not.toBe(500);
        expect(missing.body.keyRequired).toBe(false);
        expect(String(missing.body.error)).toMatch(/cdpUrl|port/i);
        expectNoRuntimeLeak(missing.body);

        const malformed = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'runtime.attach',
                        input: { cdpUrl: 'not-a-url' }
                    })
                })
            )
        );
        expect(malformed.status).toBe(400);
        expect(malformed.status).not.toBe(500);
        expect(malformed.body.keyRequired).toBe(false);
        expect(String(malformed.body.error)).toMatch(/cdpUrl|invalid/i);
        expectNoRuntimeLeak(malformed.body);

        const unreachable = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'runtime.attach',
                        input: { cdpUrl: 'http://127.0.0.1:1' }
                    })
                })
            )
        );
        expect(unreachable.status).toBeGreaterThanOrEqual(400);
        expect(unreachable.status).not.toBe(500);
        expect(unreachable.body.keyRequired).toBe(false);
        expect(typeof unreachable.body.error).toBe('string');
        expect(String(unreachable.body.error).length).toBeGreaterThan(0);
        expectNoRuntimeLeak(unreachable.body);
        expect(unreachable.body.tab).toBeUndefined();
    });

    it('create/read/list/act/screenshot/dispose stay on the snapshot shape', async () => {
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
        expect(created.body.keyRequired).toBe(false);
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, created.body.tab)).toEqual([]);
        expectNoRuntimeLeak(created.body);
        expect(created.body.tab.tabRuntime).toBeUndefined();

        const tabId = created.body.tab.id as string;
        const persist = (created.body.tab.actions as Array<{ name: string; ref: string }>).find(
            (action) => action.name === 'Persist session'
        );
        expect(persist?.ref).toBeTruthy();

        const listed = await json(await tabsGet());
        expect(listed.status).toBe(200);
        expect(listed.body.tabs.map((t: { id: string }) => t.id)).toContain(tabId);

        const clicked = await json(
            await tabAct(
                new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'tab.click', input: { ref: persist!.ref } })
                }),
                { params: Promise.resolve({ id: tabId }) }
            )
        );
        expect(clicked.status).toBe(200);
        expect(clicked.body.tab.text).toContain('session: alive / persisted');
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, clicked.body.tab)).toEqual([]);
        expectNoRuntimeLeak(clicked.body);

        const typed = await invokeAffordance('tab.type', {
            tabId,
            ref: 'e3',
            text: 'Ada'
        });
        expect(typed.status).toBe(200);
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, typed.body.tab)).toEqual([]);

        const navigated = await invokeAffordance('tab.navigate', {
            tabId,
            url: `${fixtureOrigin}/agent-fixture-b.html`
        });
        expect(navigated.status).toBe(200);
        const navigatedTab = navigated.body.tab as { title: string };
        expect(navigatedTab.title).toBe('Agent Fixture B');
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, navigated.body.tab)).toEqual([]);

        const read = await json(
            await tabGet(new Request(`http://local/api/agent/tabs/${tabId}`), {
                params: Promise.resolve({ id: tabId })
            })
        );
        expect(read.status).toBe(200);
        expect(read.body.tab.id).toBe(tabId);
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, read.body.tab)).toEqual([]);
        expect(read.body.tab.tabRuntime).toBeUndefined();

        const shot = await screenshotGet(
            new Request(`http://local/api/agent/tabs/${tabId}/screenshot`),
            { params: Promise.resolve({ id: tabId }) }
        );
        expect(shot.status).toBe(200);
        expect(shot.headers.get('content-type')).toMatch(/image\/png/);

        const viaInvoke = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'tab.screenshot', input: { tabId } })
                })
            )
        );
        expect(viaInvoke.status).toBe(200);
        expect(viaInvoke.body.screenshot.contentType).toBe('image/png');
        expect(viaInvoke.body.screenshot.url).toMatch(
            new RegExp(`^/api/agent/tabs/${tabId}/screenshot`)
        );
        expectNoRuntimeLeak(viaInvoke.body);

        const disposed = await json(
            await tabDelete(new Request(`http://local/api/agent/tabs/${tabId}`), {
                params: Promise.resolve({ id: tabId })
            })
        );
        expect(disposed.status).toBe(200);
        expect(disposed.body.disposed).toBe(tabId);
        expectNoRuntimeLeak(disposed.body);

        const gone = await json(
            await tabGet(new Request(`http://local/api/agent/tabs/${tabId}`), {
                params: Promise.resolve({ id: tabId })
            })
        );
        expect(gone.status).toBe(404);
        expect(gone.body.keyRequired).toBe(false);
    }, 90_000);
});
