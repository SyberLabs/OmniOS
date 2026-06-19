// ============================================
// PROJECT OMNI: NEWSAPI NORMALIZER
// Converts NewsAPI responses to OmniData
// ============================================

import {
    ApiTypeDefinition,
    OmniData,
    OmniItem,
    createOmniData,
    createOmniError
} from '../omnidata.schema';

/**
 * Raw NewsAPI article
 */
interface NewsApiRawArticle {
    source?: { id?: string; name?: string };
    author?: string;
    title?: string;
    description?: string;
    url?: string;
    urlToImage?: string;
    publishedAt?: string;
    content?: string;
}

interface NewsApiRawResponse {
    status: string;
    totalResults?: number;
    articles?: NewsApiRawArticle[];
    code?: string;
    message?: string;
}

/**
 * NewsAPI normalizer
 */
export const newsapiNormalizer: ApiTypeDefinition<NewsApiRawResponse> = {
    category: 'news',
    displayName: 'NewsAPI',
    cacheTtlMs: 5 * 60 * 1000,  // 5 minutes cache
    rateLimitMs: 2 * 1000,     // 2 seconds between calls (free tier is limited)

    fetchFn: async (apiKey, params) => {
        if (!apiKey) {
            return {
                status: 'error',
                code: 'NO_API_KEY',
                message: 'NewsAPI requires an API key. Add one in the API Dashboard.'
            };
        }

        const query = (params?.query as string) || 'technology';
        const pageSize = (params?.pageSize as number) || 20;
        const country = (params?.country as string) || 'us';
        const endpoint = (params?.endpoint as string) || 'top-headlines';

        try {
            let url: string;

            if (endpoint === 'everything') {
                url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=${pageSize}&apiKey=${apiKey}`;
            } else {
                url = `https://newsapi.org/v2/top-headlines?country=${country}&pageSize=${pageSize}&apiKey=${apiKey}`;
                if (query && query !== 'technology') {
                    url += `&q=${encodeURIComponent(query)}`;
                }
            }

            const response = await fetch(url);
            const data = await response.json();

            return data;
        } catch (error) {
            return {
                status: 'error',
                code: 'FETCH_ERROR',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    },

    normalizeFn: (raw) => {
        if (raw.status === 'error' || raw.code) {
            return createOmniError('newsapi', 'news', {
                code: raw.code || 'API_ERROR',
                message: raw.message || 'Unknown NewsAPI error',
                retryable: raw.code !== 'NO_API_KEY'
            });
        }

        const articles = raw.articles || [];

        const items: OmniItem[] = articles.map((article, index) => ({
            id: `newsapi-${Date.now()}-${index}`,
            title: article.title || 'Untitled Article',
            description: article.description,
            url: article.url,
            image: article.urlToImage,
            timestamp: article.publishedAt ? new Date(article.publishedAt).getTime() : Date.now(),
            tags: ['news', article.source?.name].filter(Boolean) as string[],
            metadata: {
                source: article.source?.name,
                sourceId: article.source?.id,
                author: article.author,
                content: article.content?.slice(0, 500)
            }
        }));

        return createOmniData('newsapi', 'news', { items }, 5 * 60 * 1000);
    }
};

export default newsapiNormalizer;
