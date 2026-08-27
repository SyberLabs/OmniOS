// ============================================
// Closed action loop on the product page (/surface).
// HTTP / invoke only. No Playwright or CDP internals.
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { GET as discoverGet } from '@/app/api/agent/route';
import { POST as tabsPost } from '@/app/api/agent/tabs/route';
import { GET as tabGet, DELETE as tabDelete } from '@/app/api/agent/tabs/[id]/route';
import { POST as tabAct } from '@/app/api/agent/tabs/[id]/act/route';
import { GET as screenshotGet } from '@/app/api/agent/tabs/[id]/screenshot/route';
import { invokeAffordance } from './invoke';
import {
    AGENT_TAB_SNAPSHOT_SCHEMA,
    validateAgainstSchema
} from './contract';
import {
    LOOP_BUTTON_NAME,
    LOOP_IDLE,
    LOOP_READY,
    surfaceLoopDocument
} from './surfaceLoop';

async function json(res: Response) {
    return { status: res.status, body: await res.json() };
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

let origin = '';
let server: http.Server;

beforeAll(async () => {
    server = http.createServer((req, res) => {
        const url = req.url ?? '/';
        if (url === '/surface' || url.startsWith('/surface?')) {
            res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
            res.end(surfaceLoopDocument());
            return;
        }
        res.writeHead(404);
        res.end();
    });
    await new Promise<void>((resolve) => {
        server.listen(0, '127.0.0.1', () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw new Error('loop server failed to bind');
    origin = `http://127.0.0.1:${addr.port}`;
}, 30_000);

afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
    });
});

afterEach(async () => {
    const listed = await invokeAffordance('tabs.list');
    const tabs = (listed.body.tabs as Array<{ id: string }>) || [];
    await Promise.all(tabs.map((tab) => invokeAffordance('tabs.dispose', { tabId: tab.id })));
});

describe('closed action loop on /surface', () => {
    it('this file does not import Playwright or CDP internals', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
        expect(imports).not.toMatch(/cdpRuntime|cdpClient|\/chrome['"]|runtime\/resolve/);
        expect(imports).not.toMatch(/agent-fixture/);
    });

    it('discover → create /surface → act-by-ref → snapshot on the same response → dispose', async () => {
        const discovered = await json(await discoverGet());
        expect(discovered.status).toBe(200);
        expect(discovered.body.keyRequired).toBe(false);
        expect(discovered.body.auth).toBeUndefined();

        const created = await json(
            await tabsPost(
                new Request('http://local/api/agent/tabs', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ url: `${origin}/surface` })
                })
            )
        );
        expect(created.status).toBe(201);
        expect(created.body.keyRequired).toBe(false);
        expect(created.body.tab.url).toContain('/surface');
        expect(created.body.tab.url).not.toContain('agent-fixture');
        expect(created.body.tab.text).toContain(LOOP_IDLE);
        expect(created.body.tab.text).not.toContain(LOOP_READY);
        expect(created.body.tab.screenshot).toMatch(/\/api\/agent\/tabs\/.+\/screenshot/);
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, created.body.tab)).toEqual([]);

        const mark = (
            created.body.tab.actions as Array<{ name: string; ref: string; actions: string[] }>
        ).find((action) => action.name === LOOP_BUTTON_NAME);
        expect(mark?.ref).toMatch(/^e\d+$/);
        expect(mark?.actions).toContain('click');

        const acted = await json(
            await tabAct(
                new Request(`http://local/api/agent/tabs/${created.body.tab.id}/act`, {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({
                        affordance: 'tab.click',
                        input: { ref: mark!.ref }
                    })
                }),
                { params: Promise.resolve({ id: created.body.tab.id }) }
            )
        );
        expect(acted.status).toBe(200);
        expect(acted.body.keyRequired).toBe(false);
        expect(acted.body.tab.id).toBe(created.body.tab.id);
        expect(acted.body.tab.text).toContain(LOOP_READY);
        expect(acted.body.tab.text).not.toContain(LOOP_IDLE);
        expect(validateAgainstSchema(AGENT_TAB_SNAPSHOT_SCHEMA, acted.body.tab)).toEqual([]);

        const shot = await screenshotGet(
            new Request(`http://local/api/agent/tabs/${created.body.tab.id}/screenshot`),
            { params: Promise.resolve({ id: created.body.tab.id }) }
        );
        expect(shot.status).toBe(200);
        expect(shot.headers.get('content-type')).toMatch(/image\/png/);
        const png = Buffer.from(await shot.arrayBuffer());
        expect(png.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);

        const read = await json(
            await tabGet(new Request(`http://local/api/agent/tabs/${created.body.tab.id}`), {
                params: Promise.resolve({ id: created.body.tab.id })
            })
        );
        expect(read.body.tab.text).toContain(LOOP_READY);

        const disposed = await json(
            await tabDelete(
                new Request(`http://local/api/agent/tabs/${created.body.tab.id}`),
                { params: Promise.resolve({ id: created.body.tab.id }) }
            )
        );
        expect(disposed.status).toBe(200);
        expect(disposed.body.disposed).toBe(created.body.tab.id);

        const gone = await json(
            await tabGet(new Request(`http://local/api/agent/tabs/${created.body.tab.id}`), {
                params: Promise.resolve({ id: created.body.tab.id })
            })
        );
        expect(gone.status).toBe(404);
        expect(gone.body.keyRequired).toBe(false);
    }, 90_000);
});
