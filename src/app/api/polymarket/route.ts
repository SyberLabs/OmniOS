// ============================================
// PROJECT OMNI: POLYMARKET API ROUTE
// ============================================

import { NextResponse } from 'next/server';


/**
 * Polymarket API endpoint
 * GET /api/polymarket
 */
export async function GET() {
    try {
        // Try Polymarket's Gamma API - sorted by volume for most active markets
        const response = await fetch('https://gamma-api.polymarket.com/markets?limit=50&closed=false&order=volumeNum&ascending=false', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            // If Gamma API fails, return empty array (client will use mock data)
            console.log('[Polymarket API] API returned', response.status, '- client will use mock data');
            return NextResponse.json({
                success: true,
                markets: [],
                timestamp: Date.now()
            });
        }

        const rawData = await response.json();

        // Handle both array and object responses
        let marketsArray: any[] = [];
        if (Array.isArray(rawData)) {
            marketsArray = rawData;
        } else if (rawData.data && Array.isArray(rawData.data)) {
            marketsArray = rawData.data;
        } else if (rawData.markets && Array.isArray(rawData.markets)) {
            marketsArray = rawData.markets;
        } else {
            // If API structure is unexpected, log it and return empty
            console.warn('Unexpected Polymarket API response structure:', rawData);
            marketsArray = [];
        }

        // Transform Polymarket data to our schema
        const markets = marketsArray
            .slice(0, 50)
            .map((market: any) => {
                // Handle different outcome formats
                let outcomes: any[] = [];

                // Parse outcomePrices - Gamma API returns JSON string like "[0.65, 0.35]"
                let parsedPrices: number[] = [];
                if (market.outcomePrices) {
                    try {
                        parsedPrices = typeof market.outcomePrices === 'string'
                            ? JSON.parse(market.outcomePrices)
                            : market.outcomePrices;
                    } catch {
                        console.log('[Polymarket API] Could not parse outcomePrices:', market.outcomePrices);
                    }
                }

                // Parse outcomes - Gamma API returns JSON string like '["Yes","No"]'
                let parsedOutcomes: string[] = [];
                if (market.outcomes) {
                    try {
                        parsedOutcomes = typeof market.outcomes === 'string'
                            ? JSON.parse(market.outcomes)
                            : market.outcomes;
                    } catch {
                        console.log('[Polymarket API] Could not parse outcomes:', market.outcomes);
                    }
                }

                // Try tokens format (CLOB API)
                if (market.tokens && Array.isArray(market.tokens)) {
                    outcomes = market.tokens.map((token: any, index: number) => ({
                        id: token.token_id || `${market.id}_${index}`,
                        name: token.outcome || `Outcome ${index + 1}`,
                        probability: parseFloat(token.price || '0.5')
                    }));
                }
                // Use parsed outcomes with prices (Gamma API)
                else if (parsedOutcomes.length > 0) {
                    outcomes = parsedOutcomes.map((outcome: string, index: number) => ({
                        id: `${market.id}_${index}`,
                        name: outcome,
                        probability: parsedPrices[index] !== undefined ? parsedPrices[index] : 0.5
                    }));
                }
                // Default Yes/No format
                else {
                    outcomes = [
                        { id: `${market.id}_0`, name: 'Yes', probability: parsedPrices[0] || 0.5 },
                        { id: `${market.id}_1`, name: 'No', probability: parsedPrices[1] || 0.5 }
                    ];
                }

                return {
                    id: market.id || market.condition_id || market.market_slug || `market_${Date.now()}`,
                    question: market.question || market.title || 'Unknown Market',
                    description: market.description || '',
                    outcomes,
                    volume: parseFloat(market.volume || market.volumeNum || '0'),
                    liquidity: parseFloat(market.liquidity || '0'),
                    endDate: market.end_date_iso || market.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    category: market.category || market.market_type || market.tags?.[0] || 'Uncategorized',
                    tags: market.tags || []
                };
            });

        return NextResponse.json({
            success: true,
            markets,
            timestamp: Date.now()
        });

    } catch (error) {
        // Log but don't fail - return empty array so client uses mock data
        console.log('[Polymarket API] Fetch failed, client will use mock data:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({
            success: true,
            markets: [],
            timestamp: Date.now()
        });
    }
}
