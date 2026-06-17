// ============================================
// PROJECT OMNI: BLS NORMALIZER
// Converts BLS time series data to OmniData
// ============================================

import {
    ApiTypeDefinition,
    OmniItem,
    OmniMetrics,
    createOmniData,
    createOmniError
} from '../omnidata.schema';

interface BLSDataPoint {
    year: string;
    period: string;
    periodName: string;
    value: string;
}

interface BLSSeries {
    seriesID: string;
    data: BLSDataPoint[];
}

interface BLSResponse {
    status?: string;
    message?: string[];
    Results?: {
        series?: BLSSeries[];
    };
}

function parseValue(value?: string): number | null {
    if (!value) return null;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
}

function periodToTimestamp(year: string, period: string): number | undefined {
    const yearNum = Number(year);
    if (!Number.isFinite(yearNum)) return undefined;

    if (period.startsWith('M')) {
        const month = Number(period.slice(1));
        if (month >= 1 && month <= 12) {
            return Date.UTC(yearNum, month - 1, 1);
        }
        if (month === 13) {
            return Date.UTC(yearNum, 11, 31);
        }
    }

    if (period.startsWith('Q')) {
        const quarter = Number(period.slice(1));
        if (quarter >= 1 && quarter <= 4) {
            return Date.UTC(yearNum, (quarter - 1) * 3, 1);
        }
    }

    return undefined;
}

function buildMetrics(data: BLSDataPoint[]): OmniMetrics | null {
    const numeric = data
        .map(point => ({
            timestamp: periodToTimestamp(point.year, point.period),
            value: parseValue(point.value)
        }))
        .filter(point => point.value !== null)
        .map(point => ({ timestamp: point.timestamp ?? 0, value: point.value as number }))
        .sort((a, b) => b.timestamp - a.timestamp);

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
        timestamp: latest.timestamp || Date.now()
    };
}

/**
 * BLS normalizer (timeseries/data)
 * Docs: https://www.bls.gov/developers/
 */
export const blsNormalizer: ApiTypeDefinition<BLSResponse> = {
    category: 'market_data',
    displayName: 'BLS',
    cacheTtlMs: 15 * 60 * 1000,
    rateLimitMs: 1000,

    fetchFn: async (apiKey, params) => {
        if (!apiKey) {
            return {
                status: 'REQUEST_FAILED',
                message: ['BLS requires an API key. Add one in the API Dashboard.']
            };
        }

        const seriesId = String(params?.seriesId ?? params?.series_id ?? 'LNS14000000').trim();
        const currentYear = new Date().getFullYear();
        const startYear = String(params?.startYear ?? params?.start_year ?? currentYear - 5);
        const endYear = String(params?.endYear ?? params?.end_year ?? currentYear);

        const payload: Record<string, unknown> = {
            seriesid: [seriesId],
            startyear: startYear,
            endyear: endYear,
            registrationkey: apiKey
        };

        try {
            const response = await fetch('https://api.bls.gov/publicAPI/v2/timeseries/data/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            return await response.json();
        } catch (error) {
            return {
                status: 'REQUEST_FAILED',
                message: [error instanceof Error ? error.message : 'Unknown error']
            };
        }
    },

    normalizeFn: (raw) => {
        if (raw.status && raw.status !== 'REQUEST_SUCCEEDED') {
            return createOmniError('bls', 'market_data', {
                code: raw.status,
                message: raw.message?.[0] || 'BLS error',
                retryable: true
            });
        }

        const series = raw.Results?.series?.[0];
        const data = series?.data || [];

        if (!series || !Array.isArray(data) || data.length === 0) {
            return createOmniError('bls', 'market_data', {
                code: 'NO_DATA',
                message: 'No series data returned from BLS.',
                retryable: true
            });
        }

        const items: OmniItem[] = data.map(point => {
            const timestamp = periodToTimestamp(point.year, point.period);
            return {
                id: `bls-${series.seriesID}-${point.year}-${point.period}`,
                title: `${point.periodName} ${point.year}`,
                description: point.value,
                timestamp,
                tags: ['labor', 'time-series'],
                metadata: {
                    seriesId: series.seriesID,
                    year: point.year,
                    period: point.period,
                    periodName: point.periodName,
                    value: parseValue(point.value)
                }
            };
        });

        const metrics = buildMetrics(data);

        return createOmniData('bls', 'market_data', { items, metrics }, 15 * 60 * 1000);
    }
};

export default blsNormalizer;
