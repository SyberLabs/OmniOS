// ============================================
// runtime.ensure: reuse an already-debuggable Chrome or fail clean.
// Mock CDP HTTP only. Does not fake with Playwright.
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AgentTabError } from '../errors';
import { POST as discoverPost } from '@/app/api/agent/route';
import { __resetAgentTabs } from '../browserTabs';
import { FORBIDDEN_CALLER_KEYS } from '../contract';
import { clearProcessAttachHttp } from './attach';
import { setFindChromeForTests } from './chrome';
import { setListOsProcessesForTests } from './chromeProcesses';
import {
    __ensuredLaunchProfile,
    __hasLaunchedDebugChrome,
    __stopEnsuredChrome,
    debugChromeProfile,
    ensureRuntime,
    setEnsureLaunchForTests,
    setEverydayChromeRunningForTests
} from './ensure';
import { setDefaultUserDataDirForTests } from './userDataDir';

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

function userDataDirFromArgs(args: string[]): string | undefined {
    return args.find((arg) => arg.startsWith('--user-data-dir='))?.slice('--user-data-dir='.length);
}

afterEach(async () => {
    delete process.env.OMNI_CDP_URL;
    setFindChromeForTests(null);
    setEverydayChromeRunningForTests(null);
    setListOsProcessesForTests(null);
    setEnsureLaunchForTests(null);
    setDefaultUserDataDirForTests(null);
    await __stopEnsuredChrome();
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
        setEverydayChromeRunningForTests(false);
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
            expect((error as AgentTabError).status).not.toBe(409);
            expect((error as AgentTabError).message).toMatch(/No local Chrome\/Chromium\/Edge found/i);
            expect((error as AgentTabError).message).not.toMatch(/already open|not debuggable/i);
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
        expect(listed.status).not.toBe(409);
        expect(listed.body.keyRequired).toBe(false);
        expect(typeof listed.body.error).toBe('string');
        expect(String(listed.body.error)).toMatch(/No local Chrome\/Chromium\/Edge found/i);
        expectNoRuntimeLeak(listed.body);
    });

    it('fails closed with 409 when everyday Chrome is open and nothing is attachable', async () => {
        setEverydayChromeRunningForTests(true);
        let locateCalls = 0;
        setFindChromeForTests(() => {
            locateCalls += 1;
            return null;
        });
        clearProcessAttachHttp();
        delete process.env.OMNI_CDP_URL;

        try {
            await ensureRuntime();
            throw new Error('expected ensureRuntime to fail');
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(409);
            expect((error as AgentTabError).status).not.toBe(500);
            expect((error as AgentTabError).status).not.toBe(503);
            expect((error as AgentTabError).message).toMatch(/already open/i);
            expect((error as AgentTabError).message).toMatch(/not debuggable/i);
            expect((error as AgentTabError).message).toMatch(/quit|restart/i);
            expect((error as AgentTabError).message).toMatch(/retry/i);
            expect((error as AgentTabError).message).not.toMatch(
                /cdpUrl|9222|BrowserContext|user-data-dir|\.omni|profile/i
            );
        }
        expect(locateCalls).toBe(0);

        const listed = await json(
            await discoverPost(
                new Request('http://local/api/agent', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                })
            )
        );
        expect(listed.status).toBe(409);
        expect(listed.status).not.toBe(500);
        expect(listed.status).not.toBe(503);
        expect(listed.body.keyRequired).toBe(false);
        expect(typeof listed.body.error).toBe('string');
        expect(String(listed.body.error)).toMatch(/already open/i);
        expect(String(listed.body.error)).toMatch(/not debuggable/i);
        expect(String(listed.body.error)).not.toMatch(
            /cdpUrl|9222|BrowserContext|user-data-dir|\.omni|profile/i
        );
        expect(listed.body.attached).toBeUndefined();
        expect(listed.body.launched).toBeUndefined();
        expectNoRuntimeLeak(listed.body);
    });

    it('attaches to an already-debuggable Chrome without launching a second one', async () => {
        const mock = await mockCdp();
        setEverydayChromeRunningForTests(true);
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

    it('does not launch the default profile when everyday Chrome is already open', async () => {
        const defaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-locked-default-'));
        const lock = path.join(defaultDir, 'SingletonLock');
        fs.writeFileSync(lock, 'locked');
        let launched = 0;
        setEverydayChromeRunningForTests(true);
        setDefaultUserDataDirForTests(defaultDir);
        setEnsureLaunchForTests(async () => {
            launched += 1;
            throw new Error('must not launch while everyday Chrome is open');
        });
        setFindChromeForTests(() => '/usr/bin/google-chrome');
        clearProcessAttachHttp();
        delete process.env.OMNI_CDP_URL;

        try {
            await ensureRuntime();
            throw new Error('expected ensureRuntime to fail');
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(409);
            expect((error as AgentTabError).message).toMatch(/already open/i);
            expect((error as AgentTabError).message).toMatch(/not debuggable/i);
        }
        expect(launched).toBe(0);
        expect(__hasLaunchedDebugChrome()).toBe(false);
        expect(fs.existsSync(lock)).toBe(true);
        fs.rmSync(defaultDir, { recursive: true, force: true });
    });

    it('launches the existing default profile — not .omni/chrome-debug — when Chrome is quit', async () => {
        const mock = await mockCdp();
        const defaultDir = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-default-ud-'));
        const lock = path.join(defaultDir, 'SingletonLock');
        fs.writeFileSync(lock, 'stale');
        let captured: string[] = [];
        setEverydayChromeRunningForTests(false);
        setDefaultUserDataDirForTests(defaultDir);
        setFindChromeForTests(() => '/usr/bin/google-chrome');
        setEnsureLaunchForTests(async (_chrome, args, resolved) => {
            captured = args;
            return {
                proc: {
                    pid: 4242,
                    exitCode: null,
                    once() {
                        return this;
                    },
                    removeAllListeners() {
                        return this;
                    },
                    kill() {
                        return true;
                    }
                } as never,
                httpBase: mock.origin,
                port: 1,
                profile: resolved.dir,
                kind: resolved.kind
            };
        });
        clearProcessAttachHttp();
        delete process.env.OMNI_CDP_URL;

        try {
            const listed = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                    })
                )
            );
            expect(listed.status).toBe(200);
            expect(listed.body.attached).toBe(true);
            expect(listed.body.launched).toBe(true);
            expect(listed.body.tabRuntime).toBe('cdp');
            expect(listed.body.disposeCloses).toBe('omni-target');
            expect(listed.body.keyRequired).toBe(false);
            expect(listed.body.userDataDir).toBeUndefined();
            expect(listed.body.profileDir).toBeUndefined();
            expect(listed.body.debugPort).toBeUndefined();
            expectNoRuntimeLeak(listed.body);

            const used = userDataDirFromArgs(captured);
            expect(used).toBe(defaultDir);
            expect(used).not.toMatch(/chrome-debug|\.omni/);
            expect(captured.some((arg) => arg.includes('chrome-debug'))).toBe(false);
            expect(captured).toContainEqual(expect.stringMatching(/^--remote-debugging-port=/));
            expect(__ensuredLaunchProfile()).toEqual({ dir: defaultDir, kind: 'default' });
            expect(fs.existsSync(lock)).toBe(true);

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

            await __stopEnsuredChrome();
            expect(fs.existsSync(defaultDir)).toBe(true);
        } finally {
            await mock.close();
            fs.rmSync(defaultDir, { recursive: true, force: true });
        }
    });

    it('falls back to .omni/chrome-debug only when no default profile exists', async () => {
        const mock = await mockCdp();
        let captured: string[] = [];
        setEverydayChromeRunningForTests(false);
        setDefaultUserDataDirForTests(false);
        setFindChromeForTests(() => '/usr/bin/google-chrome');
        setEnsureLaunchForTests(async (_chrome, args, resolved) => {
            captured = args;
            return {
                proc: {
                    pid: 4243,
                    exitCode: null,
                    once() {
                        return this;
                    },
                    removeAllListeners() {
                        return this;
                    },
                    kill() {
                        return true;
                    }
                } as never,
                httpBase: mock.origin,
                port: 1,
                profile: resolved.dir,
                kind: resolved.kind
            };
        });
        clearProcessAttachHttp();
        delete process.env.OMNI_CDP_URL;

        try {
            const listed = await json(
                await discoverPost(
                    new Request('http://local/api/agent', {
                        method: 'POST',
                        headers: { 'content-type': 'application/json' },
                        body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
                    })
                )
            );
            expect(listed.status).toBe(200);
            expect(listed.body.attached).toBe(true);
            expect(listed.body.launched).toBe(true);
            expect(listed.body.tabRuntime).toBe('cdp');
            expectNoRuntimeLeak(listed.body);

            const used = userDataDirFromArgs(captured);
            expect(used).toBe(debugChromeProfile());
            expect(used).toMatch(/chrome-debug/);
            expect(__ensuredLaunchProfile()).toEqual({
                dir: debugChromeProfile(),
                kind: 'debug'
            });
        } finally {
            await mock.close();
        }
    });
});
