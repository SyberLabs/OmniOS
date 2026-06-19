// ============================================
// PROJECT OMNI: API CLIENT SERVICE
// ============================================

import { PolymarketMarket, NewsArticle } from '../schemas/block.schema';
import { useSettingsStore } from '../stores';
import { fetchMockMarkets, fetchMockNews } from '@/data/mockData';

/**
 * Fetch Polymarket data - switches between real and mock based on settings
 */
export async function fetchPolymarketData(): Promise<{
    markets: PolymarketMarket[];
    error?: string;
}> {
    const { useMockData, apiKeys } = useSettingsStore.getState();

    // Use mock data if enabled
    if (useMockData) {
        console.log('[API Service] Using mock Polymarket data');
        const markets = await fetchMockMarkets();
        return { markets };
    }

    // Call our Next.js API route
    try {
        const response = await fetch('/api/polymarket', {
            headers: {
                'Content-Type': 'application/json',
                ...(apiKeys.polymarket && { 'x-api-key': apiKeys.polymarket })
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch Polymarket data');
        }

        console.log('[API Service] Fetched real Polymarket data:', data.markets.length, 'markets');
        return { markets: data.markets };

    } catch (error) {
        console.error('[API Service] Polymarket API error:', error);

        // Fallback to mock data on error
        console.log('[API Service] Falling back to mock data');
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
    const { useMockData, apiKeys } = useSettingsStore.getState();

    // Use mock data if enabled
    if (useMockData) {
        console.log('[API Service] Using mock News data');
        const articles = await fetchMockNews();
        return { articles };
    }

    // Check if API key is configured
    if (!apiKeys.newsapi || apiKeys.newsapi === 'NEWSAPI_KEY_PLACEHOLDER') {
        console.warn('[API Service] NewsAPI key not configured, using mock data');
        const articles = await fetchMockNews();
        return {
            articles,
            error: 'NewsAPI key not configured'
        };
    }

    // Call our Next.js API route
    try {
        const params = new URLSearchParams();
        if (options?.query) params.append('query', options.query);
        if (options?.category) params.append('category', options.category);

        const response = await fetch(`/api/news?${params.toString()}`, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKeys.newsapi
            }
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Failed to fetch news data');
        }

        console.log('[API Service] Fetched real News data:', data.articles.length, 'articles');
        return { articles: data.articles };

    } catch (error) {
        console.error('[API Service] NewsAPI error:', error);

        // Fallback to mock data on error
        console.log('[API Service] Falling back to mock data');
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
 * Test NewsAPI connection with API key
 */
export async function testNewsConnection(apiKey: string): Promise<{
    success: boolean;
    error?: string;
}> {
    try {
        const response = await fetch('/api/news?query=test', {
            headers: {
                'x-api-key': apiKey
            }
        });
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
