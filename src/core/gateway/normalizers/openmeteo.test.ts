import { describe, it, expect, afterEach, vi } from 'vitest';
import { openmeteoNormalizer } from './openmeteo';
import { frankfurterNormalizer } from './frankfurter';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('openmeteo normalizer', () => {
    it('turns current + daily into feed items', () => {
        const data = openmeteoNormalizer.normalizeFn({
            latitude: 40.7,
            longitude: -74,
            timezone: 'America/New_York',
            current: {
                time: '2026-09-12T12:00',
                temperature_2m: 18.2,
                wind_speed_10m: 9,
                relative_humidity_2m: 55
            },
            daily: {
                time: ['2026-09-12', '2026-09-13'],
                temperature_2m_max: [22, 20],
                temperature_2m_min: [14, 13],
                precipitation_sum: [0, 2]
            }
        });
        expect(data.error).toBeUndefined();
        expect(data.items?.[0].title).toContain('18.2');
        expect(data.items?.length).toBe(3);
    });

    it('asks /api/public, never the Open-Meteo host', async () => {
        const calls: string[] = [];
        vi.stubGlobal('fetch', vi.fn(async (url: string) => {
            calls.push(String(url));
            return { json: async () => ({ current: {} }) } as unknown as Response;
        }));
        await openmeteoNormalizer.fetchFn('', { latitude: 1, longitude: 2 });
        expect(calls[0]).toMatch(/^\/api\/public\?/);
        expect(calls[0]).toContain('provider=openmeteo');
        expect(calls[0]).not.toContain('open-meteo.com');
    });
});

describe('frankfurter normalizer', () => {
    it('one item per quote currency', () => {
        const data = frankfurterNormalizer.normalizeFn({
            base: 'USD',
            date: '2026-09-11',
            rates: { EUR: 0.86, GBP: 0.74 }
        });
        expect(data.items).toHaveLength(2);
        expect(data.items?.[0].title).toMatch(/USD/);
        expect(data.items?.[0].metadata?.rate).toBe(0.86);
    });
});
