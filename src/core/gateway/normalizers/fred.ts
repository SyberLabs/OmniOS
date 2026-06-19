// ============================================
// PROJECT OMNI: FRED NORMALIZER
// Converts FRED series observations to OmniData
// ============================================

import {
    ApiTypeDefinition,
    OmniItem,
    OmniMetrics,
    createOmniData,
    createOmniError
} from '../omnidata.schema';

interface FredObservation {
    date: string;
    value: string;
    realtime_start?: string;
    realtime_end?: string;
}

interface FredResponse {
    observations?: FredObservation[];
    error_code?: string;
    error_message?: string;
    _seriesId?: string;
}

function parseValue(value?: string): number | null {
    if (!value || value === '.') return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function parseTimestamp(date?: string): number | undefined {
    if (!date) return undefined;
    const parsed = Date.parse(date);
    return Number.isNaN(parsed) ? undefined : parsed;
}

function buildMetrics(observations: FredObservation[]): OmniMetrics | null {
    const numeric = observations
        .map(obs => ({
            date: obs.date,
            value: parseValue(obs.value)
        }))
        .filter(obs => obs.value !== null)
        .map(obs => ({ date: obs.date, value: obs.value as number }))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

    if (numeric.length === 0) return null;

    const latest = numeric[0];
    const previous = numeric[1];
    const change = previous ? latest.value - previous.value : 0;
    const changePercent = previous && previous.value !== 0
        ? (change / previous.value) * 100
        : 0;

    return {
        values: {
            latest: latest.value,
            previous: previous?.value ?? latest.value,
            change,
            changePercent
        },
        timestamp: parseTimestamp(latest.date) ?? Date.now()
    };
}

/**
 * FRED normalizer (series/observations)
 * Docs: https://fred.stlouisfed.org/docs/api/fred/series_observations.html
 */
export const fredNormalizer: ApiTypeDefinition<FredResponse> = {
    category: 'market_data',
    displayName: 'FRED',
    cacheTtlMs: 10 * 60 * 1000,
    rateLimitMs: 1000,

    fetchFn: async (apiKey, params) => {
        if (!apiKey) {
            return {
                error_message: 'FRED requires an API key. Add one in the API Dashboard.'
            };
        }

        const seriesId = String(params?.seriesId ?? params?.series_id ?? 'GDP').trim();
        const limit = params?.limit ?? 24;
        const sortOrder = (params?.sortOrder ?? params?.sort_order ?? 'desc') as string;
        const observationStart = params?.observationStart ?? params?.observation_start;
        const observationEnd = params?.observationEnd ?? params?.observation_end;

        try {
            const url = new URL('https://api.stlouisfed.org/fred/series/observations');
            url.searchParams.set('series_id', seriesId);
            url.searchParams.set('file_type', 'json');
            url.searchParams.set('limit', String(limit));
            url.searchParams.set('sort_order', String(sortOrder));
            url.searchParams.set('api_key', apiKey);

            if (observationStart) {
                url.searchParams.set('observation_start', String(observationStart));
            }
            if (observationEnd) {
                url.searchParams.set('observation_end', String(observationEnd));
            }

            const response = await fetch(url.toString());
            const data = await response.json();
            return { ...data, _seriesId: seriesId };
        } catch (error) {
            return {
                error_message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    normalizeFn: (raw) => {
        if (raw.error_code || raw.error_message) {
            return createOmniError('fred', 'market_data', {
                code: raw.error_code || 'API_ERROR',
                message: raw.error_message || 'FRED error',
                retryable: true
            });
        }

        const observations = raw.observations || [];
        if (!Array.isArray(observations) || observations.length === 0) {
            return createOmniError('fred', 'market_data', {
                code: 'NO_DATA',
                message: 'No observations returned for this series.',
                retryable: true
            });
        }

        const seriesId = raw._seriesId;
        const items: OmniItem[] = observations.map((obs) => {
            const timestamp = parseTimestamp(obs.date);
            return {
                id: `fred-${seriesId ?? 'series'}-${obs.date}`,
                title: obs.date,
                description: obs.value,
                timestamp,
                tags: ['economic', 'time-series'],
                metadata: {
                    value: parseValue(obs.value),
                    date: obs.date,
                    seriesId,
                    realtimeStart: obs.realtime_start,
                    realtimeEnd: obs.realtime_end
                }
            };
        });

        const metrics = buildMetrics(observations);

        return createOmniData('fred', 'market_data', { items, metrics: metrics ?? undefined }, 10 * 60 * 1000);
    }
};

export default fredNormalizer;
