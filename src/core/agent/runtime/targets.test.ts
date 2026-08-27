// ============================================
// HTTP/contract: list existing Chrome pages after attach.
// Uses a mock CDP HTTP endpoint — not Playwright, not a live browser.
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { POST as discoverPost } from '@/app/api/agent/route';
import { __resetAgentTabs } from '../browserTabs';
import {
    AGENT_TARGET_SCHEMA,
    FORBIDDEN_CALLER_KEYS,
    validateAgainstSchema
} from '../contract';
import { runtimeStatePath, tabDir } from './paths';
import { createCdpRuntime } from './cdpRuntime';
import { listAttachedPages } from './targets';

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

function mockCdp(pages: unknown[]) {
    const server = http.createServer((req, res) => {
        const url = req.url ?? '/';
        if (url === '/json/version') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(
                JSON.stringify({
                    webSocketDebuggerUrl: 'ws://127.0.0.1:1/devtools/browser/fake',
                    Browser: 'HeadlessChrome/mock'
                })
            );
            return;
        }
        if (url === '/json/list') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(pages));
            return;
        }
        res.writeHead(404);
        res.end();
    });
    return new Promise<{ origin: string; close: () => Promise<void> }>((resolve, reject) => {
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            if (!addr || typeof addr === 'string') {
                reject(new Error('mock CDP failed to bind'));
                return;
            }
            resolve({
                origin: `http://127.0.0.1:${addr.port}`,
                close: () =>
                    new Promise((done, fail) => {
                        server.close((err) => (err ? fail(err) : done()));
                    })
            });
        });
        server.on('error', reject);
    });
}

afterEach(async () => {
    await __resetAgentTabs();
});

describe('runtime.targets HTTP contract', () => {
    it('this file does not import Playwright', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
    });

    it('lists page targets as {id, title, url} and strips leak fields', async () => {
        const mock = await mockCdp([
            {
                id: 'PAGE-1',
                type: 'page',
                title: 'User tab',
                url: 'https://example.test/open',
                webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/PAGE-1',
                debugPort: 9222,
                userDataDir: '/tmp/chrome-profile',
                BrowserContext: 'ctx-1'
            },
            {
                id: 'SW-1',
                type: 'service_worker',
                title: 'sw',
                url: 'https://example.test/sw.js',
                webSocketDebuggerUrl: 'ws://127.0.0.1:9222/devtools/page/SW-1'
            },
            {
                id: 'PAGE-2',
                type: 'page',
                title: 'Other',
                url: 'https://example.test/two'
            }
        ]);

        try {
            const attached = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            affordance: 'runtime.attach',
                            input: { cdpUrl: mock.origin }
                        })
                    })
                )
            );
            expect(attached.status).toBe(200);
            expect(attached.body.attached).toBe(true);

            const listed = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ affordance: 'runtime.targets', input: {} })
                    })
                )
            );
            expect(listed.status).toBe(200);
            expect(listed.body.keyRequired).toBe(false);
            expect(listed.body.targets).toEqual([
                { id: 'PAGE-1', title: 'User tab', url: 'https://example.test/open' },
                { id: 'PAGE-2', title: 'Other', url: 'https://example.test/two' }
            ]);
            for (const target of listed.body.targets as Array<Record<string, unknown>>) {
                expect(validateAgainstSchema(AGENT_TARGET_SCHEMA, target)).toEqual([]);
                expect(Object.keys(target).sort()).toEqual(['id', 'title', 'url']);
            }
            expectNoRuntimeLeak(listed.body);

            const viaHelper = await listAttachedPages();
            expect(viaHelper.map((p) => p.id)).toEqual(['PAGE-1', 'PAGE-2']);

            const missing = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({
                            affordance: 'tabs.bind',
                            input: { targetId: 'no-such-page' }
                        })
                    })
                )
            );
            expect(missing.status).toBe(404);
            expect(missing.status).not.toBe(500);
            expect(missing.body.keyRequired).toBe(false);
            expect(String(missing.body.error)).toMatch(/not found/i);
            expectNoRuntimeLeak(missing.body);
            expect(missing.body.tab).toBeUndefined();
        } finally {
            await mock.close();
        }
    });

    it('destroy of a bound tab does not contact Chrome to close the user page', async () => {
        let versionHits = 0;
        const probe = await new Promise<{ origin: string; close: () => Promise<void> }>(
            (resolve, reject) => {
                const server = http.createServer((req, res) => {
                    if ((req.url ?? '').startsWith('/json/version')) versionHits += 1;
                    res.writeHead(200, { 'content-type': 'application/json' });
                    res.end(
                        JSON.stringify({
                            webSocketDebuggerUrl: 'ws://127.0.0.1:1/devtools/browser/fake'
                        })
                    );
                });
                server.listen(0, '127.0.0.1', () => {
                    const addr = server.address();
                    if (!addr || typeof addr === 'string') {
                        reject(new Error('probe mock failed to bind'));
                        return;
                    }
                    resolve({
                        origin: `http://127.0.0.1:${addr.port}`,
                        close: () =>
                            new Promise((done, fail) => {
                                server.close((err) => (err ? fail(err) : done()));
                            })
                    });
                });
                server.on('error', reject);
            }
        );

        const writeState = (id: string, bound: boolean) => {
            fs.mkdirSync(tabDir(id), { recursive: true });
            fs.writeFileSync(
                runtimeStatePath(id),
                JSON.stringify({
                    kind: 'cdp',
                    attached: true,
                    bound,
                    attachHttp: probe.origin,
                    targetId: 'USER-PAGE'
                })
            );
        };

        try {
            writeState('tab_bound_guard', true);
            await createCdpRuntime().destroy('tab_bound_guard');
            expect(versionHits).toBe(0);

            writeState('tab_created_guard', false);
            await createCdpRuntime().destroy('tab_created_guard');
            expect(versionHits).toBeGreaterThan(0);
        } finally {
            await probe.close();
        }
    });
});
