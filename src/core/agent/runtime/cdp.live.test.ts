// ============================================
// Product path: real local Chrome via CDP.
// Skips when this machine has no Chrome/Edge — does not fall back
// to Playwright and call that "local".
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { POST as tabsPost } from '@/app/api/agent/tabs/route';
import { GET as tabGet, DELETE as tabDelete } from '@/app/api/agent/tabs/[id]/route';
import { POST as tabAct } from '@/app/api/agent/tabs/[id]/act/route';
import { GET as screenshotGet } from '@/app/api/agent/tabs/[id]/screenshot/route';
import { __resetAgentTabs } from '../browserTabs';
import { findChrome } from './chrome';
import { createCdpRuntime } from './cdpRuntime';
import { setTabRuntimeForTests } from './resolve';

const chrome = findChrome();
// CI sets OMNI_TAB_RUNTIME=playwright. A runner may still have a Chrome
// binary that cannot launch; do not fail the adapter job by probing it.
const runLiveCdp =
    Boolean(chrome) && process.env.OMNI_TAB_RUNTIME !== 'playwright';

async function json(res: Response) {
    return { status: res.status, body: await res.json() };
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe.skipIf(!runLiveCdp)('local Chrome/CDP product runtime', () => {
    let fixtureOrigin = '';
    let fixtureServer: http.Server;

    beforeAll(async () => {
        process.env.OMNI_CHROME_HEADLESS = '1';
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
        setTabRuntimeForTests(null);
        await new Promise<void>((resolve, reject) => {
            fixtureServer.close((err) => (err ? reject(err) : resolve()));
        });
    }, 30_000);

    beforeEach(async () => {
        await __resetAgentTabs();
    });

    it('isolates two Chrome profiles, returns refs and a real PNG, then 404s on dispose', async () => {
        const openedA = await json(
            await tabsPost(
                new Request('http://local/api/agent/tabs', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ url: `${fixtureOrigin}/agent-fixture.html` })
                })
            )
        );
        const openedB = await json(
            await tabsPost(
                new Request('http://local/api/agent/tabs', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ url: `${fixtureOrigin}/agent-fixture.html` })
                })
            )
        );
        expect(openedA.status).toBe(201);
        expect(openedB.status).toBe(201);
        const tabA = openedA.body.tab.id as string;
        const tabB = openedB.body.tab.id as string;
        expect(tabA).not.toBe(tabB);
        expect(openedA.body.tab.actions.map((a: { ref: string }) => a.ref)).toEqual(
            expect.arrayContaining(['e1', 'e2', 'e3', 'e4'])
        );

        const shot1 = await screenshotGet(
            new Request(`http://local/api/agent/tabs/${tabA}/screenshot`),
            { params: Promise.resolve({ id: tabA }) }
        );
        const bytes1 = Buffer.from(await shot1.arrayBuffer());
        expect(shot1.status).toBe(200);
        expect(shot1.headers.get('content-type')).toMatch(/image\/png/);
        expect(bytes1.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
        expect(bytes1.length).toBeGreaterThan(100);

        const persistRef = (
            openedA.body.tab.actions as Array<{ name: string; ref: string }>
        ).find((a) => a.name === 'Persist session')!.ref;
        const clicked = await json(
            await tabAct(
                new Request(`http://local/api/agent/tabs/${tabA}/act`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'tab.click',
                        input: { ref: persistRef }
                    })
                }),
                { params: Promise.resolve({ id: tabA }) }
            )
        );
        expect(clicked.body.tab.text).toContain('session: alive / persisted');

        const shot2 = await screenshotGet(
            new Request(`http://local/api/agent/tabs/${tabA}/screenshot`),
            { params: Promise.resolve({ id: tabA }) }
        );
        const bytes2 = Buffer.from(await shot2.arrayBuffer());
        expect(bytes2.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
        expect(bytes2.equals(bytes1)).toBe(false);

        const navigatedB = await json(
            await tabAct(
                new Request(`http://local/api/agent/tabs/${tabB}/act`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'tab.navigate',
                        input: { url: `${fixtureOrigin}/agent-fixture-b.html` }
                    })
                }),
                { params: Promise.resolve({ id: tabB }) }
            )
        );
        expect(navigatedB.body.tab.text).toContain('session: empty / empty');
        expect(navigatedB.body.tab.text).not.toContain('session: alive / persisted');

        await json(
            await tabDelete(new Request(`http://local/api/agent/tabs/${tabA}`), {
                params: Promise.resolve({ id: tabA })
            })
        );
        const goneA = await json(
            await tabGet(new Request(`http://local/api/agent/tabs/${tabA}`), {
                params: Promise.resolve({ id: tabA })
            })
        );
        expect(goneA.status).toBe(404);

        const stillB = await json(
            await tabGet(new Request(`http://local/api/agent/tabs/${tabB}`), {
                params: Promise.resolve({ id: tabB })
            })
        );
        expect(stillB.status).toBe(200);
        expect(stillB.body.tab.text).toContain('session: empty / empty');

        await json(
            await tabDelete(new Request(`http://local/api/agent/tabs/${tabB}`), {
                params: Promise.resolve({ id: tabB })
            })
        );
        const goneB = await screenshotGet(
            new Request(`http://local/api/agent/tabs/${tabB}/screenshot`),
            { params: Promise.resolve({ id: tabB }) }
        );
        expect(goneB.status).toBe(404);
    }, 90_000);
});

describe('local Chrome/CDP availability', () => {
    it('records whether this machine has a real Chrome (not Playwright Chromium)', () => {
        if (!chrome) {
            expect(chrome).toBeNull();
            return;
        }
        expect(chrome).not.toMatch(/ms-playwright/);
        expect(fs.existsSync(chrome)).toBe(true);
    });

    it('does not run the live CDP suite under the Playwright adapter', () => {
        if (process.env.OMNI_TAB_RUNTIME === 'playwright') {
            expect(runLiveCdp).toBe(false);
        }
    });
});
