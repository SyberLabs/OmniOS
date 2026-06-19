// ============================================
// PROJECT OMNI: API PROVIDER SCHEMA
// Definitions for the API Marketplace
// ============================================

/**
 * API categories aligned with Omni OS block types
 */
export type ApiCategory =
    | 'truth'        // Prediction markets, finance
    | 'pulse'        // News, narrative, sentiment
    | 'physicality'  // Location, tracking, movement
    | 'bio'          // Health, biometrics
    | 'ai'           // LLM providers, ML APIs
    | 'environment'  // Weather, satellite, climate
    | 'social'       // Social media, communication
    | 'developer'    // Productivity, dev tools
    | 'economy'      // Economic data, commerce
    | 'custom';      // User-defined

/**
 * Pricing model for API
 */
export type ApiPricing = 'free' | 'freemium' | 'paid' | 'open_source';

/**
 * Integration support level
 */
export type ApiSupportLevel = 'supported' | 'experimental' | 'planned';

/**
 * OmniData gateway categories (used by the API gateway layer)
 */
export type GatewayCategory =
    | 'prediction_market'
    | 'news'
    | 'market_data'
    | 'transport'
    | 'weather'
    | 'llm'
    | 'social'
    | 'bio'
    | 'developer'
    | 'custom';

/**
 * Connection status for an API
 */
export type ApiStatus =
    | 'connected'      // Active and receiving data
    | 'idle'           // Configured but not in use
    | 'error'          // Connection failed
    | 'not_configured' // No API key set
    | 'testing';       // Currently testing connection

/**
 * REST list adapter config (generic JSON list APIs)
 */
export interface RestListAdapterConfig {
    /** Relative path appended to baseUrl */
    path: string;
    /** GET or POST (default GET) */
    method?: 'GET' | 'POST';
    /** Default query params */
    defaultParams?: Record<string, string | number | boolean>;
    /** Optional headers */
    headers?: Record<string, string>;
    /** Auth placement */
    auth?: {
        in: 'header' | 'query';
        name?: string;      // Header or query key
        prefix?: string;    // e.g., "Bearer "
    };
    /** Dot path to list of items in response */
    itemsPath?: string;
    /** Mapping from item fields to OmniItem */
    itemMap: {
        id?: string;
        title: string;
        description?: string;
        url?: string;
        image?: string;
        timestamp?: string;
        tags?: string;
    };
    /** Additional metadata field mapping */
    metadataMap?: Record<string, string>;
    /** Override cache TTL for this adapter */
    cacheTtlMs?: number;
    /** Override rate limit for this adapter */
    rateLimitMs?: number;
    /** OmniData category for this adapter */
    category?: GatewayCategory;
}

/**
 * Gateway integration config
 */
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

/**
 * API integration metadata
 */
export interface ApiIntegration {
    support: ApiSupportLevel;
    gateway?: ApiGatewayAdapter;
    testParams?: Record<string, unknown>;
    notes?: string;
}

/**
 * API Provider definition
 */
export interface ApiProvider {
    /** Unique identifier */
    id: string;

    /** Display name */
    name: string;

    /** Category */
    category: ApiCategory;

    /** Short description */
    description: string;

    /** Icon (Lucide icon name) */
    icon: string;

    /** Base URL for the API */
    baseUrl: string;

    /** Documentation URL */
    docsUrl?: string;

    /** Pricing model */
    pricing: ApiPricing;

    /** Free tier limits (if applicable) */
    freeTierLimits?: string;

    /** Whether API key is required */
    requiresAuth: boolean;

    /** Auth type */
    authType?: 'api_key' | 'oauth' | 'bearer' | 'basic';

    /** Corresponding block IDs that use this API */
    blockIds?: string[];

    /** Whether this API is installed/enabled */
    isInstalled?: boolean;

    /** Tags for search */
    tags: string[];

    /** Integration metadata */
    integration?: ApiIntegration;
}

/**
 * Stored API configuration (with encrypted key)
 */
