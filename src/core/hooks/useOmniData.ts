// ============================================
// PROJECT OMNI: USE OMNI DATA HOOK
// React hook for subscribing to API Gateway data
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { apiGateway, OmniData, OmniItem } from '../gateway';
import { useApiStore } from '../stores/apiStore';

interface UseOmniDataOptions {
    /** Fetch immediately on mount */
    immediate?: boolean;

    /** Parameters for the API call */
    params?: Record<string, unknown>;

    /** Auto-refresh interval in milliseconds */
    refreshInterval?: number;
}

interface UseOmniDataResult {
    /** The normalized data */
    data: OmniData | null;

    /** Just the items array for convenience */
    items: OmniItem[];

    /** Loading state */
    isLoading: boolean;

    /** Error message if any */
    error: string | null;

    /** Manually refresh */
    refresh: () => Promise<void>;

    /** Whether data is from cache */
    fromCache: boolean;
}

/**
 * Hook for consuming data from the API Gateway
 * 
 * @param apiId - The API to subscribe to
 * @param blockId - The block using this hook (for subscription tracking)
 * @param options - Configuration options
 */
export function useOmniData(
    apiId: string,
    blockId: string,
    options: UseOmniDataOptions = {}
): UseOmniDataResult {
    const { immediate = true, params, refreshInterval } = options;

    const [data, setData] = useState<OmniData | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const getApiKey = useApiStore(state => state.getApiKey);

    const refresh = useCallback(async () => {
        setIsLoading(true);

        const apiKey = getApiKey(apiId);
        if (apiKey) {
            apiGateway.setApiKey(apiId, apiKey);
        }

        try {
            const result = await apiGateway.fetch(apiId, params);
            setData(result);
        } catch (err) {
            console.error(`[useOmniData] Failed to fetch ${apiId}:`, err);
        } finally {
            setIsLoading(false);
        }
    }, [apiId, params, getApiKey]);

    // Subscribe to updates
    useEffect(() => {
        const unsubscribe = apiGateway.subscribe(apiId, blockId, (newData) => {
            setData(newData);
            setIsLoading(false);
        });

        // Fetch immediately if requested
        if (immediate) {
            refresh();
        }

        // Auto-refresh interval
        let intervalId: NodeJS.Timeout | null = null;
        if (refreshInterval && refreshInterval > 0) {
            intervalId = setInterval(refresh, refreshInterval);
        }

        return () => {
            unsubscribe();
            if (intervalId) clearInterval(intervalId);
        };
    }, [apiId, blockId, immediate, refresh, refreshInterval]);

    return {
        data,
        items: data?.items || [],
        isLoading,
        error: data?.error?.message || null,
        refresh,
        fromCache: data?.source?.fromCache || false
    };
}

export default useOmniData;
