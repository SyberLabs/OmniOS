// ============================================
// PROJECT OMNI: WIRE SERVICE
// Manages data flow through wire connections
// ============================================

import { useBlockStore } from '../stores';
import { useWireStore } from '../stores/wireStore';

import { WireFilters, ContextSource } from '../schemas/wire.schema';
import { PolymarketMarket, NewsArticle, NewsFeed } from '../schemas/block.schema';

/**
 * Extract and format data from a block based on wire filters
 */
export function extractBlockData(
    blockId: string,
    filters: WireFilters
): string | null {
    const block = useBlockStore.getState().getBlock(blockId);
    if (!block?.data) return null;

    const data = block.data as Record<string, any>;
    let extracted = '';

    try {
        // Handle different data types
        if (data && typeof data === 'object' && 'markets' in data && Array.isArray(data.markets)) {
            // Polymarket data
            const markets = data.markets as PolymarketMarket[];
            const filtered = filters.timeWindow && filters.timeWindow !== 'all'
                ? filterByTimeWindow(markets, filters.timeWindow)
                : markets;

            if (filters.summaryOnly) {
                extracted = formatMarketsSummary(filtered);
            } else {
                extracted = formatMarketsDetailed(filtered);
            }
        } else if (data && typeof data === 'object' && 'articles' in data && Array.isArray(data.articles)) {
            // News data
            const feed = data as NewsFeed;
            const filtered = filters.timeWindow && filters.timeWindow !== 'all'
                ? filterArticlesByTimeWindow(feed.articles, filters.timeWindow)
                : feed.articles;

            if (filters.summaryOnly) {
                extracted = formatNewsSummary(filtered);
            } else {
                extracted = formatNewsDetailed(filtered);
            }
        } else if (data && typeof data === 'object' && 'poolId' in data && Array.isArray(data.entries)) {
            // Memory block — a Mind pool wired in like any other source.
            const entries = data.entries as Array<{ content: string }>;
            extracted = entries.length === 0
                ? '(No entries)'
                : entries.map(e => `- ${e.content}`).join('\n');
        } else if (data && typeof data === 'object' && 'content' in data && typeof data.content === 'string') {
            // Text block
            extracted = filters.summaryOnly
                ? data.content.slice(0, 500) + (data.content.length > 500 ? '...' : '')
                : data.content;
        } else if (data && typeof data === 'object' && 'code' in data && typeof data.code === 'string') {
            // Code block
            extracted = `\`\`\`${data.language || ''}\n${data.code}\n\`\`\``;
        } else if (data && typeof data === 'object' && 'items' in data && Array.isArray(data.items)) {
            // OmniItem[] from the gateway (polymarket, coingecko, fred, metaculus,
            // hackernews, …). The useful signal lives in each item's `metadata`
            // (probability, volume, price, value, …) — include it, don't drop it.
            const items = data.items as any[];
            if (items.length === 0) {
                extracted = '(No data)';
            } else {
                const limit = filters.summaryOnly ? 8 : 25;
                extracted = items.slice(0, limit)
                    .map(item => formatOmniItem(item))
                    .join('\n');
                if (items.length > limit) extracted += `\n… ${items.length - limit} more`;
            }
        } else if (Array.isArray(data)) {
            const first = data[0] as any;
            if (first && typeof first === 'object' && 'question' in first && 'outcomes' in first) {
                // PolymarketMarket[] (how the Polymarket block stores its data):
                // use the dedicated formatter so outcomes + volume are included.
                const markets = data as PolymarketMarket[];
                const filtered = filters.timeWindow && filters.timeWindow !== 'all'
                    ? filterByTimeWindow(markets, filters.timeWindow)
                    : markets;
                extracted = filters.summaryOnly
                    ? formatMarketsSummary(filtered)
                    : formatMarketsDetailed(filtered);
            } else if (first && typeof first === 'object' && 'metadata' in first) {
                // OmniItem[] stored directly.
                const limit = filters.summaryOnly ? 8 : 25;
                extracted = data.slice(0, limit).map(item => formatOmniItem(item)).join('\n');
                if (data.length > limit) extracted += `\n… ${data.length - limit} more`;
            } else {
                // Generic object array (e.g. crypto assets) — include key fields.
                extracted = data.slice(0, 20).map(item => {
                    if (typeof item === 'object') return formatOmniItem(item);
                    return `- ${item}`;
                }).join('\n');
                if (data.length > 20) extracted += `\n… ${data.length - 20} more items`;
            }
        } else {
            // Generic fallback
            extracted = JSON.stringify(data, null, 2).slice(0, 2000);
        }

        // Apply field filtering if specified
        if (filters.fields && filters.fields.length > 0) {
            // This would require more sophisticated field extraction
            // For now, we'll just include everything
        }

        return extracted;
    } catch (error) {
        console.error('Error extracting block data:', error);
        return null;
    }
}

/**
 * Format a single OmniItem (gateway-normalized) into a readable line with its
 * key metadata, so the LLM sees probabilities/prices/values — not just titles.
 */
