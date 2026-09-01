export type ApiCategory = 'truth' | 'pulse' | 'developer' | 'economy';

export type ApiPricing = 'free' | 'freemium' | 'paid' | 'open_source';

export type ApiSupportLevel = 'supported' | 'experimental' | 'planned';

export type GatewayCategory =
    | 'prediction_market'
    | 'news'
    | 'market_data'
    | 'developer'
    | 'custom';

export type ApiStatus =
    | 'connected'
    | 'idle'
    | 'error'
    | 'not_configured'
    | 'testing';

export interface RestListAdapterConfig {
    path: string;
    method?: 'GET' | 'POST';
    defaultParams?: Record<string, string | number | boolean>;
    headers?: Record<string, string>;
    auth?: {
        in: 'header' | 'query';
        name?: string;
        prefix?: string;
    };
    itemsPath?: string;
    itemMap: {
        id?: string;
        title: string;
        description?: string;
        url?: string;
        image?: string;
        timestamp?: string;
        tags?: string;
    };
    metadataMap?: Record<string, string>;
    cacheTtlMs?: number;
    rateLimitMs?: number;
    category?: GatewayCategory;
}

export type ApiGatewayAdapter =
    | {
        type: 'normalizer';
        normalizerId: string;
        defaultParams?: Record<string, unknown>;
    }
    | {
        type: 'rest_list';
        config: RestListAdapterConfig;
    };

export interface ApiIntegration {
    support: ApiSupportLevel;
    gateway?: ApiGatewayAdapter;
    testParams?: Record<string, unknown>;
    notes?: string;
}

export interface ApiProvider {
    id: string;
    name: string;
    category: ApiCategory;
    description: string;
    icon: string;
    baseUrl: string;
    docsUrl?: string;
    pricing: ApiPricing;
    freeTierLimits?: string;
    requiresAuth: boolean;
    authType?: 'api_key' | 'oauth' | 'bearer' | 'basic';
    blockIds?: string[];
    isInstalled?: boolean;
    tags: string[];
    integration?: ApiIntegration;
}

export interface ApiConfig {
    providerId: string;
    apiKey?: string;
    status: ApiStatus;
    lastTested?: number;
    requestCount: number;
    lastRequest?: number;
    errorMessage?: string;
}

