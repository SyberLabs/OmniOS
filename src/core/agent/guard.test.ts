// ============================================
// The keyless surface must still be unreachable from a web page or a LAN
// peer. These lock the three layers of src/core/agent/guard.ts.
// ============================================

import { describe, expect, it } from 'vitest';
import { guardAgentRequest } from './guard';
import { POST as discoverPost, GET as discoverGet } from '@/app/api/agent/route';

const LOCAL = 'http://localhost/api/agent';

function req(init?: RequestInit, url = LOCAL) {
    return new Request(url, init);
}

function post(headers: Record<string, string>, url = LOCAL) {
    return req({ method: 'POST', headers, body: '{}' }, url);
}

describe('agent guard: local-only boundary', () => {
    it('allows the ordinary keyless caller (curl: no browser headers)', () => {
        expect(guardAgentRequest(req())).toBeNull();
        expect(
            guardAgentRequest(post({ 'content-type': 'application/json' }))
        ).toBeNull();
    });

    it('allows the /surface page calling its own origin', () => {
        expect(
            guardAgentRequest(
                post({
                    'content-type': 'application/json',
                    'sec-fetch-site': 'same-origin',
                    origin: 'http://localhost:3000'
                })
            )
        ).toBeNull();
    });

    it('refuses a LAN peer even though Next binds 0.0.0.0', () => {
        const blocked = guardAgentRequest(req({ headers: { host: '192.168.1.44:3000' } }));
        expect(blocked?.status).toBe(403);
        expect(blocked?.body.keyRequired).toBe(false);
    });

    it('trusts the Host header over the URL', () => {
        // Next builds request.url from Host, but be explicit: a loopback URL
        // must not launder a non-loopback Host.
        expect(
            guardAgentRequest(req({ headers: { host: 'evil.example.com' } }))?.status
        ).toBe(403);
    });

    it('accepts IPv6 loopback with a port', () => {
        expect(guardAgentRequest(req({ headers: { host: '[::1]:3000' } }))).toBeNull();
    });

    it('refuses a cross-site browser request', () => {
        expect(
            guardAgentRequest(
                post({
                    'content-type': 'application/json',
                    'sec-fetch-site': 'cross-site',
                    origin: 'https://evil.example.com'
                })
            )?.status
        ).toBe(403);
    });

    it('refuses same-site (another local port is still another app)', () => {
        expect(
            guardAgentRequest(
                post({ 'content-type': 'application/json', 'sec-fetch-site': 'same-site' })
            )?.status
        ).toBe(403);
    });

    it('refuses a foreign Origin even without Sec-Fetch-Site', () => {
        expect(
            guardAgentRequest(
                post({ 'content-type': 'application/json', origin: 'https://evil.example.com' })
            )?.status
        ).toBe(403);
    });
});

describe('agent guard: the CORS simple-request hole', () => {
    // text/plain is CORS-safelisted, so this POST is a *simple request*:
    // no preflight, delivered, side effects run. Requiring JSON forces a
    // preflight this app never answers, so it is blocked before it is sent.
    it.each(['text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data', ''])(
        'refuses a POST carrying safelisted content-type %j',
        (ct) => {
            const blocked = guardAgentRequest(post(ct ? { 'content-type': ct } : {}));
            expect(blocked?.status).toBe(415);
        }
    );

    it('accepts application/json with a charset parameter', () => {
        expect(
            guardAgentRequest(post({ 'content-type': 'application/json; charset=utf-8' }))
        ).toBeNull();
    });
});

describe('agent routes enforce the guard', () => {
    it('drive-by POST to /api/agent never reaches an affordance', async () => {
        const res = await discoverPost(
            new Request(LOCAL, {
                method: 'POST',
                headers: { 'content-type': 'text/plain', 'sec-fetch-site': 'cross-site' },
                body: JSON.stringify({ affordance: 'runtime.ensure', input: {} })
            })
        );
        expect(res.status).toBe(403);
        const body = await res.json();
        expect(String(body.error)).toMatch(/local-only/i);
    });

    it('discovery still answers the local caller', async () => {
        const res = await discoverGet(new Request(LOCAL));
        expect(res.status).toBe(200);
        expect((await res.json()).keyRequired).toBe(false);
    });
});
