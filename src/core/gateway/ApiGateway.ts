// ============================================
// PROJECT OMNI: API GATEWAY SERVICE
// Centralized API management with caching,
// rate limiting, and subscription model
// ============================================

import {
    OmniData,
    OmniDataCallback,
    GatewaySubscription,
    ApiTypeDefinition,
    createOmniError
} from './omnidata.schema';
import { API_CATALOG } from '../schemas/api.schema';

// Import normalizers
import { polymarketNormalizer } from './normalizers/polymarket';
import { newsapiNormalizer } from './normalizers/newsapi';
import { weatherNormalizer } from './normalizers/weather';
import { llmNormalizer } from './normalizers/llm';
import { coingeckoNormalizer } from './normalizers/coingecko';
import { hackernewsNormalizer } from './normalizers/hackernews';
import { metaculusNormalizer } from './normalizers/metaculus';
import { alphavantageNormalizer } from './normalizers/alphavantage';
import { fredNormalizer } from './normalizers/fred';
import { blsNormalizer } from './normalizers/bls';
import { worldbankNormalizer } from './normalizers/worldbank';
import { createRestListAdapter } from './adapters/restList';

/**
 * API type registry - maps API IDs to their type definitions
 * Using 'any' for the raw type parameter to allow different normalizer types
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apiTypeRegistry = new Map<string, ApiTypeDefinition<any>>();
const defaultParamsRegistry = new Map<string, Record<string, unknown>>();

// Normalizer registry for catalog-driven wiring
const normalizerRegistry = new Map<string, ApiTypeDefinition<any>>([
    ['polymarket', polymarketNormalizer],
    ['newsapi', newsapiNormalizer],
    ['weather', weatherNormalizer],
    ['llm', llmNormalizer],
    ['coingecko', coingeckoNormalizer],
    ['hackernews', hackernewsNormalizer],
    ['metaculus', metaculusNormalizer],
    ['alpha_vantage', alphavantageNormalizer],
    ['fred', fredNormalizer],
    ['bls', blsNormalizer],
    ['worldbank', worldbankNormalizer]
]);

// Register canonical API types (direct IDs)
normalizerRegistry.forEach((def, id) => {
    apiTypeRegistry.set(id, def);
});

// Register catalog-defined adapters and aliases
function registerCatalogAdapters() {
    API_CATALOG.forEach((provider) => {
        const gateway = provider.integration?.gateway;
        if (!gateway) return;

        if (gateway.type === 'normalizer') {
            const def = normalizerRegistry.get(gateway.normalizerId);
            if (def) {
                apiTypeRegistry.set(provider.id, def);
                if (gateway.defaultParams) {
                    defaultParamsRegistry.set(provider.id, gateway.defaultParams);
                }
            }
            return;
        }

        if (gateway.type === 'rest_list') {
            apiTypeRegistry.set(provider.id, createRestListAdapter(provider, gateway.config));
            if (gateway.config.defaultParams) {
                defaultParamsRegistry.set(provider.id, gateway.config.defaultParams);
            }
        }
    });
}

registerCatalogAdapters();

/**
 * Cache entry
 */
interface CacheEntry {
    data: OmniData;
    params?: string;
}

/**
 * API Gateway Service
 * 
 * Centralizes all API calls with:
 * - Caching based on API type's TTL
 * - Rate limiting per API
 * - Subscription model for blocks
 * - Automatic retry on failure
 */
class ApiGatewayService {
    private cache: Map<string, CacheEntry> = new Map();
    private rateLimitTimers: Map<string, number> = new Map();
    private subscriptions: GatewaySubscription[] = [];
    private apiKeys: Map<string, string> = new Map();

    /**
     * Register an API key
     */
    setApiKey(apiId: string, key: string): void {
        this.apiKeys.set(apiId, key);
    }

    /**
     * Get an API key
     */
    getApiKey(apiId: string): string | undefined {
        return this.apiKeys.get(apiId);
    }

    /**
     * Register a custom API type
     */
    registerType<TRaw>(apiId: string, definition: ApiTypeDefinition<TRaw>): void {
        apiTypeRegistry.set(apiId, definition as ApiTypeDefinition);
    }

    /**
     * Check if data is cached and still valid
     */
    private getCached(apiId: string, params?: Record<string, unknown>): OmniData | null {
        const cacheKey = this.getCacheKey(apiId, params);
        const entry = this.cache.get(cacheKey);

        if (!entry) return null;

        if (Date.now() > entry.data.source.expiresAt) {
            this.cache.delete(cacheKey);
            return null;
        }

        return { ...entry.data, source: { ...entry.data.source, fromCache: true } };
    }