function formatOmniItem(item: any): string {
    const title = item.title || item.name || item.id || 'Untitled';
    const meta = (item.metadata && typeof item.metadata === 'object') ? item.metadata : {};

    // Keys worth surfacing, in priority order, with light formatting.
    const parts: string[] = [];
    const push = (label: string, value: unknown, fmt?: (v: any) => string) => {
        if (value === undefined || value === null || value === '') return;
        parts.push(`${label}: ${fmt ? fmt(value) : value}`);
    };

    push('prob', meta.probabilityPercent ?? (typeof meta.probability === 'number' ? Math.round(meta.probability * 100) : undefined), v => `${v}%`);
    push('value', meta.value);
    push('price', meta.priceFormatted ?? meta.price);
    push('24h', meta.priceChangePercent24h ?? meta.priceChangePercent, v => `${typeof v === 'number' ? v.toFixed(2) : v}%`);
    push('vol', meta.volume, v => typeof v === 'number' ? `$${Math.round(v).toLocaleString()}` : String(v));
    push('liquidity', meta.liquidity, v => typeof v === 'number' ? `$${Math.round(v).toLocaleString()}` : String(v));
    push('forecasters', meta.forecasters);
    push('marketCapRank', meta.marketCapRank, v => `#${v}`);

    // A short description adds context for news/forecast items.
    const desc = typeof item.description === 'string' && item.description.length < 160
        ? item.description
        : undefined;

    const metaStr = parts.length > 0 ? ` (${parts.join(' | ')})` : '';
    const descStr = desc ? ` — ${desc}` : '';
    return `- ${title}${metaStr}${descStr}`;
}

/**
 * Filter markets by time window
 */
