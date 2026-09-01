// ============================================
// KEYED DATA PROXY — the key must stay on the server.
//
// These lock the property the whole change exists for: a block asks OmniOS,
// OmniOS asks the provider, and the browser never holds the credential.
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    fetchKeyedProvider,
    isKeyedProvider,
    KEYED_PROVIDERS
} from './data.providers';

const ENV_KEYS = ['FRED_API_KEY', 'BLS_API_KEY', 'ALPHA_VANTAGE_API_KEY', 'NEWSAPI_KEY'];
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
    for (const k of ENV_KEYS) {
        saved[k] = process.env[k];
        delete process.env[k];
    }
});

afterEach(() => {
    for (const k of ENV_KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
    }
    vi.unstubAllGlobals();
});

/** Capture the outbound request without touching the network. */
function captureFetch(body: unknown = { ok: true }) {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url: String(url), init });
        return { json: async () => body } as unknown as Response;
    }));
    return calls;
}

describe('provider allowlist', () => {
    it('accepts exactly the four keyed providers', () => {
        expect(KEYED_PROVIDERS).toEqual(['fred', 'bls', 'alpha_vantage', 'newsapi']);
    });

    it('rejects anything else', () => {
        expect(isKeyedProvider('polymarket')).toBe(false);
        expect(isKeyedProvider('../../etc/passwd')).toBe(false);
        expect(isKeyedProvider('')).toBe(false);
    });
});

describe('missing key', () => {
    it.each([
        ['fred', (b: Record<string, unknown>) => String(b.error_message)],
        ['bls', (b: Record<string, unknown>) => String((b.message as string[])[0])],
        ['alpha_vantage', (b: Record<string, unknown>) => String(b['Error Message'])],
        ['newsapi', (b: Record<string, unknown>) => String(b.message)]
    ] as const)('%s returns its own error shape naming the env var', async (id, read) => {
        const { status, body } = await fetchKeyedProvider(id, {});
        // 200: a missing key is a setup state the block renders, not a crash.
        expect(status).toBe(200);
        expect(read(body as Record<string, unknown>)).toMatch(/API key/i);
        expect(read(body as Record<string, unknown>)).toMatch(/_API_KEY|NEWSAPI_KEY/);
    });

    it('does not call upstream at all when the key is absent', async () => {
        const calls = captureFetch();
        await fetchKeyedProvider('fred', { seriesId: 'GDP' });
        expect(calls).toHaveLength(0);
    });
});

describe('the key reaches the provider, never the caller', () => {
    it('FRED sends api_key upstream and echoes no key back', async () => {
        process.env.FRED_API_KEY = 'secret-fred';
        const calls = captureFetch({ observations: [] });

        const { body } = await fetchKeyedProvider('fred', { seriesId: 'UNRATE', limit: '5' });

        expect(calls[0].url).toContain('api.stlouisfed.org');
        expect(calls[0].url).toContain('api_key=secret-fred');
        expect(calls[0].url).toContain('series_id=UNRATE');
        expect(JSON.stringify(body)).not.toContain('secret-fred');
    });

    it('BLS puts the key in the POST body, not the URL', async () => {
        process.env.BLS_API_KEY = 'secret-bls';
        const calls = captureFetch({ status: 'REQUEST_SUCCEEDED' });

        await fetchKeyedProvider('bls', { seriesId: 'LNS14000000' });

        expect(calls[0].url).not.toContain('secret-bls');
        expect(calls[0].init?.method).toBe('POST');
        expect(String(calls[0].init?.body)).toContain('secret-bls');
    });

    it('NewsAPI sends the key as a header, keeping it out of the URL', async () => {
        process.env.NEWSAPI_KEY = 'secret-news';
        const calls = captureFetch({ articles: [] });

        await fetchKeyedProvider('newsapi', { query: 'markets', endpoint: 'everything' });

        expect(calls[0].url).not.toContain('secret-news');
        const headers = calls[0].init?.headers as Record<string, string>;
        expect(headers['X-Api-Key']).toBe('secret-news');
        expect(calls[0].url).toContain('q=markets');
    });

    it('Alpha Vantage passes symbol and function through', async () => {
        process.env.ALPHA_VANTAGE_API_KEY = 'secret-av';
        const calls = captureFetch({ 'Global Quote': {} });

        await fetchKeyedProvider('alpha_vantage', { symbol: 'MSFT' });

        expect(calls[0].url).toContain('symbol=MSFT');
        expect(calls[0].url).toContain('function=GLOBAL_QUOTE');
        expect(calls[0].url).toContain('apikey=secret-av');
    });
});

describe('failure handling', () => {
    it('an upstream throw becomes a 502, not an exception', async () => {
        process.env.FRED_API_KEY = 'k';
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED'); }));

        const { status, body } = await fetchKeyedProvider('fred', {});
        expect(status).toBe(502);
        expect(String((body as { error: string }).error)).toContain('ECONNREFUSED');
    });

    it('a non-JSON upstream response becomes a 502', async () => {
        process.env.NEWSAPI_KEY = 'k';
        vi.stubGlobal('fetch', vi.fn(async () => ({
            json: async () => { throw new Error('not json'); }
        } as unknown as Response)));

        const { status } = await fetchKeyedProvider('newsapi', {});
        expect(status).toBe(502);
    });

    it('never leaks the key into an error body', async () => {
        process.env.ALPHA_VANTAGE_API_KEY = 'top-secret';
        vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('boom'); }));

        const { body } = await fetchKeyedProvider('alpha_vantage', {});
        expect(JSON.stringify(body)).not.toContain('top-secret');
    });
});
