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
import { GET as screenshotGet } from '@/app/api/agent/tabs/[id]/screenshot/route';
import { __dropLiveContexts, __resetAgentTabs } from './browserTabs';

async function json(res: Response) {
    return { status: res.status, body: await res.json() };
}

function noKeyHeaders(): HeadersInit {
    return { 'content-type': 'application/json' };
}

async function createTab(url: string) {
    return json(await tabsPost(new Request('http://local/api/agent/tabs', {
        method: 'POST',
        headers: noKeyHeaders(),
        body: JSON.stringify({ url })
    })));
}

async function actTab(tabId: string, affordance: string, input: Record<string, string>) {
    return json(await tabAct(
        new Request(`http://local/api/agent/tabs/${tabId}/act`, {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({ affordance, input })
        }),
        { params: Promise.resolve({ id: tabId }) }
    ));
}

async function readTabHttp(tabId: string) {
    return json(await tabGet(
        new Request(`http://local/api/agent/tabs/${tabId}`),
        { params: Promise.resolve({ id: tabId }) }
    ));
}

async function disposeTabHttp(tabId: string) {
    return json(await tabDelete(
        new Request(`http://local/api/agent/tabs/${tabId}`),
        { params: Promise.resolve({ id: tabId }) }
    ));
}

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function fetchPng(tabId: string) {
    const res = await screenshotGet(
        new Request(`http://local/api/agent/tabs/${tabId}/screenshot`),
        { params: Promise.resolve({ id: tabId }) }
    );
    const bytes = Buffer.from(await res.arrayBuffer());
    return {
        status: res.status,
        contentType: res.headers.get('content-type') || '',
        bytes
    };
}

