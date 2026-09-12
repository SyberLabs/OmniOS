import { describe, it, expect, afterEach, vi } from 'vitest';
import { apiGateway } from './ApiGateway';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('proxied rest_list adapters stay on /api/public', () => {
    it('USGS does not call earthquake.usgs.gov from the browser', async () => {
        const calls: string[] = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            calls.push(String(url));
            return { json: async () => ({ features: [] }) } as unknown as Response;
        }));
        await apiGateway.fetch('usgs', {}, true);
        expect(calls[0]).toMatch(/^\/api\/public\?/);
        expect(calls[0]).toContain('provider=usgs');
        expect(calls.join('')).not.toContain('earthquake.usgs.gov');
    });
});
