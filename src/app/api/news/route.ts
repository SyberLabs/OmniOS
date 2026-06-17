// ============================================
// PROJECT OMNI: NEWS API ROUTE
// ============================================

import { NextRequest, NextResponse } from 'next/server';

/**
 * News API endpoint
 * GET /api/news?query=technology
 */
export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('x-api-key');
        const searchParams = request.nextUrl.searchParams;
        const query = searchParams.get('query') || 'technology';
        const category = searchParams.get('category');
        const language = searchParams.get('language') || 'en';

        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'API key required. Please configure your NewsAPI key in settings.',
                    timestamp: Date.now()
                },
                { status: 401 }
            );
        }

        // Build NewsAPI request
        const params = new URLSearchParams({
            q: query,
            language,
            sortBy: 'publishedAt',
            pageSize: '20'
        });

        if (category) {
            params.append('category', category);
        }

        const response = await fetch(
            `https://newsapi.org/v2/everything?${params.toString()}`,
            {
                headers: {
                    'X-Api-Key': apiKey
                }
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `NewsAPI error: ${response.statusText}`);
        }

        const data = await response.json();

        // Transform NewsAPI data to our schema
        const articles = data.articles?.map((article: any, index: number) => ({
            id: `news_${Date.now()}_${index}`,
            title: article.title || 'Untitled',
            description: article.description || '',
            source: article.source?.name || 'Unknown',
            author: article.author || 'Unknown',
            url: article.url || '',
            imageUrl: article.urlToImage || null,
            publishedAt: article.publishedAt || new Date().toISOString(),
            sentiment: determineSentiment(article.title, article.description)
        })) || [];

        return NextResponse.json({
            success: true,
            articles,
            totalResults: data.totalResults || 0,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('NewsAPI error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: Date.now()
            },
            { status: 500 }
        );
    }
}

/**
 * Basic sentiment analysis from title/description keywords
 */
function determineSentiment(title: string, description: string): 'positive' | 'negative' | 'neutral' {
    const text = `${title} ${description}`.toLowerCase();

    const positiveWords = ['growth', 'success', 'breakthrough', 'rise', 'gains', 'win', 'boom', 'surge', 'rally'];
    const negativeWords = ['crisis', 'crash', 'decline', 'fall', 'loss', 'failure', 'risk', 'threat', 'concern'];

    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
}
