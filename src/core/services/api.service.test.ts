// ============================================
// API SERVICE — settings-panel probes.
//
// These must hit the same routes the blocks use, and must never put a key
// on the URL. A green probe that used a different path would lie.
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { testNewsConnection, testPolymarketConnection } from './api.service';

const originalFetch = globalThis.fetch;

beforeEach(() => {
    globalThis.fetch = vi.fn();
});

afterEach(() => {
    globalThis.fetch = originalFetch;
});

describe('testNewsConnection', () => {
    it('calls /api/data?provider=newsapi with no key in the URL', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue({
            json: async () => ({ status: 'ok' })
        } as Response);

        await expect(testNewsConnection()).resolves.toEqual({ success: true });

        const url = String(vi.mocked(globalThis.fetch).mock.calls[0][0]);
        expect(url).toBe('/api/data?provider=newsapi&pageSize=1');
        expect(url).not.toMatch(/key=/i);
        expect(url).not.toMatch(/apiKey/i);
    });

    it('surfaces the provider message, not a fabricated failure', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue({
            json: async () => ({ status: 'error', message: 'NEWSAPI_KEY is not set' })
        } as Response);

        const result = await testNewsConnection();
        expect(result.success).toBe(false);
        expect(result.error).toBe('NEWSAPI_KEY is not set');
        expect(result.error).not.toMatch(/sk-/);
    });
});

describe('testPolymarketConnection', () => {
    it('calls the same /api/polymarket route the block uses', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue({
            json: async () => ({ success: true })
        } as Response);

        await expect(testPolymarketConnection()).resolves.toBe(true);
        expect(vi.mocked(globalThis.fetch).mock.calls[0][0]).toBe('/api/polymarket');
    });
});
