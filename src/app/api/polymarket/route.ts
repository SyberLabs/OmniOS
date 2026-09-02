// ============================================
// PROJECT OMNI: POLYMARKET API ROUTE
// ============================================

import { NextResponse } from 'next/server';

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function marketsFromRaw(raw: unknown): Record<string, unknown>[] {
    if (Array.isArray(raw)) return raw.filter(isRecord);
    if (isRecord(raw) && Array.isArray(raw.data)) return raw.data.filter(isRecord);
    if (isRecord(raw) && Array.isArray(raw.markets)) return raw.markets.filter(isRecord);
    return [];
}

interface MarketOutcome {
    id: string;
    name: string;
    probability: number;
}

function parseJsonArray(value: unknown): unknown[] {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed: unknown = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

function asNumber(value: unknown, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value !== '') {
        const n = parseFloat(value);
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
}

function asString(value: unknown, fallback: string): string {
    return typeof value === 'string' && value ? value : fallback;
}

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

        const rawData: unknown = await response.json();
        const marketsArray = marketsFromRaw(rawData);

        if (
            marketsArray.length === 0
            && rawData != null
            && !Array.isArray(rawData)
            && !(isRecord(rawData) && (Array.isArray(rawData.data) || Array.isArray(rawData.markets)))
        ) {
            console.warn('Unexpected Polymarket API response structure:', rawData);
        }

        const markets = marketsArray.slice(0, 50).map((market) => {
            let outcomes: MarketOutcome[] = [];

            const parsedPrices = parseJsonArray(market.outcomePrices).map(p => asNumber(p, 0.5));
            const parsedOutcomes = parseJsonArray(market.outcomes).filter((o): o is string => typeof o === 'string');

            const tokens = market.tokens;
            if (Array.isArray(tokens)) {
                outcomes = tokens.filter(isRecord).map((token, index) => ({
                    id: asString(token.token_id, `${asString(market.id, 'market')}_${index}`),
                    name: asString(token.outcome, `Outcome ${index + 1}`),
                    probability: asNumber(token.price, 0.5)
                }));
            } else if (parsedOutcomes.length > 0) {
                outcomes = parsedOutcomes.map((outcome, index) => ({
                    id: `${asString(market.id, 'market')}_${index}`,
                    name: outcome,
                    probability: parsedPrices[index] !== undefined ? parsedPrices[index] : 0.5
                }));
            } else {
                outcomes = [
                    { id: `${asString(market.id, 'market')}_0`, name: 'Yes', probability: parsedPrices[0] || 0.5 },
                    { id: `${asString(market.id, 'market')}_1`, name: 'No', probability: parsedPrices[1] || 0.5 }
                ];
            }

            const tags = Array.isArray(market.tags)
                ? market.tags.filter((t): t is string => typeof t === 'string')
                : [];

            return {
                id: asString(market.id, asString(market.condition_id, asString(market.market_slug, `market_${Date.now()}`))),
                question: asString(market.question, asString(market.title, 'Unknown Market')),
                description: asString(market.description, ''),
                outcomes,
                volume: asNumber(market.volume, asNumber(market.volumeNum, 0)),
                liquidity: asNumber(market.liquidity, 0),
                endDate: asString(
                    market.end_date_iso,
                    asString(market.endDate, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString())
                ),
                category: asString(market.category, asString(market.market_type, tags[0] || 'Uncategorized')),
                tags
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