function expectPng(shot: { status: number; contentType: string; bytes: Buffer }) {
    expect(shot.status).toBe(200);
    expect(shot.contentType).toMatch(/image\/png/);
    expect(shot.bytes.subarray(0, 8).equals(PNG_MAGIC)).toBe(true);
    expect(shot.bytes.length).toBeGreaterThan(100);
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
            'tab.type',
            'tab.screenshot'
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

        const openedActions = created.body.tab.actions as Array<{
            ref: string;
            role: string;
            name: string;
            actions: string[];
        }>;
        expect(openedActions.map((a) => a.ref)).toEqual(
            expect.arrayContaining(['e1', 'e2', 'e3', 'e4'])
        );
        expect(openedActions.every((a) => /^e\d+$/.test(a.ref))).toBe(true);
        expect(openedActions.map((a) => a.name)).not.toContain('Reveal next');
        expect(openedActions).toEqual(expect.arrayContaining([
            expect.objectContaining({
                role: 'link',
                name: 'Go to Bravo',
                actions: expect.arrayContaining(['click'])
            }),
            expect.objectContaining({
                role: 'button',
                name: 'Persist session',
                actions: expect.arrayContaining(['click'])
            }),
            expect.objectContaining({
                role: 'textbox',
                name: 'Name',
                actions: expect.arrayContaining(['type'])
            }),
            expect.objectContaining({
                role: 'button',
                name: 'Save name',
                actions: expect.arrayContaining(['click'])
            })
        ]));

        const tabId = created.body.tab.id as string;
        const persistRef = openedActions.find((a) => a.name === 'Persist session')!.ref;
        const nameRef = openedActions.find((a) => a.role === 'textbox' && a.name === 'Name')!.ref;
        const saveRef = openedActions.find((a) => a.name === 'Save name')!.ref;

        const clicked = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.click',
                    input: { ref: persistRef }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(clicked.status).toBe(200);
        expect(clicked.body.tab.text).toContain('session: alive / persisted');
        expect(clicked.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Persist session', role: 'button' }),
            expect.objectContaining({ name: 'Reveal next', role: 'button' })
        ]));

        const typed = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.type',
                    input: { ref: nameRef, text: 'Ada' }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(typed.status).toBe(200);
        expect(typed.body.tab.title).toBe('Agent Fixture A');
        expect(typed.body.tab.url).toContain('/agent-fixture.html');
        expect(typed.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({
                ref: nameRef,
                role: 'textbox',
                name: 'Name',
                value: 'Ada',
                actions: expect.arrayContaining(['type'])
            })
        ]));

        const saved = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.click',
                    input: { ref: saveRef }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));
        expect(saved.body.tab.text).toContain('name: Ada');
        expect(saved.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ role: 'textbox', name: 'Name', value: 'Ada' })
        ]));

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
        expect(persisted.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Persist session', role: 'button' })
        ]));

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
        expect(navigated.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ role: 'link', name: 'Back to Alpha' })
        ]));

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
                input: { tabId, ref: created.body.tab.actions.find((a: { name: string }) => a.name === 'Persist session').ref }
            })
        })));
        expect(acted.status).toBe(200);
        expect(acted.body.tab.text).toContain('session: alive / persisted');
        expect(acted.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Reveal next', role: 'button' })
        ]));

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

    it('returns a full snapshot on create and click so no follow-up read is required', async () => {
        const created = await json(await tabsPost(new Request('http://local/api/agent/tabs', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({ url: `${fixtureOrigin}/agent-fixture.html` })
        })));
        expect(created.status).toBe(201);
        expect(created.body.tab).toEqual(expect.objectContaining({
            id: expect.stringMatching(/^tab_/),
            title: 'Agent Fixture A',
            url: expect.stringContaining('/agent-fixture.html'),
            text: expect.stringContaining('Visible source text for agents.')
        }));
        const openedActions = created.body.tab.actions as Array<{
            ref: string;
            role: string;
            name: string;
            actions: string[];
        }>;
        expect(openedActions).toEqual(expect.arrayContaining([
            expect.objectContaining({ ref: 'e1', role: 'link', name: 'Go to Bravo' }),
            expect.objectContaining({ ref: 'e2', role: 'button', name: 'Persist session' }),
            expect.objectContaining({ ref: 'e3', role: 'textbox', name: 'Name' }),
            expect.objectContaining({ ref: 'e4', role: 'button', name: 'Save name' })
        ]));
        expect(openedActions.map((a) => a.name)).not.toContain('Reveal next');

        const persistRef = openedActions.find((a) => a.name === 'Persist session')!.ref;
        const clicked = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${created.body.tab.id}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.click',
                    input: { ref: persistRef }
                })
            }),
            { params: Promise.resolve({ id: created.body.tab.id }) }
        ));
        expect(clicked.status).toBe(200);
        expect(clicked.body.tab.id).toBe(created.body.tab.id);
        expect(clicked.body.tab.title).toBe('Agent Fixture A');
        expect(clicked.body.tab.url).toContain('/agent-fixture.html');
        expect(clicked.body.tab.text).toContain('session: alive / persisted');
        expect(clicked.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ ref: persistRef, name: 'Persist session' }),
            expect.objectContaining({ name: 'Reveal next', role: 'button' })
        ]));
    }, 60_000);

    it('keeps cookies and storage isolated across two tabs on the same origin', async () => {
        const openedA = await createTab(`${fixtureOrigin}/agent-fixture.html`);
        const openedB = await createTab(`${fixtureOrigin}/agent-fixture.html`);
        expect(openedA.status).toBe(201);
        expect(openedB.status).toBe(201);
        const tabA = openedA.body.tab.id as string;
        const tabB = openedB.body.tab.id as string;
        expect(tabA).not.toBe(tabB);
        expect(openedA.body.tab.text).toContain('session: empty / empty');
        expect(openedB.body.tab.text).toContain('session: empty / empty');

        const persistRef = (openedA.body.tab.actions as Array<{ name: string; ref: string }>)
            .find((a) => a.name === 'Persist session')!.ref;
        const nameRef = (openedA.body.tab.actions as Array<{ name: string; ref: string; role: string }>)
            .find((a) => a.role === 'textbox' && a.name === 'Name')!.ref;
        const saveRef = (openedA.body.tab.actions as Array<{ name: string; ref: string }>)
            .find((a) => a.name === 'Save name')!.ref;

        const persistedA = await actTab(tabA, 'tab.click', { ref: persistRef });
        expect(persistedA.status).toBe(200);
        expect(persistedA.body.tab.text).toContain('session: alive / persisted');
        expect(persistedA.body.tab.actions).toEqual(expect.arrayContaining([
            expect.objectContaining({ name: 'Reveal next', role: 'button' })
        ]));

        await actTab(tabA, 'tab.type', { ref: nameRef, text: 'Ada' });
        const savedA = await actTab(tabA, 'tab.click', { ref: saveRef });
        expect(savedA.body.tab.text).toContain('name: Ada');

        // Reload B while A is still live. A stale open page can hide a
        // shared-context leak; a navigate/act response cannot.
        const navigatedB = await actTab(tabB, 'tab.navigate', {
            url: `${fixtureOrigin}/agent-fixture-b.html`
        });
        expect(navigatedB.status).toBe(200);
        expect(navigatedB.body.tab.id).toBe(tabB);
        expect(navigatedB.body.tab.title).toBe('Agent Fixture B');
        expect(navigatedB.body.tab.text).toContain('session: empty / empty');
        expect(navigatedB.body.tab.text).toContain('name: none');
        expect(navigatedB.body.tab.text).not.toContain('session: alive / persisted');
        expect(navigatedB.body.tab.text).not.toContain('name: Ada');

        await __dropLiveContexts();
        const restoredA = await readTabHttp(tabA);
        expect(restoredA.body.tab.text).toContain('session: alive / persisted');
        expect(restoredA.body.tab.text).toContain('name: Ada');
        const restoredB = await readTabHttp(tabB);
        expect(restoredB.body.tab.text).toContain('session: empty / empty');
        expect(restoredB.body.tab.text).toContain('name: none');

        const disposedA = await disposeTabHttp(tabA);
        expect(disposedA.status).toBe(200);
        expect(disposedA.body.disposed).toBe(tabA);

        const goneA = await readTabHttp(tabA);
        expect(goneA.status).toBe(404);

        const stillB = await readTabHttp(tabB);
        expect(stillB.status).toBe(200);
        expect(stillB.body.tab.title).toBe('Agent Fixture B');
        expect(stillB.body.tab.text).toContain('session: empty / empty');

        const backOnA = await actTab(tabB, 'tab.navigate', {
            url: `${fixtureOrigin}/agent-fixture.html`
        });
        const persistBRef = (backOnA.body.tab.actions as Array<{ name: string; ref: string }>)
            .find((a) => a.name === 'Persist session')!.ref;
        const mutatedB = await actTab(tabB, 'tab.click', { ref: persistBRef });
        expect(mutatedB.body.tab.text).toContain('session: alive / persisted');

        const disposedB = await disposeTabHttp(tabB);
        expect(disposedB.status).toBe(200);
        expect((await readTabHttp(tabA)).status).toBe(404);
        expect((await readTabHttp(tabB)).status).toBe(404);
    }, 90_000);

    it('returns a real PNG of the live tab and a new shot after act', async () => {
        const opened = await createTab(`${fixtureOrigin}/agent-fixture.html`);
        expect(opened.status).toBe(201);
        const tabId = opened.body.tab.id as string;
        expect(opened.body.tab.screenshot).toMatch(
            new RegExp(`^/api/agent/tabs/${tabId}/screenshot`)
        );

        const first = await fetchPng(tabId);
        expectPng(first);

        const viaAffordance = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({ affordance: 'tab.screenshot', input: { tabId } })
        })));
        expect(viaAffordance.status).toBe(200);
        expect(viaAffordance.body.keyRequired).toBe(false);
        expect(viaAffordance.body.screenshot.url).toMatch(
            new RegExp(`^/api/agent/tabs/${tabId}/screenshot`)
        );
        expect(viaAffordance.body.screenshot.contentType).toBe('image/png');
        expect(viaAffordance.body.tab.screenshot).toBe(viaAffordance.body.screenshot.url);

        const persistRef = (opened.body.tab.actions as Array<{ name: string; ref: string }>)
            .find((a) => a.name === 'Persist session')!.ref;
        const clicked = await actTab(tabId, 'tab.click', { ref: persistRef });
        expect(clicked.body.tab.text).toContain('session: alive / persisted');
        expect(clicked.body.tab.screenshot).toMatch(
            new RegExp(`^/api/agent/tabs/${tabId}/screenshot`)
        );

        const second = await fetchPng(tabId);
        expectPng(second);
        expect(second.bytes.equals(first.bytes)).toBe(false);

        const gone = await fetchPng('tab_missing');
        expect(gone.status).toBe(404);
    }, 60_000);

    it('still accepts a CSS selector as a fallback', async () => {
        const created = await json(await tabsPost(new Request('http://local/api/agent/tabs', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({ url: `${fixtureOrigin}/agent-fixture.html` })
        })));
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
    }, 60_000);
});
