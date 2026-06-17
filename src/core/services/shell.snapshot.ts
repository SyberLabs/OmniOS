// ============================================
// PROJECT OMNI: SHELL SNAPSHOT SERVICE
// Captures complete state of the Shell for Mind analysis
// ============================================

import { useBlockStore, useMindStore } from '@/core/stores';
import { BlockInstance } from '@/core/schemas/block.schema';
import { ContextEntry } from '@/core/schemas/mind.schema';

/**
 * Complete snapshot of the Shell's current state
 */
export interface ShellSnapshot {
    /** Timestamp when snapshot was taken */
    timestamp: number;

    /** Total number of blocks on canvas */
    totalBlocks: number;

    /** All block instances with their data */
    blocks: BlockSnapshotData[];

    /** Pinned/focused blocks (high priority) */
    focusedBlocks: ContextEntry[];

    /** Current observations from awareness */
    observations: ContextEntry[];

    /** Canvas connections */
    connections: {
        sourceBlockId: string;
        targetBlockId: string;
    }[];

    /** Summary statistics */
    stats: {
        connectedBlocks: number;
        disconnectedBlocks: number;
        errorBlocks: number;
        blocksByCategory: Record<string, number>;
        dataAge: {
            newest: number | null;
            oldest: number | null;
        };
    };
}

/**
 * Snapshot data for a single block
 */
export interface BlockSnapshotData {
    /** Instance ID */
    instanceId: string;

    /** Block type */
    blockType: string;

    /** Display name */
    displayName: string;

    /** Category (truth, pulse, physicality, model) */
    category: string;

    /** Connection status */
    status: string;

    /** Position on canvas */
    position: { x: number; y: number };

    /** Dimensions */
    dimensions: { width: number; height: number };

    /** Last updated timestamp */
    lastUpdated: number | null;

    /** Whether this block is pinned */
    isPinned: boolean;

    /** Raw data payload */
    data: unknown;

    /** Human-readable summary of the data */
    summary: string;

    /** Key metrics extracted from the data */
    keyMetrics: string[];

    /** Error message if any */
    error?: string;
}

/**
 * Capture a complete snapshot of the current Shell state
 */
export function captureShellSnapshot(): ShellSnapshot {
    const blockStore = useBlockStore.getState();
    const mindStore = useMindStore.getState();

    const { blocks, connections } = blockStore;
    const { contextPools, isPinned } = mindStore;

    // Get focused blocks
    const focusPool = contextPools.find(p => p.id === 'focus');
    const focusedBlocks = focusPool?.entries || [];

    // Get observations
    const observationsPool = contextPools.find(p => p.id === 'observations');
    const observations = observationsPool?.entries || [];

    // Process each block
    const blockSnapshots: BlockSnapshotData[] = blocks.map(block => ({
        instanceId: block.instance_id,
        blockType: block.schema.block_id,
        displayName: block.schema.display_name,
        category: block.schema.category,
        status: block.status,
        position: block.position,
        dimensions: block.dimensions,
        lastUpdated: block.last_updated,
        isPinned: isPinned(block.instance_id),
        data: block.data,
        summary: summarizeBlockData(block),
        keyMetrics: extractKeyMetrics(block),
        error: block.error
    }));

    // Calculate stats
    const stats = calculateShellStats(blocks);

    return {
        timestamp: Date.now(),
        totalBlocks: blocks.length,
        blocks: blockSnapshots,
        focusedBlocks,
        observations: observations.slice(-20), // Last 20 observations
        connections: connections.map(c => ({
            sourceBlockId: c.sourceBlockId,
            targetBlockId: c.targetBlockId
        })),
        stats
    };
}

/**
 * Summarize a block's data in human-readable format
 */