export interface ApiConfig {
    providerId: string;
    encryptedKey?: string;
    status: ApiStatus;
    lastTested?: number;
    requestCount: number;
    lastRequest?: number;
    errorMessage?: string;
}

/**
 * Usage statistics for an API
 */
export interface ApiUsageStats {
    providerId: string;
    requestsToday: number;
    requestsThisMonth: number;
    lastRequestTime?: number;
    averageResponseTime?: number;
    errorRate: number;
}

// ============================================
// API CATALOG - All 80+ APIs
// ============================================

export const API_CATALOG: ApiProvider[] = [
    // ========== TRUTH (Prediction Markets & Finance) ==========
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
        id: 'predictit',
        name: 'PredictIt',
        category: 'truth',
        description: 'Political prediction markets',
        icon: 'Vote',
        baseUrl: 'https://www.predictit.org/api',
        docsUrl: 'https://predictit.freshdesk.com/support/solutions/articles/12000001878',
        pricing: 'free',
        requiresAuth: false,
        tags: ['politics', 'prediction', 'markets']
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
        id: 'polygon',
        name: 'Polygon.io',
        category: 'truth',
        description: 'Stocks, options, forex, and crypto',
        icon: 'BarChart3',
        baseUrl: 'https://api.polygon.io',
        docsUrl: 'https://polygon.io/docs',
        pricing: 'freemium',
        freeTierLimits: '5 calls/min',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['stocks', 'options', 'forex', 'crypto']
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
        id: 'binance',
        name: 'Binance',
        category: 'truth',
        description: 'Crypto exchange data',
        icon: 'Bitcoin',
        baseUrl: 'https://api.binance.com',
        docsUrl: 'https://binance-docs.github.io/apidocs/',
        pricing: 'free',
        requiresAuth: false,
        tags: ['crypto', 'exchange', 'trading']
    },

    // ========== PULSE (News & Narrative) ==========
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
        id: 'gdelt',
        name: 'GDELT',
        category: 'pulse',
        description: 'Global event database and analysis',
        icon: 'Globe',
        baseUrl: 'https://api.gdeltproject.org',
        docsUrl: 'https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/',
        pricing: 'free',
        requiresAuth: false,
        blockIds: ['gdelt_events'],
        tags: ['events', 'global', 'geopolitics']
    },
    {
        id: 'guardian',
        name: 'The Guardian',
        category: 'pulse',
        description: 'Guardian Open Platform',
        icon: 'FileText',
        baseUrl: 'https://content.guardianapis.com',
        docsUrl: 'https://open-platform.theguardian.com/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['news', 'journalism', 'uk']
    },
    {
        id: 'reddit',
        name: 'Reddit',
        category: 'pulse',
        description: 'Reddit posts and comments',
        icon: 'MessageCircle',
        baseUrl: 'https://www.reddit.com',
        docsUrl: 'https://www.reddit.com/dev/api/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['social', 'discussion', 'trends']
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
        blockIds: ['openalex_works'],
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
        id: 'mediastack',
        name: 'Mediastack',
        category: 'pulse',
        description: 'Real-time news aggregator',
        icon: 'Rss',
        baseUrl: 'http://api.mediastack.com/v1',
        docsUrl: 'https://mediastack.com/documentation',
        pricing: 'freemium',
        freeTierLimits: '500 requests/month',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['news', 'aggregator', 'realtime']
    },

    // ========== PHYSICALITY (Location & Movement) ==========
    {
        id: 'flightradar24',
        name: 'FlightRadar24',
        category: 'physicality',
        description: 'Real-time flight tracking',
        icon: 'Plane',
        baseUrl: 'https://fr24api.flightradar24.com',
        docsUrl: 'https://fr24api.flightradar24.com/docs',
        pricing: 'paid',
        requiresAuth: true,
        authType: 'api_key',
        blockIds: ['flightaware_tracker'],
        tags: ['aviation', 'flights', 'tracking']
    },
    {
        id: 'aviationstack',
        name: 'Aviationstack',
        category: 'physicality',
        description: 'Flight status and schedules',
        icon: 'PlaneTakeoff',
        baseUrl: 'http://api.aviationstack.com/v1',
        docsUrl: 'https://aviationstack.com/documentation',
        pricing: 'freemium',
        freeTierLimits: '100 requests/month',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['aviation', 'schedules', 'airports']
    },
    {
        id: 'opensky',
        name: 'OpenSky Network',
        category: 'physicality',
        description: 'Open source flight tracking',
        icon: 'Radio',
        baseUrl: 'https://opensky-network.org/api',
        docsUrl: 'https://openskynetwork.github.io/opensky-api/',
        pricing: 'free',
        requiresAuth: false,
        tags: ['aviation', 'open source', 'ADS-B']
    },
    {
        id: 'vesselfinder',
        name: 'VesselFinder',
        category: 'physicality',
        description: 'Maritime AIS tracking',
        icon: 'Ship',
        baseUrl: 'https://api.vesselfinder.com',
        docsUrl: 'https://api.vesselfinder.com/docs',
        pricing: 'paid',
        requiresAuth: true,
        authType: 'api_key',
        blockIds: ['marinetraffic_ais'],
        tags: ['maritime', 'ships', 'AIS']
    },
    {
        id: 'google_maps',
        name: 'Google Maps',
        category: 'physicality',
        description: 'Geolocation and places',
        icon: 'MapPin',
        baseUrl: 'https://maps.googleapis.com/maps/api',
        docsUrl: 'https://developers.google.com/maps/documentation',
        pricing: 'freemium',
        freeTierLimits: '$200/month credit',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['maps', 'geolocation', 'places']
    },
    {
        id: 'openstreetmap',
        name: 'OpenStreetMap',
        category: 'physicality',
        description: 'Free mapping data',
        icon: 'Map',
        baseUrl: 'https://nominatim.openstreetmap.org',
        docsUrl: 'https://wiki.openstreetmap.org/wiki/API',
        pricing: 'free',
        requiresAuth: false,
        tags: ['maps', 'open source', 'geolocation']
    },

    // ========== BIO (Health & Biometrics) ==========
    {
        id: 'fitbit',
        name: 'Fitbit',
        category: 'bio',
        description: 'Activity, sleep, and heart rate',
        icon: 'Activity',
        baseUrl: 'https://api.fitbit.com',
        docsUrl: 'https://dev.fitbit.com/build/reference/web-api/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['fitness', 'health', 'wearables']
    },
    {
        id: 'oura',
        name: 'Oura Ring',
        category: 'bio',
        description: 'Sleep and readiness scores',
        icon: 'Moon',
        baseUrl: 'https://api.ouraring.com',
        docsUrl: 'https://cloud.ouraring.com/docs/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['sleep', 'recovery', 'wearables']
    },
    {
        id: 'strava',
        name: 'Strava',
        category: 'bio',
        description: 'Athletic activities',
        icon: 'Bike',
        baseUrl: 'https://www.strava.com/api/v3',
        docsUrl: 'https://developers.strava.com/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['fitness', 'sports', 'activities']
    },
    {
        id: 'withings',
        name: 'Withings',
        category: 'bio',
        description: 'Weight, BP, and sleep',
        icon: 'Heart',
        baseUrl: 'https://wbsapi.withings.net',
        docsUrl: 'https://developer.withings.com/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['health', 'weight', 'blood pressure']
    },
    {
        id: 'pubmed',
        name: 'PubMed',
        category: 'bio',
        description: 'Medical research database',
        icon: 'BookOpen',
        baseUrl: 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils',
        docsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK25501/',
        pricing: 'free',
        requiresAuth: false,
        tags: ['medical', 'research', 'science']
    },

    // ========== AI & LLM ==========
    {
        id: 'openai',
        name: 'OpenAI',
        category: 'ai',
        description: 'GPT-4, DALL-E, Whisper',
        icon: 'Sparkles',
        baseUrl: 'https://api.openai.com/v1',
        docsUrl: 'https://platform.openai.com/docs',
        pricing: 'paid',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['llm', 'gpt', 'ai', 'chat']
    },
    {
        id: 'anthropic',
        name: 'Anthropic',
        category: 'ai',
        description: 'Claude 3 models',
        icon: 'Brain',
        baseUrl: 'https://api.anthropic.com',
        docsUrl: 'https://docs.anthropic.com/',
        pricing: 'paid',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['llm', 'claude', 'ai', 'chat']
    },
    {
        id: 'google_gemini',
        name: 'Google Gemini',
        category: 'ai',
        description: 'Multimodal AI',
        icon: 'Gem',
        baseUrl: 'https://generativelanguage.googleapis.com',
        docsUrl: 'https://ai.google.dev/docs',
        pricing: 'freemium',
        freeTierLimits: '60 requests/min',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['llm', 'gemini', 'multimodal']
    },
    {
        id: 'mistral',
        name: 'Mistral',
        category: 'ai',
        description: 'Open-weight models',
        icon: 'Wind',
        baseUrl: 'https://api.mistral.ai',
        docsUrl: 'https://docs.mistral.ai/',
        pricing: 'freemium',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['llm', 'open source', 'ai']
    },
    {
        id: 'groq',
        name: 'Groq',
        category: 'ai',
        description: 'Ultra-fast inference',
        icon: 'Zap',
        baseUrl: 'https://api.groq.com/openai/v1',
        docsUrl: 'https://console.groq.com/docs',
        pricing: 'freemium',
        freeTierLimits: 'Generous free tier',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['llm', 'fast', 'inference']
    },
    {
        id: 'huggingface',
        name: 'Hugging Face',
        category: 'ai',
        description: 'Model hub and inference',
        icon: 'Bot',
        baseUrl: 'https://api-inference.huggingface.co',
        docsUrl: 'https://huggingface.co/docs/api-inference/',
        pricing: 'freemium',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['ml', 'models', 'inference']
    },
    {
        id: 'elevenlabs',
        name: 'ElevenLabs',
        category: 'ai',
        description: 'Voice synthesis',
        icon: 'Volume2',
        baseUrl: 'https://api.elevenlabs.io',
        docsUrl: 'https://elevenlabs.io/docs',
        pricing: 'freemium',
        freeTierLimits: '10,000 characters/month',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['voice', 'tts', 'audio']
    },
    {
        id: 'deepl',
        name: 'DeepL',
        category: 'ai',
        description: 'Translation API',
        icon: 'Languages',
        baseUrl: 'https://api-free.deepl.com/v2',
        docsUrl: 'https://www.deepl.com/docs-api',
        pricing: 'freemium',
        freeTierLimits: '500,000 chars/month',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['translation', 'language', 'nlp']
    },

    // ========== ENVIRONMENT ==========
    {
        id: 'openweathermap',
        name: 'OpenWeatherMap',
        category: 'environment',
        description: 'Weather and forecasts',
        icon: 'CloudSun',
        baseUrl: 'https://api.openweathermap.org/data/2.5',
        docsUrl: 'https://openweathermap.org/api',
        pricing: 'freemium',
        freeTierLimits: '1,000 calls/day',
        requiresAuth: true,
        authType: 'api_key',
        integration: {
            support: 'supported',
            gateway: {
                type: 'normalizer',
                normalizerId: 'weather',
                defaultParams: { city: 'San Francisco', units: 'metric' }
            },
            testParams: { city: 'San Francisco', units: 'metric' }
        },
        tags: ['weather', 'forecast', 'climate']
    },
    {
        id: 'weathergov',
        name: 'Weather.gov',
        category: 'environment',
        description: 'US National Weather Service',
        icon: 'Cloud',
        baseUrl: 'https://api.weather.gov',
        docsUrl: 'https://www.weather.gov/documentation/services-web-api',
        pricing: 'free',
        requiresAuth: false,
        tags: ['weather', 'us', 'official']
    },
    {
        id: 'airnow',
        name: 'AirNow',
        category: 'environment',
        description: 'Air quality index',
        icon: 'Wind',
        baseUrl: 'https://www.airnowapi.org',
        docsUrl: 'https://docs.airnowapi.org/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['air quality', 'environment', 'health']
    },
    {
        id: 'usgs',
        name: 'USGS',
        category: 'environment',
        description: 'Earthquakes and geology',
        icon: 'Mountain',
        baseUrl: 'https://earthquake.usgs.gov/fdsnws/event/1',
        docsUrl: 'https://earthquake.usgs.gov/fdsnws/event/1/',
        pricing: 'free',
        requiresAuth: false,
        tags: ['earthquakes', 'geology', 'science']
    },
    {
        id: 'nasa_eosdis',
        name: 'NASA EOSDIS',
        category: 'environment',
        description: 'Satellite imagery',
        icon: 'Satellite',
        baseUrl: 'https://cmr.earthdata.nasa.gov',
        docsUrl: 'https://earthdata.nasa.gov/',
        pricing: 'free',
        requiresAuth: false,
        tags: ['satellite', 'imagery', 'space']
    },

    // ========== SOCIAL & COMMUNICATION ==========
    {
        id: 'discord',
        name: 'Discord',
        category: 'social',
        description: 'Bot and webhook API',
        icon: 'MessageSquare',
        baseUrl: 'https://discord.com/api/v10',
        docsUrl: 'https://discord.com/developers/docs',
        pricing: 'free',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['chat', 'bots', 'community']
    },
    {
        id: 'telegram',
        name: 'Telegram',
        category: 'social',
        description: 'Bot API',
        icon: 'Send',
        baseUrl: 'https://api.telegram.org',
        docsUrl: 'https://core.telegram.org/bots/api',
        pricing: 'free',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['chat', 'bots', 'messaging']
    },
    {
        id: 'slack',
        name: 'Slack',
        category: 'social',
        description: 'Workspace integration',
        icon: 'Hash',
        baseUrl: 'https://slack.com/api',
        docsUrl: 'https://api.slack.com/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['chat', 'workspace', 'teams']
    },
    {
        id: 'mastodon',
        name: 'Mastodon',
        category: 'social',
        description: 'Fediverse access',
        icon: 'Users',
        baseUrl: 'https://mastodon.social/api/v1',
        docsUrl: 'https://docs.joinmastodon.org/api/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['social', 'fediverse', 'decentralized']
    },
    {
        id: 'bluesky',
        name: 'Bluesky',
        category: 'social',
        description: 'AT Protocol social',
        icon: 'Cloud',
        baseUrl: 'https://bsky.social/xrpc',
        docsUrl: 'https://atproto.com/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['social', 'decentralized', 'atproto']
    },
    {
        id: 'spotify',
        name: 'Spotify',
        category: 'social',
        description: 'Music and playlists',
        icon: 'Music',
        baseUrl: 'https://api.spotify.com/v1',
        docsUrl: 'https://developer.spotify.com/documentation/web-api/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['music', 'audio', 'streaming']
    },
    {
        id: 'youtube',
        name: 'YouTube',
        category: 'social',
        description: 'Video and channel data',
        icon: 'Play',
        baseUrl: 'https://www.googleapis.com/youtube/v3',
        docsUrl: 'https://developers.google.com/youtube/v3',
        pricing: 'freemium',
        freeTierLimits: '10,000 units/day',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['video', 'streaming', 'content']
    },

    // ========== DEVELOPER & PRODUCTIVITY ==========
    {
        id: 'github',
        name: 'GitHub',
        category: 'developer',
        description: 'Repos, issues, and PRs',
        icon: 'Github',
        baseUrl: 'https://api.github.com',
        docsUrl: 'https://docs.github.com/en/rest',
        pricing: 'free',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['git', 'code', 'development']
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
        id: 'notion',
        name: 'Notion',
        category: 'developer',
        description: 'Workspace API',
        icon: 'FileEdit',
        baseUrl: 'https://api.notion.com/v1',
        docsUrl: 'https://developers.notion.com/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['notes', 'productivity', 'workspace']
    },
    {
        id: 'airtable',
        name: 'Airtable',
        category: 'developer',
        description: 'Database API',
        icon: 'Table',
        baseUrl: 'https://api.airtable.com/v0',
        docsUrl: 'https://airtable.com/developers/web/api/',
        pricing: 'freemium',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['database', 'spreadsheet', 'data']
    },
    {
        id: 'linear',
        name: 'Linear',
        category: 'developer',
        description: 'Issue tracking',
        icon: 'CheckSquare',
        baseUrl: 'https://api.linear.app/graphql',
        docsUrl: 'https://developers.linear.app/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'bearer',
        tags: ['issues', 'project management', 'agile']
    },
    {
        id: 'google_calendar',
        name: 'Google Calendar',
        category: 'developer',
        description: 'Events and scheduling',
        icon: 'Calendar',
        baseUrl: 'https://www.googleapis.com/calendar/v3',
        docsUrl: 'https://developers.google.com/calendar/',
        pricing: 'free',
        requiresAuth: true,
        authType: 'oauth',
        tags: ['calendar', 'scheduling', 'events']
    },

    // ========== ECONOMY & COMMERCE ==========
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
        tags: ['employment', 'labor', 'statistics']
    },
    {
        id: 'census',
        name: 'US Census',
        category: 'economy',
        description: 'US demographic data',
        icon: 'PieChart',
        baseUrl: 'https://api.census.gov/data',
        docsUrl: 'https://www.census.gov/data/developers.html',
        pricing: 'free',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['demographics', 'population', 'us']
    },
    {
        id: 'exchangerates',
        name: 'Open Exchange Rates',
        category: 'economy',
        description: 'Currency conversion',
        icon: 'DollarSign',
        baseUrl: 'https://openexchangerates.org/api',
        docsUrl: 'https://docs.openexchangerates.org/',
        pricing: 'freemium',
        freeTierLimits: '1,000 requests/month',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['currency', 'forex', 'exchange']
    },
    {
        id: 'coinmarketcap',
        name: 'CoinMarketCap',
        category: 'economy',
        description: 'Crypto rankings and data',
        icon: 'TrendingUp',
        baseUrl: 'https://pro-api.coinmarketcap.com/v1',
        docsUrl: 'https://coinmarketcap.com/api/documentation/',
        pricing: 'freemium',
        freeTierLimits: '10,000 calls/month',
        requiresAuth: true,
        authType: 'api_key',
        tags: ['crypto', 'rankings', 'market data']
    }
];