function filterByTimeWindow(
    markets: PolymarketMarket[],
    timeWindow: 'hour' | 'day' | 'week'
): PolymarketMarket[] {
    const now = Date.now();
    const cutoffs = {
        hour: now - 60 * 60 * 1000,
        day: now - 24 * 60 * 60 * 1000,
        week: now - 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = cutoffs[timeWindow];

    return markets.filter(market => {
        const endDate = new Date(market.endDate).getTime();
        return endDate >= cutoff;
    });
}

/**
 * Filter articles by time window
 */
function filterArticlesByTimeWindow(
    articles: NewsArticle[],
    timeWindow: 'hour' | 'day' | 'week'
): NewsArticle[] {
    const now = Date.now();
    const cutoffs = {
        hour: now - 60 * 60 * 1000,
        day: now - 24 * 60 * 60 * 1000,
        week: now - 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = cutoffs[timeWindow];

    return articles.filter(article => {
        const publishDate = new Date(article.publishedAt).getTime();
        return publishDate >= cutoff;
    });
}

/**
 * Format markets as summary
 */
function formatMarketsSummary(markets: PolymarketMarket[]): string {
    const lines = markets.slice(0, 5).map(market => {
        const topOutcome = market.outcomes.reduce((max, outcome) =>
            outcome.probability > max.probability ? outcome : max
        );
        return `• ${market.question.slice(0, 80)}${market.question.length > 80 ? '...' : ''}\n  → ${topOutcome.name}: ${(topOutcome.probability * 100).toFixed(1)}%`;
    });

    return `**Prediction Markets** (${markets.length} total)\n\n${lines.join('\n\n')}`;
}

/**
 * Format markets with full details
 */
function formatMarketsDetailed(markets: PolymarketMarket[]): string {
    const lines = markets.map(market => {
        const outcomes = market.outcomes
            .sort((a, b) => b.probability - a.probability)
            .map(o => `  - ${o.name}: ${(o.probability * 100).toFixed(1)}%`)
            .join('\n');

        return `**${market.question}**\n${outcomes}\nVolume: $${(market.volume / 1000).toFixed(0)}K | Ends: ${new Date(market.endDate).toLocaleDateString()}`;
    });

    return lines.join('\n\n---\n\n');
}

/**
 * Format news as summary
 */
function formatNewsSummary(articles: NewsArticle[]): string {
    const lines = articles.slice(0, 10).map(article => {
        const sentiment = article.sentiment
            ? ` [${article.sentiment === 'positive' ? '📈' : article.sentiment === 'negative' ? '📉' : '➖'}]`
            : '';
        return `• ${article.title}${sentiment}\n  ${article.source} • ${new Date(article.publishedAt).toLocaleDateString()}`;
    });

    return `**News Feed** (${articles.length} articles)\n\n${lines.join('\n\n')}`;
}

/**
 * Format news with full details
 */
function formatNewsDetailed(articles: NewsArticle[]): string {
    const lines = articles.map(article => {
        const sentiment = article.sentiment
            ? ` [Sentiment: ${article.sentiment === 'positive' ? 'Positive' : article.sentiment === 'negative' ? 'Negative' : 'Neutral'}]`
            : '';

        return `**${article.title}**${sentiment}\n${article.description || ''}\n*${article.source}* • ${new Date(article.publishedAt).toLocaleString()}\n[Read more](${article.url})`;
    });

    return lines.join('\n\n---\n\n');
}

/**
 * Aggregate context from all wires connected to a target block
 * Optionally includes Shell Mind context based on persona settings
 */
export function aggregateWireContext(targetBlockId: string): {
    context: string;
    sourceIds: string[];
    /** Everything that fed this context, wired and ambient alike. */
    sources: ContextSource[];
    lastUpdate: number;
} {
    const wires = useWireStore.getState().getWiresToBlock(targetBlockId);
    const activeWires = wires.filter(w => w.status === 'active');

    const contextParts: string[] = [];
    const sourceIds: string[] = [];
    const sources: ContextSource[] = [];

    // Add wired block data
    if (activeWires.length === 0) {
        return {
            context: 'No active data sources connected. Wire some blocks to provide context!',
            sourceIds: [],
            sources: [],
            lastUpdate: Date.now()
        };
    }

    activeWires.forEach(wire => {
        const sourceBlock = useBlockStore.getState().getBlock(wire.sourceBlockId);
        if (!sourceBlock) return;

        const data = extractBlockData(wire.sourceBlockId, wire.filters);
        if (data) {
            contextParts.push(`## ${sourceBlock.schema.display_name}\n\n${data}`);
            sourceIds.push(wire.sourceBlockId);
            sources.push({
                id: wire.sourceBlockId,
                // Recollection and live data are both wired now, but they are
                // different kinds of evidence and the answer should say which.
                kind: sourceBlock.schema.block_id === 'memory_pool' ? 'memory' : 'wire',
                label: sourceBlock.schema.display_name
            });
        }
    });

    return {
        context: contextParts.length > 0
            ? contextParts.join('\n\n═══════════════════════════════════════\n\n')
            : 'Connected sources have no data available yet.',
        sourceIds,
        sources,
        lastUpdate: Date.now()
    };
}

/**
 * Update wire status based on data availability
 */
export function updateWireStatuses() {
    const { wires, updateWireStatus } = useWireStore.getState();
    const { getBlock } = useBlockStore.getState();

    wires.forEach(wire => {
        const sourceBlock = getBlock(wire.sourceBlockId);
        const targetBlock = getBlock(wire.targetBlockId);

        if (!sourceBlock || !targetBlock) {
            updateWireStatus(wire.id, 'disconnected', 'Block not found');
            return;
        }

        if (sourceBlock.status === 'error') {
            updateWireStatus(wire.id, 'error', 'Source block has error');
            return;
        }

        if (!sourceBlock.data) {
            updateWireStatus(wire.id, 'stale', 'No data available');
            return;
        }

        // Check if data is stale (no update in 5 minutes)
        if (sourceBlock.last_updated) {
            const age = Date.now() - sourceBlock.last_updated;
            if (age > 5 * 60 * 1000) {
                updateWireStatus(wire.id, 'stale', 'Data is stale');
                return;
            }
        }

        // All good
        if (wire.status !== 'active') {
            updateWireStatus(wire.id, 'active');
        }
    });
}

/**
 * WireService class for managing wire lifecycle
 * Simplified: No polling, context updates are on-demand only
 */
export class WireService {
    /**
     * Create a wire connection
     */
    createWire(sourceBlockId: string, targetBlockId: string, filters?: Partial<WireFilters>): string {
        const wireId = useWireStore.getState().addWire(sourceBlockId, targetBlockId, filters);

        // Immediate context update for target
        this.updateTargetContext(targetBlockId);

        return wireId;
    }

    /**
     * Remove a wire connection
     */
    removeWire(wireId: string) {
        const wire = useWireStore.getState().getWire(wireId);
        if (!wire) return;

        const targetBlockId = wire.targetBlockId;
        useWireStore.getState().removeWire(wireId);

        // Update target context after removal
        this.updateTargetContext(targetBlockId);
    }

    /**
     * Manually update context for a target block
     */
    updateTargetContext(targetBlockId: string) {
        const block = useBlockStore.getState().getBlock(targetBlockId);
        if (!block) return;

        const { context, lastUpdate } = aggregateWireContext(targetBlockId);

        const currentData = block.data as any;
        useBlockStore.getState().updateData(targetBlockId, {
            ...currentData,
            currentContext: context,
            lastContextUpdate: lastUpdate
        });
    }

    /**
     * Refresh all wires for a specific source block
     * Call this when a source block's data updates
     */
    refreshWiresFromSource(sourceBlockId: string) {
        const wires = useWireStore.getState().getWiresFromBlock(sourceBlockId);
        const targetIds = new Set(wires.map(w => w.targetBlockId));

        targetIds.forEach(targetId => {
            this.updateTargetContext(targetId);
        });
    }

    /**
     * Get aggregated context for a block (for AI prompts)
     */
    getContextForBlock(blockId: string): string {
        const { context } = aggregateWireContext(blockId);
        return context;
    }
}

// Singleton instance
export const wireService = new WireService();

export default wireService;

