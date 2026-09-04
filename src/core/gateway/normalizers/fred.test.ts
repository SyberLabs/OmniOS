import { describe, it, expect } from 'vitest';
import { fredNormalizer } from './fred';

// The normalizeFn is a pure function: raw FRED response -> OmniData.
// These tests pin its contract, including the empty/no-numeric metrics path
// that surfaced the Phase 1 null-vs-undefined fix.

function makeRaw(observations: Array<{ date: string; value: string }>, seriesId = 'GDP') {
    return { observations, _seriesId: seriesId };
}

describe('fredNormalizer.normalizeFn', () => {
    it('maps observations to OmniItems and computes metrics', () => {
        const raw = makeRaw([
            { date: '2024-01-01', value: '100' },
            { date: '2024-02-01', value: '110' }
        ]);

        const result = fredNormalizer.normalizeFn(raw);

        expect(result.error).toBeUndefined();
        expect(result.items).toHaveLength(2);
        expect(result.items?.[0].id).toBe('fred-GDP-2024-01-01');
        expect(result.items?.[0].metadata?.value).toBe(100);
        expect(result.source.apiId).toBe('fred');

        // Latest (most recent date) is 110, previous 100 -> change +10, +10%
        expect(result.metrics?.values.latest).toBe(110);
        expect(result.metrics?.values.previous).toBe(100);
        expect(result.metrics?.values.change).toBe(10);
        expect(result.metrics?.values.changePercent).toBeCloseTo(10);
    });

    it('returns metrics: undefined (not null) when no numeric observations exist', () => {
        // All values are FRED "missing" markers -> buildMetrics returns null,
        // which must be coalesced to undefined for the OmniData contract.
        const raw = makeRaw([
            { date: '2024-01-01', value: '.' },
            { date: '2024-02-01', value: '.' }
        ]);

        const result = fredNormalizer.normalizeFn(raw);

        expect(result.items).toHaveLength(2);
        expect(result.metrics).toBeUndefined();
        // Explicitly not null: this is the regression we guard.
        expect(result.metrics).not.toBeNull();
    });

    it('returns an error OmniData for empty observations', () => {
        const result = fredNormalizer.normalizeFn(makeRaw([]));

        expect(result.error).toBeDefined();
        expect(result.error?.code).toBe('NO_DATA');
        expect(result.items).toBeUndefined();
    });

    it('returns an error OmniData when the API reports an error', () => {
        const result = fredNormalizer.normalizeFn({
            error_code: 'BAD_REQUEST',
            error_message: 'Invalid series id'
        });

        expect(result.error?.code).toBe('BAD_REQUEST');
        expect(result.error?.message).toBe('Invalid series id');
        expect(result.error?.retryable).toBe(true);
    });
});
