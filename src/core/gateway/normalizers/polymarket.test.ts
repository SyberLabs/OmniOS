import { describe, it, expect } from 'vitest';
import { polymarketNormalizer } from './polymarket';

const normalize = polymarketNormalizer.normalizeFn;

describe('polymarketNormalizer.normalizeFn', () => {
    it('parses Gamma-style markets (outcomePrices JSON string)', () => {
        const result = normalize([
            {
                id: 'mkt-1',
                question: 'Will it rain?',
                slug: 'will-it-rain',
                outcomes: '["Yes","No"]',
                outcomePrices: '["0.65","0.35"]',
                volumeNum: 12345,
                category: 'Weather'
            }
        ]);

        expect(result.error).toBeUndefined();
        expect(result.items).toHaveLength(1);
        const item = result.items![0];
        expect(item.id).toBe('mkt-1');
        expect(item.title).toBe('Will it rain?');
        expect(item.url).toBe('https://polymarket.com/event/will-it-rain');
        expect(item.metadata?.probability).toBeCloseTo(0.65);
        expect(item.metadata?.probabilityPercent).toBe(65);
        expect(item.metadata?.volume).toBe(12345);
        expect(result.source.apiId).toBe('polymarket');
    });

    it('parses CLOB-style markets ({ data: [...] } with tokens)', () => {
        const result = normalize({
            data: [
                {
                    id: 'mkt-2',
                    question: 'Will team win?',
                    tokens: [
                        { token_id: 't1', outcome: 'Yes', price: 0.8 },
                        { token_id: 't2', outcome: 'No', price: 0.2 }
                    ]
                }
            ]
        });

        expect(result.items).toHaveLength(1);
        expect(result.items![0].metadata?.probability).toBeCloseTo(0.8);
        expect(result.items![0].metadata?.probabilityPercent).toBe(80);
    });

    it('defaults probability to 0.5 when no price info is present', () => {
        const result = normalize([{ id: 'm', question: 'Unknown odds?' }]);
        expect(result.items![0].metadata?.probability).toBe(0.5);
    });

    it('returns empty items for an empty market list', () => {
        const result = normalize([]);
        expect(result.error).toBeUndefined();
        expect(result.items).toEqual([]);
    });

    it('returns an error OmniData when the response carries an error', () => {
        const result = normalize({ error: 'rate limited' });
        expect(result.error?.code).toBe('API_ERROR');
        expect(result.error?.message).toBe('rate limited');
        expect(result.error?.retryable).toBe(true);
    });
});
