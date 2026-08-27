// ============================================
// PROJECT OMNI: AGENT SURFACE — no-key loop
// An arbitrary HTTP agent discovers affordances and
// create → act → persist → dispose a local tab. No API key.
// ============================================

import { beforeEach, describe, expect, it } from 'vitest';
import { GET as discoverGet, POST as discoverPost } from '@/app/api/agent/route';
import { GET as tabsGet, POST as tabsPost } from '@/app/api/agent/tabs/route';
import { GET as tabGet, DELETE as tabDelete } from '@/app/api/agent/tabs/[id]/route';
import { POST as tabAct } from '@/app/api/agent/tabs/[id]/act/route';
import { __resetAgentTabStore } from './tabStore';

async function json(res: Response) {
    return { status: res.status, body: await res.json() };
}

function noKeyHeaders(): HeadersInit {
    return { 'content-type': 'application/json' };
}

describe('agent surface — no-key affordance loop', () => {
    beforeEach(() => {
        __resetAgentTabStore();
    });

    it('discovers named keyless affordances without any API key', async () => {
        const { status, body } = await json(await discoverGet());

        expect(status).toBe(200);
        expect(body.keyRequired).toBe(false);
        expect(body.auth).toBeUndefined();
        expect(Array.isArray(body.affordances)).toBe(true);

        const ids = body.affordances.map((a: { id: string }) => a.id);
        expect(ids).toEqual(expect.arrayContaining([
            'tabs.list',
            'tabs.create',
            'tabs.read',
            'tabs.act',
            'tabs.dispose',
            'tab.write_note',
            'tab.set_url'
        ]));

        for (const affordance of body.affordances) {
            expect(affordance.keyRequired).toBe(false);
            expect(typeof affordance.id).toBe('string');
            expect(typeof affordance.description).toBe('string');
            expect(affordance.inputSchema).toBeTruthy();
            expect(Array.isArray(affordance.mutates)).toBe(true);
        }
    });

    it('create → act → persist → dispose without sending a key', async () => {
        const created = await json(await tabsPost(new Request('http://local/api/agent/tabs', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({ title: 'research', url: 'https://example.local/a' })
        })));

        expect(created.status).toBe(201);
        expect(created.body.tab.id).toMatch(/^tab_/);
        expect(created.body.tab.title).toBe('research');
        expect(created.body.tab.url).toBe('https://example.local/a');
        expect(created.body.tab.note).toBeNull();

        const tabId = created.body.tab.id as string;

        const afterNote = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.write_note',
                    input: { text: 'follow the citations' }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));

        expect(afterNote.status).toBe(200);
        expect(afterNote.body.tab.note).toBe('follow the citations');
        expect(afterNote.body.mutated).toEqual(expect.arrayContaining(['tab.note']));

        const afterUrl = await json(await tabAct(
            new Request(`http://local/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: noKeyHeaders(),
                body: JSON.stringify({
                    affordance: 'tab.set_url',
                    input: { url: 'https://example.local/b' }
                })
            }),
            { params: Promise.resolve({ id: tabId }) }
        ));

        expect(afterUrl.status).toBe(200);
        expect(afterUrl.body.tab.url).toBe('https://example.local/b');

        const read = await json(await tabGet(
            new Request(`http://local/api/agent/tabs/${tabId}`),
            { params: Promise.resolve({ id: tabId }) }
        ));

        expect(read.status).toBe(200);
        expect(read.body.tab.note).toBe('follow the citations');
        expect(read.body.tab.url).toBe('https://example.local/b');
        expect(read.body.tab.title).toBe('research');

        const listed = await json(await tabsGet());
        expect(listed.status).toBe(200);
        expect(listed.body.tabs).toHaveLength(1);
        expect(listed.body.tabs[0].id).toBe(tabId);

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

        const empty = await json(await tabsGet());
        expect(empty.body.tabs).toEqual([]);
    });

    it('invokes the same loop through POST /api/agent with no key', async () => {
        const created = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({
                affordance: 'tabs.create',
                input: { title: 'via-invoke' }
            })
        })));

        expect(created.status).toBe(201);
        const tabId = created.body.tab.id as string;

        const acted = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({
                affordance: 'tab.write_note',
                input: { tabId, text: 'persisted locally' }
            })
        })));
        expect(acted.status).toBe(200);
        expect(acted.body.tab.note).toBe('persisted locally');

        const read = await json(await discoverPost(new Request('http://local/api/agent', {
            method: 'POST',
            headers: noKeyHeaders(),
            body: JSON.stringify({
                affordance: 'tabs.read',
                input: { tabId }
            })
        })));
        expect(read.status).toBe(200);
        expect(read.body.tab.note).toBe('persisted locally');

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
    });

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
