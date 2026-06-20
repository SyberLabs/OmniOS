// ============================================
// PROJECT OMNI: METACULUS NORMALIZER
// Converts Metaculus API responses to OmniData
// ============================================

import {
    ApiTypeDefinition,
    OmniItem,
    createOmniData,
    createOmniError
} from '../omnidata.schema';
import { debug } from '../../debug';

/**
 * Raw Metaculus API Question structure
 */
interface MetaculusQuestion {
    id: number;
    title: string;
    description: string;
    url: string;
    status: string;
    created_time?: string;
    created_at?: string; // New field
    publish_time: string;
    close_time: string;
    resolve_time: string;
    scheduled_close_time?: string; // New field
    slug?: string; // New field
    possibilities: {
        type: string;
    };
    prediction_count: number;
    community_prediction?: {
        full: {
            y: number[]; // probabilities
            x: number[]; // values (timestamps or numeric)
        };
        unweighted: {
            y: number[];
            x: number[];
        };
    };
    number_of_forecasters?: number;
    nr_forecasters?: number; // New field
    author: string;
    categories: string[];
    // Nested question object for some endpoints
    question?: {
        id: number;
        title: string;
        description: string;
        slug: string;
        status: string;
        created_at: string;
        open_time: string;
        scheduled_close_time: string;
        scheduled_resolve_time: string;
        actual_close_time: string | null;
        actual_resolve_time: string | null;
        type: string;
        nr_forecasters: number;
        prediction_count: number;
        aggregations?: {
            recency_weighted?: {
                latest?: {
                    center?: number;
                };
                history?: unknown[];
            };
        };
    };
    aggregations?: {
        recency_weighted?: {
            latest?: {
                center?: number;
            };
        };
    };
}

interface MetaculusResponse {
    results?: MetaculusQuestion[];
    next?: string;
    previous?: string;
    count?: number;
    error?: string;
}

/**
 * Metaculus API normalizer
 */
export const metaculusNormalizer: ApiTypeDefinition<MetaculusResponse> = {
    category: 'prediction_market',
    displayName: 'Metaculus',
    cacheTtlMs: 60 * 1000, // 1 minute
    rateLimitMs: 2000,     // 2 seconds

    fetchFn: async (_apiKey, params) => {
        const limit = (params?.limit as number) || 20;
        const search = (params?.search as string) || '';

        debug('[Metaculus] 🎯 Starting fetch...', { limit, search });

        try {
            let proxyUrl = `/api/metaculus?limit=${limit}`;
            if (search) proxyUrl += `&search=${encodeURIComponent(search)}`;

            debug('[Metaculus] 📡 Using local proxy:', proxyUrl);

            const response = await fetch(proxyUrl);

            if (response.ok) {
                const data = await response.json();
                debug('[Metaculus] ✅ Proxy succeeded:', {
                    resultCount: data.results?.length || 0
                });
                return data;
            }

            // Non-OK is an expected, recoverable upstream condition (Metaculus
            // currently 403s unauthenticated traffic). Return a clean error for
            // the normalizer to surface as block state — no thrown/logged noise.
            const message = response.status === 403
                ? 'Metaculus is not accepting requests right now (403).'
                : `Metaculus request failed (${response.status}).`;
            debug('[Metaculus] ⚠️ Proxy returned status:', response.status);
            return { error: message };
        } catch (error) {
            // Only genuinely unexpected failures (network/parse) land here.
            debug('[Metaculus] ⚠️ Fetch failed:', error);
            return { error: error instanceof Error ? error.message : 'Unknown error' };
        }
    },

    normalizeFn: (raw) => {
        debug('[Metaculus] 🔄 Normalizing response...');

        if (raw.error) {
            return createOmniError('metaculus', 'prediction_market', {
                code: 'API_ERROR',
                message: raw.error,
                retryable: true
            });
        }

        const results = raw.results || [];

        if (results.length === 0) {
            return createOmniData('metaculus', 'prediction_market', { items: [] }, 60000);
        }

        const items: OmniItem[] = results.map(q => {
            // Extract probability
            let probability = 0.5;

            // Try to find probability in new API structure (aggregations)
            // It can be on the root object or inside a 'question' property
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getProb = (obj: any) => {
                // Check recency_weighted first (usually in 'centers' array which contains the probability)
                let center = obj?.aggregations?.recency_weighted?.latest?.centers?.[0];
                if (center !== undefined) return center;

                // Check unweighted as fallback
                center = obj?.aggregations?.unweighted?.latest?.centers?.[0];
                if (center !== undefined) return center;

                // Legacy/Other structure check
                return obj?.aggregations?.recency_weighted?.latest?.center;
            };

            const probValue = getProb(q) ?? getProb(q.question);

            if (typeof probValue === 'number') {
                probability = probValue;
            } else if (q.community_prediction?.full?.y) {
                // Fallback to legacy structure
                const yValues = q.community_prediction.full.y;
                if (Array.isArray(yValues) && yValues.length > 0) {
                    probability = yValues[yValues.length - 1];
                }
            }

            // Determine correct ID and Title (sometimes inside question object)
            const id = q.id;
            const title = q.title || q.question?.title || 'Unknown Question';
            const description = q.description || q.question?.description || '';
            const publishTime = q.publish_time || q.created_at || new Date().toISOString();
            const urlSlug = q.slug || q.question?.slug || String(id);
            const closeTime = q.close_time || q.question?.scheduled_close_time || q.scheduled_close_time;
            const forecasters = q.number_of_forecasters ?? q.nr_forecasters ?? q.question?.nr_forecasters ?? 0;
            const predictionCount = q.prediction_count ?? q.question?.prediction_count ?? 0;
            const status = q.status ?? q.question?.status ?? 'active';

            return {
                id: `metaculus-${id}`,
                title: title,
                description: description,
                url: `https://www.metaculus.com/questions/${id}/${urlSlug}/`,
                timestamp: new Date(publishTime).getTime(),
                tags: ['forecasting', ...(q.categories || [])],
                metadata: {
                    probability,
                    probabilityPercent: Math.round(probability * 100),
                    forecasters,
                    predictions: predictionCount,
                    closeTime,
                    status
                }
            };
        });

        debug(`[Metaculus] ✅ Normalized ${items.length} items`);

        return createOmniData('metaculus', 'prediction_market', { items }, 60000);
    }
};