export const API_CATALOG: ApiProvider[] = [
    {
        id: 'polymarket',
        name: 'Polymarket',
        category: 'truth',
        description: 'Prediction market odds and probabilities',
        icon: 'TrendingUp',
        baseUrl: 'https://gamma-api.polymarket.com',
        docsUrl: 'https://docs.polymarket.com',
        pricing: 'free',
        requiresAuth: false,
        blockIds: ['polymarket_live_odds'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'polymarket',
                defaultParams: { limit: 50 }
            },
            testParams: { limit: 10 }
        },
        tags: ['prediction', 'betting', 'markets', 'probability']
    },
    {
        id: 'metaculus',
        name: 'Metaculus',
        category: 'truth',
        description: 'Forecasting platform with calibrated predictions',
        icon: 'Target',
        baseUrl: 'https://www.metaculus.com/api2',
        docsUrl: 'https://www.metaculus.com/api/',
        pricing: 'free',
        requiresAuth: false,
        blockIds: ['metaculus_forecast'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'metaculus',
                defaultParams: { limit: 50 }
            },
            testParams: { limit: 10 }
        },
        tags: ['forecasting', 'prediction', 'calibration']
    },
    {
        id: 'alpha_vantage',
        name: 'Alpha Vantage',
        category: 'truth',
        description: 'Stock, forex, and crypto market data',
        icon: 'LineChart',
        baseUrl: 'https://www.alphavantage.co',
        docsUrl: 'https://www.alphavantage.co/documentation/',
        pricing: 'freemium',
        freeTierLimits: '25 requests/day',
        requiresAuth: true,
        authType: 'api_key',
        blockIds: ['alpha_vantage_quote'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'alpha_vantage',
                defaultParams: { function: 'GLOBAL_QUOTE', symbol: 'IBM' }
            },
            testParams: { function: 'GLOBAL_QUOTE', symbol: 'IBM' }
        },
        tags: ['stocks', 'forex', 'crypto', 'finance']
    },
    {
        id: 'coingecko',
        name: 'CoinGecko',
        category: 'truth',
        description: 'Cryptocurrency prices and market data',
        icon: 'Coins',
        baseUrl: 'https://api.coingecko.com/api/v3',
        docsUrl: 'https://www.coingecko.com/en/api/documentation',
        pricing: 'freemium',
        freeTierLimits: '10-50 calls/min',
        requiresAuth: false,
        blockIds: ['coingecko_crypto'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'coingecko',
                defaultParams: { currency: 'usd', limit: 25 }
            },
            testParams: { currency: 'usd', limit: 10 }
        },
        tags: ['crypto', 'prices', 'market cap']
    },
    {
        id: 'fred',
        name: 'FRED',
        category: 'truth',
        description: 'Federal Reserve economic data',
        icon: 'Building',
        baseUrl: 'https://api.stlouisfed.org/fred',
        docsUrl: 'https://fred.stlouisfed.org/docs/api/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'api_key',
        blockIds: ['fred_series'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'fred',
                defaultParams: {
                    seriesId: 'GDP',
                    limit: 24,
                    sort_order: 'desc'
                }
            },
            testParams: {
                seriesId: 'GDP',
                limit: 5,
                sort_order: 'desc'
            }
        },
        tags: ['economics', 'federal reserve', 'data']
    },
    {
        id: 'newsapi',
        name: 'NewsAPI',
        category: 'pulse',
        description: 'Aggregated news headlines worldwide',
        icon: 'Newspaper',
        baseUrl: 'https://newsapi.org/v2',
        docsUrl: 'https://newsapi.org/docs',
        pricing: 'freemium',
        freeTierLimits: '100 requests/day',
        requiresAuth: true,
        authType: 'api_key',
        blockIds: ['newsapi_feed'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'newsapi',
                defaultParams: { endpoint: 'top-headlines', country: 'us', pageSize: 20 }
            },
            testParams: { endpoint: 'top-headlines', country: 'us', pageSize: 5 }
        },
        tags: ['news', 'headlines', 'media']
    },
    {
        id: 'hackernews',
        name: 'Hacker News',
        category: 'pulse',
        description: 'Tech community feed',
        icon: 'Zap',
        baseUrl: 'https://hacker-news.firebaseio.com/v0',
        docsUrl: 'https://github.com/HackerNews/API',
        pricing: 'free',
        requiresAuth: false,
        blockIds: ['hackernews_feed'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'hackernews',
                defaultParams: { type: 'top', limit: 30 }
            },
            testParams: { type: 'top', limit: 10 }
        },
        tags: ['tech', 'startups', 'programming']
    },
    {
        id: 'openalex',
        name: 'OpenAlex',
        category: 'developer',
        description: 'Open scholarly graph of research works',
        icon: 'BookOpen',
        baseUrl: 'https://api.openalex.org',
        docsUrl: 'https://docs.openalex.org/',
        pricing: 'free',
        requiresAuth: false,
        blockIds: ['openalex_works'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'rest_list',
                config: {
                    path: '/works',
                    defaultParams: {
                        per_page: 25,
                        sort: 'publication_date:desc'
                    },
                    auth: {
                        in: 'query',
                        name: 'api_key'
                    },
                    itemsPath: 'results',
                    itemMap: {
                        id: 'id',
                        title: 'display_name',
                        description: 'host_venue.display_name',
                        url: 'primary_location.landing_page_url',
                        timestamp: 'publication_date',
                        tags: 'type'
                    },
                    metadataMap: {
                        citedBy: 'cited_by_count',
                        publicationYear: 'publication_year',
                        doi: 'doi'
                    },
                    cacheTtlMs: 10 * 60 * 1000,
                    rateLimitMs: 1000,
                    category: 'developer'
                }
            },
            testParams: {
                per_page: 5,
                sort: 'publication_date:desc'
            }
        },
        tags: ['research', 'papers', 'citations', 'scholarly']
    },
    {
        id: 'worldbank',
        name: 'World Bank',
        category: 'economy',
        description: 'Global economic indicators',
        icon: 'Globe',
        baseUrl: 'https://api.worldbank.org/v2',
        docsUrl: 'https://datahelpdesk.worldbank.org/knowledgebase/topics/125589',
        pricing: 'free',
        requiresAuth: false,
        blockIds: ['worldbank_indicator'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'worldbank',
                defaultParams: {
                    country: 'USA',
                    indicator: 'NY.GDP.MKTP.CD',
                    per_page: 60
                }
            },
            testParams: {
                country: 'USA',
                indicator: 'SP.POP.TOTL',
                per_page: 5
            }
        },
        tags: ['economics', 'global', 'data']
    },
    {
        id: 'bls',
        name: 'BLS',
        category: 'economy',
        description: 'US labor statistics',
        icon: 'Users',
        baseUrl: 'https://api.bls.gov/publicAPI/v2',
        docsUrl: 'https://www.bls.gov/developers/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'api_key',
        blockIds: ['bls_series'],
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'bls',
                defaultParams: {
                    seriesId: 'LNS14000000'
                }
            },
            testParams: {
                seriesId: 'LNS14000000'
            }
        },
        tags: ['labor', 'employment', 'statistics']
    }
];

export function getApisByCategory(category: ApiCategory): ApiProvider[] {
    return API_CATALOG.filter(api => api.category === category);
}

export function getApiCategories(): ApiCategory[] {
    return [...new Set(API_CATALOG.map(api => api.category))];
}

export function searchApis(query: string): ApiProvider[] {
    const lowerQuery = query.toLowerCase();
    return API_CATALOG.filter(api =>
        api.name.toLowerCase().includes(lowerQuery) ||
        api.description.toLowerCase().includes(lowerQuery) ||
        api.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}

export function getApiProvider(providerId: string): ApiProvider | undefined {
    return API_CATALOG.find(api => api.id === providerId);
}

export function getApiSupportLevel(providerId: string): ApiSupportLevel {
    const provider = getApiProvider(providerId);
    return provider?.integration?.support || 'planned';
}

export function isApiSupported(providerId: string): boolean {
    const support = getApiSupportLevel(providerId);
    return support === 'supported' || support === 'experimental';
}

export function getSupportedApis(): ApiProvider[] {
    return API_CATALOG.filter(api => isApiSupported(api.id));
}
