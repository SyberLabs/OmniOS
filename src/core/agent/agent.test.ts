// ============================================
// PROJECT OMNI: AGENT SURFACE — live browser tabs
// Discover → open a real page → read → act → persist
// across a second request → dispose. No API key.
// ============================================

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as discoverGet, POST as discoverPost } from '@/app/api/agent/route';
import { GET as tabsGet, POST as tabsPost } from '@/app/api/agent/tabs/route';
import { GET as tabGet, DELETE as tabDelete } from '@/app/api/agent/tabs/[id]/route';
import { POST as tabAct } from '@/app/api/agent/tabs/[id]/act/route';
import { __dropLiveContexts, __resetAgentTabs } from './browserTabs';

async function json(res: Response) {
    return { status: res.status, body: await res.json() };
}

function noKeyHeaders(): HeadersInit {
    return { 'content-type': 'application/json' };
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
    await __resetAgentTabs();
    await new Promise<void>((resolve, reject) => {
        fixtureServer.close((err) => (err ? reject(err) : resolve()));
    });
});

beforeEach(async () => {
    await __resetAgentTabs();
});

describe('agent surface — live keyless browser tabs', () => {
    it('discovers named keyless page affordances without any API key', async () => {
        const { status, body } = await json(await discoverGet());

        expect(status).toBe(200);
        expect(body.keyRequired).toBe(false);
        expect(body.auth).toBeUndefined();

        const ids = body.affordances.map((a: { id: string }) => a.id);
        expect(ids).toEqual(expect.arrayContaining([
            'tabs.list',
            'tabs.create',
            'tabs.read',
            'tabs.act',
            'tabs.dispose',
            'tab.navigate',
            'tab.click',
            'tab.type'
        ]));
        expect(ids).not.toContain('tab.write_note');
        expect(ids).not.toContain('tab.set_url');

        for (const affordance of body.affordances) {
            expect(affordance.keyRequired).toBe(false);
            expect(typeof affordance.description).toBe('string');
            expect(affordance.inputSchema).toBeTruthy();
            expect(Array.isArray(affordance.mutates)).toBe(true);
        }
    });

    it('opens a real page, reads it, acts, persists across a second request, then disposes', async () => {
        const created = await json(await tabsPost(new Request('http://local/api/agent/tabs', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({ url: `${fixtureOrigin}/agent-fixture.html` })
        })));

        expect(created.status).toBe(201);
        expect(created.body.tab.id).toMatch(/^tab_/);
        expect(created.body.tab.title).toBe('Agent Fixture A');
        expect(created.body.tab.url).toContain('/agent-fixture.html');
        expect(created.body.tab.text).toContain('Fixture Alpha');
        expect(created.body.tab.text).toContain('Visible source text for agents.');
        expect(created.body.tab.links).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ text: 'Go to Bravo' })
            ])
        );

        const tabId = created.body.tab.id as string;

        const clicked = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.click',
                    input: { selector: '#set-session' }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(clicked.status).toBe(200);
        expect(clicked.body.tab.text).toContain('session: alive / persisted');

        const typed = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.type',
                    input: { selector: '#name', text: 'Ada' }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(typed.status).toBe(200);

        const saved = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.click',
                    input: { selector: '#save-name' }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(saved.body.tab.text).toContain('name: Ada');

        // Second HTTP call must restore cookies/storage even if the live
        // Playwright page/context was dropped (process-local cache miss).
        await __dropLiveContexts();

        const persisted = await json(await tabGet(
            new Request(`http://local/api/agent/tabs/${tabId}`),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(persisted.status).toBe(200);
        expect(persisted.body.tab.title).toBe('Agent Fixture A');
        expect(persisted.body.tab.text).toContain('session: alive / persisted');
        expect(persisted.body.tab.text).toContain('name: Ada');

        const navigated = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.navigate',
                    input: { url: `${fixtureOrigin}/agent-fixture-b.html` }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(navigated.status).toBe(200);
        expect(navigated.body.tab.title).toBe('Agent Fixture B');
        expect(navigated.body.tab.text).toContain('Fixture Bravo');
        expect(navigated.body.tab.text).toContain('session: alive / persisted');
        expect(navigated.body.tab.text).toContain('name: Ada');

        const listed = await json(await tabsGet());
        expect(listed.status).toBe(200);
        expect(listed.body.tabs).toHaveLength(1);
        expect(listed.body.tabs[0].id).toBe(tabId);
        expect(listed.body.tabs[0].title).toBe('Agent Fixture B');

        const disposed = await json(await tabDelete(
            new Request(`http://local/api/agent/tabs/${tabId}`),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(disposed.status).toBe(200);
        expect(disposed.body.disposed).toBe(tabId);

        const gone = await json(await tabGet(
            new Request(`http://local/api/agent/tabs/${tabId}`),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(gone.status).toBe(404);
        expect(gone.body.keyRequired).toBe(false);

        const actGone = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.click',
                    input: { selector: '#set-session' }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(actGone.status).toBe(404);

        const empty = await json(await tabsGet());
        expect(empty.body.tabs).toEqual([]);
    }, 60_000);

    it('invokes the same live loop through POST /api/agent with no key', async () => {
        const created = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({
                affordance: 'tabs.create',
                input: { url: `${fixtureOrigin}/agent-fixture.html` }
            })
        })));
        expect(created.status).toBe(201);
        expect(created.body.tab.title).toBe('Agent Fixture A');
        const tabId = created.body.tab.id as string;

        const acted = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({
                affordance: 'tab.click',
                input: { tabId, selector: '#set-session' }
            })
        })));
        expect(acted.status).toBe(200);
        expect(acted.body.tab.text).toContain('session: alive / persisted');

        const read = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({
                affordance: 'tabs.read',
                input: { tabId }
            })
        })));
        expect(read.status).toBe(200);
        expect(read.body.tab.text).toContain('session: alive / persisted');

        const disposed = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({
                affordance: 'tabs.dispose',
                input: { tabId }
            })
        })));
        expect(disposed.status).toBe(200);
        expect(disposed.body.disposed).toBe(tabId);
    }, 60_000);

    it('rejects unknown affordances and missing tabs without asking for a key', async () => {
        const unknown = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({ affordance: 'llm.chat', input: {} })
        })));
        expect(unknown.status).toBe(400);
        expect(unknown.body.error).toMatch(/unknown affordance/i);
        expect(unknown.body.keyRequired).toBe(false);

        const missing = await json(await tabGet(
            new Request('http://local/api/agent/tabs/tab_missing'),
            { params: Promise.resolve({ id: 'tab_missing' }) }
        ));
        expect(missing.status).toBe(404);
        expect(missing.body.keyRequired).toBe(false);
    });
});