    /**
     * Store data in cache
     */
    private setCache(apiId: string, data: OmniData, params?: Record<string, unknown>): void {
        const cacheKey = this.getCacheKey(apiId, params);
        this.cache.set(cacheKey, { data, params: JSON.stringify(params) });
    }

    /**
     * Generate cache key
     */
    private getCacheKey(apiId: string, params?: Record<string, unknown>): string {
        return params ? `${apiId}:${JSON.stringify(params)}` : apiId;
    }

    /**
     * Wait for rate limit if needed
     */
    private async waitForRateLimit(apiId: string): Promise<void> {
        const typeDef = apiTypeRegistry.get(apiId);
        if (!typeDef) return;

        const lastCall = this.rateLimitTimers.get(apiId);
        if (lastCall) {
            const elapsed = Date.now() - lastCall;
            const waitTime = typeDef.rateLimitMs - elapsed;

            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        this.rateLimitTimers.set(apiId, Date.now());
    }

    /**
     * Fetch data from an API
     * 
     * @param apiId - The API identifier
     * @param params - Optional parameters for the API call
     * @param forceRefresh - Skip cache and fetch fresh data
     */
    async fetch(
        apiId: string,
        params?: Record<string, unknown>,
        forceRefresh = false
    ): Promise<OmniData> {
        const defaultParams = defaultParamsRegistry.get(apiId) || {};
        const effectiveParams = { ...defaultParams, ...(params || {}) };

        // 1. Check cache (unless force refresh)
        if (!forceRefresh) {
            const cached = this.getCached(apiId, effectiveParams);
            if (cached) {
                this.notifySubscribers(apiId, cached);
                return cached;
            }
        }

        // 2. Get type definition
        const typeDef = apiTypeRegistry.get(apiId);
        if (!typeDef) {
            const error = createOmniError(apiId, 'custom', {
                code: 'UNKNOWN_API',
                message: `No type definition registered for API: ${apiId}`,
                retryable: false
            });
            return error;
        }

        // 3. Get API key
        const apiKey = this.apiKeys.get(apiId) || '';

        // 4. Wait for rate limit
        await this.waitForRateLimit(apiId);

        try {
            // 5. Fetch raw data
            const raw = await typeDef.fetchFn(apiKey, effectiveParams);

            // 6. Normalize to OmniData
            const normalized = typeDef.normalizeFn(raw);
            const normalizedWithSource = normalized.source
                ? {
                    ...normalized,
                    source: {
                        ...normalized.source,
                        apiId,
                        category: typeDef.category
                    }
                }
                : normalized;

            // 7. Cache result
            if (!normalizedWithSource.error) {
                this.setCache(apiId, normalizedWithSource, effectiveParams);
            }

            // 8. Notify subscribers
            this.notifySubscribers(apiId, normalizedWithSource);

            return normalizedWithSource;
        } catch (err) {
            const error = createOmniError(apiId, typeDef.category, {
                code: 'FETCH_ERROR',
                message: err instanceof Error ? err.message : 'Unknown error',
                retryable: true
            });
            this.notifySubscribers(apiId, error);
            return error;
        }
    }

    /**
     * Subscribe to data updates for an API
     * 
     * @param apiId - The API to subscribe to
     * @param blockId - The block subscribing
     * @param callback - Called when new data is available
     * @returns Unsubscribe function
     */
    subscribe(
        apiId: string,
        blockId: string,
        callback: OmniDataCallback
    ): () => void {
        const subscription: GatewaySubscription = { apiId, blockId, callback };
        this.subscriptions.push(subscription);

        // Return unsubscribe function
        return () => {
            this.subscriptions = this.subscriptions.filter(
                s => !(s.apiId === apiId && s.blockId === blockId)
            );
        };
    }

    /**
     * Notify all subscribers of an API with new data
     */
    private notifySubscribers(apiId: string, data: OmniData): void {
        this.subscriptions
            .filter(s => s.apiId === apiId)
            .forEach(s => {
                try {
                    s.callback(data);
                } catch (err) {
                    console.error(`Error in subscription callback for ${s.blockId}:`, err);
                }
            });
    }

    /**
     * Clear cache for a specific API or all
     */
    clearCache(apiId?: string): void {
        if (apiId) {
            // Clear all cache entries for this API
            for (const key of this.cache.keys()) {
                if (key.startsWith(apiId)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    /**
     * Get list of registered API types
     */
    getRegisteredApis(): string[] {
        return Array.from(apiTypeRegistry.keys());
    }

    /**
     * Check if an API type is registered
     */
    isRegistered(apiId: string): boolean {
        return apiTypeRegistry.has(apiId);
    }
}

// Singleton instance
export const apiGateway = new ApiGatewayService();

export default apiGateway;