/**
 * Get API providers by category
 */
export function getApisByCategory(category: ApiCategory): ApiProvider[] {
    return API_CATALOG.filter(api => api.category === category);
}

/**
 * Get all unique categories
 */
export function getApiCategories(): ApiCategory[] {
    return [...new Set(API_CATALOG.map(api => api.category))];
}

/**
 * Search APIs by query
 */
export function searchApis(query: string): ApiProvider[] {
    const lowerQuery = query.toLowerCase();
    return API_CATALOG.filter(api =>
        api.name.toLowerCase().includes(lowerQuery) ||
        api.description.toLowerCase().includes(lowerQuery) ||
        api.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
}

/**
 * Get provider by ID
 */
export function getApiProvider(providerId: string): ApiProvider | undefined {
    return API_CATALOG.find(api => api.id === providerId);
}

/**
 * Get integration support level for a provider
 */
export function getApiSupportLevel(providerId: string): ApiSupportLevel {
    const provider = getApiProvider(providerId);
    return provider?.integration?.support || 'planned';
}

/**
 * Whether an API is supported by the gateway
 */
export function isApiSupported(providerId: string): boolean {
    const support = getApiSupportLevel(providerId);
    return support === 'supported' || support === 'experimental';
}

/**
 * Get all providers that are supported by the gateway
 */
export function getSupportedApis(): ApiProvider[] {
    return API_CATALOG.filter(api => isApiSupported(api.id));
}
