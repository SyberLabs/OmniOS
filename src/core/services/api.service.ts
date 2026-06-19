// ============================================
// PROJECT OMNI: API CLIENT SERVICE
// ============================================

import { PolymarketMarket, NewsArticle } from '../schemas/block.schema';
import { useSettingsStore } from '../stores';
import { fetchMockMarkets, fetchMockNews } from '@/data/mockData';
import { debug } from '@/core/debug';

/**
 * Fetch Polymarket data - switches between real and mock based on settings
 */
export async function fetchPolymarketData(): Promise<{
    markets: PolymarketMarket[];
    error?: string;
}> {
    const { useMockData } = useSettingsStore.getState();

    // Use mock data if enabled
    if (useMockData) {
        debug('[API Service] Using mock Polymarket data');
        const markets = await fetchMockMarkets();
        return { markets };
    }

    // Call our Next.js API route (Polymarket's public Gamma API needs no key).
    try {
        const response = await fetch('/api/polymarket', {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch Polymarket data');
        }

        debug('[API Service] Fetched real Polymarket data:', data.markets.length, 'markets');
        return { markets: data.markets };

    } catch (error) {
        console.error('[API Service] Polymarket API error:', error);

        // Fallback to mock data on error
        debug('[API Service] Falling back to mock data');
        const markets = await fetchMockMarkets();
        return {
            markets,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Fetch News data - switches between real and mock based on settings
 */
export async function fetchNewsData(options?: {
    query?: string;
    category?: string;
}): Promise<{
    articles: NewsArticle[];
    error?: string;
}> {
    const { useMockData } = useSettingsStore.getState();

    // Use mock data if enabled
    if (useMockData) {
        debug('[API Service] Using mock News data');
        const articles = await fetchMockNews();
        return { articles };
    }

    // Call our Next.js API route. The NewsAPI key lives server-side (process.env);
    // the client never sends it. If unconfigured the route returns 503 and we
    // fall back to mock data below.
    try {
        const params = new URLSearchParams();
        if (options?.query) params.append('query', options.query);
        if (options?.category) params.append('category', options.category);

        const response = await fetch(`/api/news?${params.toString()}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch news data');
        }

        debug('[API Service] Fetched real News data:', data.articles.length, 'articles');
        return { articles: data.articles };

    } catch (error) {
        console.error('[API Service] NewsAPI error:', error);

        // Fallback to mock data on error
        debug('[API Service] Falling back to mock data');
        const articles = await fetchMockNews();
        return {
            articles,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Test API connection
 */
export async function testPolymarketConnection(): Promise<boolean> {
    try {
        const response = await fetch('/api/polymarket');
        const data = await response.json();
        return data.success;
    } catch {
        return false;
    }
}

/**
 * Test NewsAPI connection. The key is read server-side from process.env;
 * the client sends no key. A 503 indicates the server is missing NEWSAPI_KEY.
 */
export async function testNewsConnection(): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const response = await fetch('/api/news?query=test');
        const data = await response.json();

        return {
            success: data.success,
            error: data.error
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Connection failed'
        };
    }
}
