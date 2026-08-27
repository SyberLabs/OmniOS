// ============================================
// runtime.ensure: reuse an already-debuggable Chrome or fail clean.
// Mock CDP HTTP only. Does not fake with Playwright.
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentTabError } from '../errors';
import { POST as discoverPost } from '@/app/api/agent/route';
import { __resetAgentTabs } from '../browserTabs';
import { FORBIDDEN_CALLER_KEYS } from '../contract';
import { clearProcessAttachHttp } from './attach';
import { setFindChromeForTests } from './chrome';
import { ensureRuntime } from './ensure';

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

function mockCdp() {
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
            res.end(
                JSON.stringify([
                    {
                        id: 'PAGE-1',
                        type: 'page',
                        title: 'Already open',
                        url: 'https://example.test/open'
                    }
                ])
            );
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
    delete process.env.OMNI_CDP_URL;
    setFindChromeForTests(null);
    await __resetAgentTabs();
});

describe('runtime.ensure', () => {
    it('this file does not import Playwright', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
    });

    it('fails clean with 503 when no Chrome exists and nothing is already debuggable', async () => {
        setFindChromeForTests(() => null);
        clearProcessAttachHttp();
        delete process.env.OMNI_CDP_URL;

        let alreadyDebug = false;
        try {
            const res = await fetch('http://127.0.0.1:9222/json/version');
            alreadyDebug = res.ok;
        } catch {
            alreadyDebug = false;
        }
        if (alreadyDebug) {
            // A user debug Chrome on 9222 is the reuse path, not the missing-binary path.
            return;
        }

        try {
            await ensureRuntime();
            throw new Error('expected ensureRuntime to fail');
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(503);
            expect((error as AgentTabError).status).not.toBe(500);
            expect((error as AgentTabError).message).toMatch(/Chrome|Chromium|Edge/i);
            expect((error as AgentTabError).message).not.toMatch(/cdpUrl|port must/i);
        }

        const listed = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                })
            )
        );
        expect(listed.status).toBe(503);
        expect(listed.status).not.toBe(500);
        expect(listed.body.keyRequired).toBe(false);
        expect(typeof listed.body.error).toBe('string');
        expectNoRuntimeLeak(listed.body);
    });

    it('attaches to an already-debuggable Chrome without launching a second one', async () => {
        const mock = await mockCdp();
        setFindChromeForTests(() => {
            throw new Error('findChrome must not run when a debug Chrome is already up');
        });
        process.env.OMNI_CDP_URL = mock.origin;

        try {
            const result = await ensureRuntime();
            expect(result.attached).toBe(true);
            expect(result.launched).toBe(false);
            expect(result.tabRuntime).toBe('cdp');
            expect(result.disposeCloses).toBe('omni-target');
            expectNoRuntimeLeak(result);

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
            expect(targets.body.targets).toEqual([
                { id: 'PAGE-1', title: 'Already open', url: 'https://example.test/open' }
            ]);
            expectNoRuntimeLeak(targets.body);
        } finally {
            await mock.close();
        }
    });
});
