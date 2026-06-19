// ============================================
// PROJECT OMNI: ALPHA VANTAGE NORMALIZER
// Converts Alpha Vantage responses to OmniData
// ============================================

import {
    ApiTypeDefinition,
    OmniItem,
    OmniMetrics,
    createOmniData,
    createOmniError
} from '../omnidata.schema';

interface AlphaVantageGlobalQuoteResponse {
    'Global Quote'?: Record<string, string>;
    'Note'?: string;
    'Error Message'?: string;
}

function parseNumber(value?: string): number {
    if (!value) return 0;
    const parsed = Number(value.replace('%', ''));
    return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Alpha Vantage normalizer (GLOBAL_QUOTE)
 * Docs: https://www.alphavantage.co/documentation/
 */
export const alphavantageNormalizer: ApiTypeDefinition<AlphaVantageGlobalQuoteResponse> = {
    category: 'market_data',
    displayName: 'Alpha Vantage',
    cacheTtlMs: 60 * 1000,
    rateLimitMs: 12 * 1000,

    fetchFn: async (apiKey, params) => {
        if (!apiKey) {
            return {
                'Error Message': 'Alpha Vantage requires an API key. Add one in the API Dashboard.'
            };
        }

        const symbol = (params?.symbol as string) || 'IBM';
        const fn = (params?.function as string) || 'GLOBAL_QUOTE';

        try {
            const url = `https://www.alphavantage.co/query?function=${encodeURIComponent(fn)}&symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(apiKey)}`;
            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            return {
                'Error Message': error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    normalizeFn: (raw) => {
        if (raw['Error Message'] || raw['Note']) {
            return createOmniError('alpha_vantage', 'market_data', {
                code: raw['Error Message'] ? 'API_ERROR' : 'RATE_LIMIT',
                message: raw['Error Message'] || raw['Note'] || 'Alpha Vantage error',
                retryable: !raw['Error Message']
            });
        }

        const quote = raw['Global Quote'] || {};
        const symbol = quote['01. symbol'] || 'UNKNOWN';
        const latestTradingDay = quote['07. latest trading day'];
        const timestamp = latestTradingDay ? Date.parse(latestTradingDay) : Date.now();

        const metrics: OmniMetrics = {
            values: {
                open: parseNumber(quote['02. open']),
                high: parseNumber(quote['03. high']),
                low: parseNumber(quote['04. low']),
                price: parseNumber(quote['05. price']),
                volume: parseNumber(quote['06. volume']),
                previousClose: parseNumber(quote['08. previous close']),
                change: parseNumber(quote['09. change']),
                changePercent: parseNumber(quote['10. change percent'])
            },
            timestamp: Number.isNaN(timestamp) ? Date.now() : timestamp
        };

        const items: OmniItem[] = [
            {
                id: `alpha-${symbol}-${metrics.timestamp}`,
                title: `${symbol} Quote`,
                description: `Price: $${metrics.values.price}`,
                timestamp: metrics.timestamp,
                tags: ['market', 'quote'],
                metadata: {
                    symbol,
                    raw: quote
                }
            }
        ];

        return createOmniData('alpha_vantage', 'market_data', { items, metrics }, 60 * 1000);
    }
};

export default alphavantageNormalizer;
