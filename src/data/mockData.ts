// ============================================
// PROJECT OMNI: MOCK DATA FOR DEVELOPMENT
// ============================================

import { PolymarketMarket, NewsArticle } from '../core/schemas/block.schema';

/**
 * Mock Polymarket markets for development
 */
export const MOCK_POLYMARKET_MARKETS: PolymarketMarket[] = [
    {
        id: 'pm_1',
        question: 'Will AI achieve human-level reasoning by 2027?',
        description: 'This market resolves YES if a major AI lab demonstrates human-level reasoning capabilities.',
        outcomes: [
            { id: 'yes_1', name: 'Yes', probability: 0.42 },
            { id: 'no_1', name: 'No', probability: 0.58 }
        ],
        volume: 2500000,
        liquidity: 850000,
        endDate: '2027-12-31',
        category: 'Technology',
        tags: ['AI', 'AGI', 'technology', 'prediction']
    },
    {
        id: 'pm_2',
        question: 'Bitcoin above $150,000 by end of 2026?',
        description: 'Market resolves YES if BTC trades above $150,000 on any major exchange.',
        outcomes: [
            { id: 'yes_2', name: 'Yes', probability: 0.35 },
            { id: 'no_2', name: 'No', probability: 0.65 }
        ],
        volume: 8500000,
        liquidity: 2100000,
        endDate: '2026-12-31',
        category: 'Crypto',
        tags: ['bitcoin', 'crypto', 'finance']
    },
    {
        id: 'pm_3',
        question: 'SpaceX Starship reaches orbit before July 2026?',
        description: 'Resolves YES if Starship completes a full orbital mission.',
        outcomes: [
            { id: 'yes_3', name: 'Yes', probability: 0.78 },
            { id: 'no_3', name: 'No', probability: 0.22 }
        ],
        volume: 1200000,
        liquidity: 450000,
        endDate: '2026-07-01',
        category: 'Space',
        tags: ['space', 'SpaceX', 'rockets']
    },
    {
        id: 'pm_4',
        question: 'US enters recession in 2026?',
        description: 'NBER official recession declaration required for YES resolution.',
        outcomes: [
            { id: 'yes_4', name: 'Yes', probability: 0.28 },
            { id: 'no_4', name: 'No', probability: 0.72 }
        ],
        volume: 4200000,
        liquidity: 1800000,
        endDate: '2026-12-31',
        category: 'Economics',
        tags: ['economy', 'recession', 'macro']
    },
    {
        id: 'pm_5',
        question: 'First commercial fusion power by 2030?',
        description: 'A fusion reactor delivers electricity to a commercial grid.',
        outcomes: [
            { id: 'yes_5', name: 'Yes', probability: 0.15 },
            { id: 'no_5', name: 'No', probability: 0.85 }
        ],
        volume: 950000,
        liquidity: 320000,
        endDate: '2030-12-31',
        category: 'Energy',
        tags: ['energy', 'fusion', 'technology']
    }
];

/**
 * Mock news articles for development
 */
export const MOCK_NEWS_ARTICLES: NewsArticle[] = [
    {
        id: 'news_1',
        title: 'AI Breakthrough: New Model Achieves Record Reasoning Scores',
        description: 'Researchers announce a significant advancement in AI reasoning capabilities, with implications for prediction markets.',
        source: 'TechCrunch',
        author: 'Sarah Chen',
        url: 'https://example.com/ai-breakthrough',
        imageUrl: 'https://picsum.photos/seed/ai1/800/450',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        sentiment: 'positive'
    },
    {
        id: 'news_2',
        title: 'Global Markets React to Central Bank Policy Shift',
        description: 'Major central banks signal coordinated approach to inflation, causing volatility across equity and crypto markets.',
        source: 'Reuters',
        author: 'Michael Torres',
        url: 'https://example.com/markets-react',
        imageUrl: 'https://picsum.photos/seed/markets/800/450',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        sentiment: 'neutral'
    },
    {
        id: 'news_3',
        title: 'SpaceX Announces Next Starship Test Flight Window',
        description: 'The aerospace company targets next month for another orbital attempt, following successful booster recovery.',
        source: 'Space News',
        author: 'Emily Wright',
        url: 'https://example.com/spacex-update',
        imageUrl: 'https://picsum.photos/seed/space/800/450',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        sentiment: 'positive'
    },
    {
        id: 'news_4',
        title: 'Energy Sector Sees Record Investment in Fusion Research',
        description: 'Private capital flows into fusion startups reach all-time high as breakthrough seems increasingly likely.',
        source: 'Bloomberg',
        author: 'James Wilson',
        url: 'https://example.com/fusion-investment',
        imageUrl: 'https://picsum.photos/seed/energy/800/450',
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        sentiment: 'positive'
    },
    {
        id: 'news_5',
        title: 'Economic Indicators Show Mixed Signals for Q2',
        description: 'Latest data presents conflicting picture of economic health, with strong employment but weakening consumer spending.',
        source: 'Financial Times',
        author: 'Rebecca Adams',
        url: 'https://example.com/economic-indicators',
        imageUrl: 'https://picsum.photos/seed/econ/800/450',
        publishedAt: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString(),
        sentiment: 'neutral'
    },
    {
        id: 'news_6',
        title: 'Geopolitical Tensions Rise in South China Sea',
        description: 'Naval activities increase as regional powers respond to territorial disputes, impacting shipping routes.',
        source: 'AP News',
        author: 'David Kim',
        url: 'https://example.com/geopolitical',
        imageUrl: 'https://picsum.photos/seed/geo/800/450',
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        sentiment: 'negative'
    }
];

/**
 * Simulate real-time probability updates
 */
export function generateProbabilityUpdate(currentProbability: number): number {
    const change = (Math.random() - 0.5) * 0.04; // ±2% max change
    const newProbability = currentProbability + change;
    return Math.max(0.01, Math.min(0.99, newProbability));
}

/**
 * Simulate fetching markets with delay
 */
export async function fetchMockMarkets(): Promise<PolymarketMarket[]> {
    await new Promise(resolve => setTimeout(resolve, 500));

    // Add some randomization to probabilities
    return MOCK_POLYMARKET_MARKETS.map(market => ({
        ...market,
        outcomes: market.outcomes.map(outcome => ({
            ...outcome,
            probability: generateProbabilityUpdate(outcome.probability)
        }))
    }));
}

/**
 * Simulate fetching news with delay
 */
export async function fetchMockNews(): Promise<NewsArticle[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return MOCK_NEWS_ARTICLES;
}