function summarizeBlockData(block: BlockInstance): string {
    const blockType = block.schema.block_id;
    const data = block.data;

    if (!data) {
        return `No data loaded`;
    }

    switch (blockType) {
        case 'polymarket': {
            const markets = data as Array<{
                question: string;
                outcomes: Array<{ name: string; probability: number }>;
                volume?: number;
            }>;
            if (!markets || !markets.length) return 'No markets loaded';

            const market = markets[0];
            const topOutcome = market.outcomes?.[0];
            return `"${market.question}" - ${topOutcome?.name}: ${(topOutcome?.probability * 100).toFixed(1)}%${market.volume ? ` | Vol: $${(market.volume / 1000).toFixed(0)}k` : ''}`;
        }

        case 'newsapi': {
            const articles = data as Array<{
                title: string;
                source: { name: string };
                sentiment?: string;
            }>;
            if (!articles || !articles.length) return 'No articles loaded';

            const sentiments = articles.map(a => a.sentiment).filter(Boolean);
            const sentimentCounts = sentiments.reduce((acc, s) => {
                acc[s!] = (acc[s!] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return `${articles.length} articles | Latest: "${articles[0]?.title.slice(0, 60)}..." (${articles[0]?.source?.name})${Object.keys(sentimentCounts).length ? ` | Sentiment: ${Object.entries(sentimentCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}` : ''}`;
        }

        case 'tradingview': {
            const d = data as Record<string, any>;
            if (d.symbol) {
                return `Chart: ${d.symbol} - ${d.interval || '1D'} timeframe${d.price ? ` | Price: $${d.price}` : ''}`;
            }
            return 'No symbol configured';
        }

        case 'gdelt': {
            const events = (data as any).events;
            if (!events || !events.length) return 'No events loaded';

            const categories = [...new Set(events.slice(0, 10).map((e: any) => e.category))];
            return `${events.length} global events | Categories: ${categories.slice(0, 3).join(', ')}${categories.length > 3 ? '...' : ''}`;
        }

        case 'persona_analyst':
        case 'persona_strategist':
        case 'persona_oracle':
        case 'persona_guardian': {
            const messages = (data as any)?.messages;
            if (!messages || !messages.length) return 'No conversation yet';
            return `${messages.length} messages in conversation`;
        }

        default: {
            // Generic handling
            if (Array.isArray(data)) {
                return `${data.length} items loaded`;
            } else if (typeof data === 'object' && data !== null) {
                const keys = Object.keys(data);
                return `${keys.length} data fields: ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}`;
            }
            return 'Data loaded';
        }
    }
}

/**
 * Extract key metrics from block data
 */
function extractKeyMetrics(block: BlockInstance): string[] {
    const metrics: string[] = [];
    const blockType = block.schema.block_id;
    const data = block.data;

    if (!data) return metrics;

    switch (blockType) {
        case 'polymarket': {
            const markets = data as Array<{
                outcomes: Array<{ name: string; probability: number }>;
                volume?: number;
            }>;
            if (markets && markets.length > 0) {
                const market = markets[0];
                const topOutcome = market.outcomes?.[0];
                if (topOutcome) {
                    metrics.push(`${topOutcome.name}: ${(topOutcome.probability * 100).toFixed(1)}%`);
                }
                if (market.volume) {
                    metrics.push(`Vol: $${(market.volume / 1000).toFixed(0)}k`);
                }
            }
            break;
        }

        case 'newsapi': {
            const articles = data as Array<{ sentiment?: string }>;
            if (articles && articles.length > 0) {
                metrics.push(`${articles.length} articles`);
                const sentiments = articles.map(a => a.sentiment).filter(Boolean);
                if (sentiments.length > 0) {
                    const positive = sentiments.filter(s => s === 'positive').length;
                    const negative = sentiments.filter(s => s === 'negative').length;
                    metrics.push(`+${positive}/-${negative}`);
                }
            }
            break;
        }

        case 'tradingview': {
            const d = data as Record<string, any>;
            if (d.price) metrics.push(`$${d.price}`);
            if (d.change) metrics.push(`${d.change > 0 ? '+' : ''}${d.change.toFixed(2)}%`);
            break;
        }
    }

    return metrics;
}

/**
 * Calculate statistics about the Shell state
 */
function calculateShellStats(blocks: BlockInstance[]) {
    const stats = {
        connectedBlocks: 0,
        disconnectedBlocks: 0,
        errorBlocks: 0,
        blocksByCategory: {} as Record<string, number>,
        dataAge: {
            newest: null as number | null,
            oldest: null as number | null
        }
    };

    for (const block of blocks) {
        // Count by status
        if (block.status === 'connected') stats.connectedBlocks++;
        else if (block.status === 'disconnected') stats.disconnectedBlocks++;
        else if (block.status === 'error') stats.errorBlocks++;

        // Count by category
        const cat = block.schema.category;
        stats.blocksByCategory[cat] = (stats.blocksByCategory[cat] || 0) + 1;

        // Track data age
        if (block.last_updated) {
            if (!stats.dataAge.newest || block.last_updated > stats.dataAge.newest) {
                stats.dataAge.newest = block.last_updated;
            }
            if (!stats.dataAge.oldest || block.last_updated < stats.dataAge.oldest) {
                stats.dataAge.oldest = block.last_updated;
            }
        }
    }

    return stats;
}

/**
 * Format snapshot into LLM-friendly context string
 */
export function formatSnapshotForLLM(snapshot: ShellSnapshot): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('SHELL LANDSCAPE SNAPSHOT');
    lines.push(`Captured at: ${new Date(snapshot.timestamp).toLocaleString()}`);
    lines.push('='.repeat(60));
    lines.push('');

    // Overview
    lines.push('## OVERVIEW');
    lines.push(`Total Blocks: ${snapshot.totalBlocks}`);
    lines.push(`Connected: ${snapshot.stats.connectedBlocks} | Disconnected: ${snapshot.stats.disconnectedBlocks} | Errors: ${snapshot.stats.errorBlocks}`);
    lines.push(`Categories: ${Object.entries(snapshot.stats.blocksByCategory).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
    if (snapshot.stats.dataAge.newest) {
        const age = Date.now() - snapshot.stats.dataAge.newest;
        lines.push(`Data Freshness: ${Math.floor(age / 1000)}s ago`);
    }
    lines.push('');

    // Focused blocks (highest priority)
    if (snapshot.focusedBlocks.length > 0) {
        lines.push('## FOCUSED BLOCKS (📌 Pinned for Deep Analysis)');
        lines.push('');
        for (const entry of snapshot.focusedBlocks) {
            lines.push(entry.content);
            lines.push('');
        }
        lines.push('-'.repeat(60));
        lines.push('');
    }

    // All blocks
    lines.push('## ALL BLOCKS ON CANVAS');
    lines.push('');

    // Group blocks by category
    const blocksByCategory: Record<string, BlockSnapshotData[]> = {};
    for (const block of snapshot.blocks) {
        if (!blocksByCategory[block.category]) {
            blocksByCategory[block.category] = [];
        }
        blocksByCategory[block.category].push(block);
    }

    for (const [category, categoryBlocks] of Object.entries(blocksByCategory)) {
        lines.push(`### ${category.toUpperCase()} (${categoryBlocks.length})`);
        lines.push('');

        for (const block of categoryBlocks) {
            const pinIcon = block.isPinned ? '📌 ' : '';
            const statusIcon = block.status === 'connected' ? '🟢' : block.status === 'error' ? '🔴' : '⚪';

            lines.push(`${pinIcon}${statusIcon} **${block.displayName}** (${block.blockType})`);
            lines.push(`   Summary: ${block.summary}`);

            if (block.keyMetrics.length > 0) {
                lines.push(`   Metrics: ${block.keyMetrics.join(' | ')}`);
            }

            if (block.error) {
                lines.push(`   ⚠️ Error: ${block.error}`);
            }

            if (block.lastUpdated) {
                const age = Date.now() - block.lastUpdated;
                lines.push(`   Last updated: ${Math.floor(age / 1000)}s ago`);
            }

            lines.push('');
        }
    }

    // Recent observations
    if (snapshot.observations.length > 0) {
        lines.push('-'.repeat(60));
        lines.push('');
        lines.push('## RECENT OBSERVATIONS');
        lines.push('');
        for (const obs of snapshot.observations.slice(-10)) {
            lines.push(`[${obs.type}] ${obs.content.slice(0, 200)}${obs.content.length > 200 ? '...' : ''}`);
        }
        lines.push('');
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
}
