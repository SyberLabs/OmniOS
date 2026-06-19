// ============================================
// PROJECT OMNI: BLOCK REGISTRY
// ============================================

import { OmniBlockSchema, BlockCategory } from '../schemas/block.schema';
import { createJsonOutputPort, createAnyInputPort, createTextOutputPort } from '../services/port.service';
import { HEALTH_BLOCKS } from '../blocks/health.blocks';
import { CAREER_BLOCKS } from '../blocks/career.blocks';
import { FINANCE_BLOCKS } from '../blocks/finance.blocks';
import { MIND_BLOCKS } from '../blocks/mind.blocks';
import { RELATIONSHIPS_BLOCKS } from '../blocks/relationships.blocks';
import { ENVIRONMENT_BLOCKS } from '../blocks/environment.blocks';
import { TIME_BLOCKS } from '../blocks/time.blocks';

/**
 * Registry of all available block types
 * New blocks are registered here to appear in the Armory
 */
class BlockRegistry {
    private blocks: Map<string, OmniBlockSchema> = new Map();

    /**
     * Register a new block type
     */
    register(schema: OmniBlockSchema): void {
        if (this.blocks.has(schema.block_id)) {
            console.warn(`Block ${schema.block_id} is already registered. Overwriting.`);
        }
        this.blocks.set(schema.block_id, schema);
    }

    /**
     * Get a block schema by ID
     */
    get(blockId: string): OmniBlockSchema | undefined {
        return this.blocks.get(blockId);
    }

    /**
     * Get all registered blocks
     */
    getAll(): OmniBlockSchema[] {
        return Array.from(this.blocks.values());
    }

    /**
     * Get blocks by category
     */
    getByCategory(category: BlockCategory): OmniBlockSchema[] {
        return this.getAll().filter(block => block.category === category);
    }

    /**
     * Search blocks by semantic tags or name
     */
    search(query: string): OmniBlockSchema[] {
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(block =>
            block.display_name.toLowerCase().includes(lowerQuery) ||
            block.semantic_tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
            block.description?.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Check if a block is registered
     */
    has(blockId: string): boolean {
        return this.blocks.has(blockId);
    }

    /**
     * Remove a block from the registry
     */
    unregister(blockId: string): boolean {
        return this.blocks.delete(blockId);
    }
}

// Singleton instance
export const blockRegistry = new BlockRegistry();

// ============================================
// REGISTER DEFAULT BLOCKS
// ============================================

// Polymarket Block
blockRegistry.register({
    block_id: 'polymarket_live_odds',
    display_name: 'Polymarket',
    category: 'truth',
    data_type: 'probabilistic_stream',
    refresh_rate: '1s',
    semantic_tags: ['prediction', 'truth_signal', 'market', 'probability', 'betting'],
    wiring_logic: 'map_to_game_theory_agent',
    ports: [
        createJsonOutputPort('out', 'Market Data')
    ],
    icon: 'TrendingUp',
    description: 'Real-time prediction market odds and probabilities'
});

// NewsAPI Block
blockRegistry.register({
    block_id: 'newsapi_feed',
    display_name: 'News Feed',
    category: 'pulse',
    data_type: 'news_feed',
    refresh_rate: '5m',
    semantic_tags: ['news', 'narrative', 'sentiment', 'headlines', 'media'],
    wiring_logic: 'map_to_narrative_agent',
    ports: [
        createJsonOutputPort('out', 'Article Feed')
    ],
    icon: 'Newspaper',
    description: 'Aggregated news articles with sentiment analysis'
});

// CoinGecko Block
blockRegistry.register({
    block_id: 'coingecko_crypto',
    display_name: 'Crypto Markets',
    category: 'truth',
    data_type: 'financial',
    refresh_rate: '1m',
    semantic_tags: ['crypto', 'bitcoin', 'ethereum', 'prices', 'market'],
    wiring_logic: 'map_to_quant_agent',
    icon: 'Coins',
    description: 'Live cryptocurrency prices and market data',
    isUserCreatable: true
});

// Alpha Vantage Block
blockRegistry.register({
    block_id: 'alpha_vantage_quote',
    display_name: 'Alpha Vantage',
    category: 'truth',
    data_type: 'financial',
    refresh_rate: '1m',
    semantic_tags: ['stocks', 'forex', 'crypto', 'market', 'quote'],
    wiring_logic: 'map_to_quant_agent',
    ports: [
        createJsonOutputPort('out', 'Market Quote')
    ],
    icon: 'LineChart',
    description: 'Market quote data from Alpha Vantage',
    isUserCreatable: true
});

// Hacker News Block
blockRegistry.register({
    block_id: 'hackernews_feed',
    display_name: 'Hacker News',
    category: 'pulse',
    data_type: 'news_feed',
    refresh_rate: '5m',
    semantic_tags: ['hackernews', 'tech', 'startups', 'programming', 'ycombinator'],
    wiring_logic: 'map_to_narrative_agent',
    icon: 'Zap',
    description: 'Top stories from Hacker News',
    isUserCreatable: true
});

// GDELT Block (placeholder for Phase 3)
blockRegistry.register({
    block_id: 'gdelt_events',
    display_name: 'GDELT Events',
    category: 'pulse',
    data_type: 'news_feed',
    refresh_rate: '15m',
    semantic_tags: ['geopolitical', 'events', 'global', 'conflicts', 'sentiment'],
    wiring_logic: 'map_to_analyst_agent',
    icon: 'Globe',
    description: 'Global event monitoring and analysis'
});

// FlightAware Block (placeholder for Phase 3)
blockRegistry.register({
    block_id: 'flightaware_tracker',
    display_name: 'Flight Tracker',
    category: 'physicality',
    data_type: 'telemetry',
    refresh_rate: '30s',
    semantic_tags: ['aviation', 'tracking', 'logistics', 'movement'],
    wiring_logic: 'map_to_logistics_agent',
    icon: 'Plane',
    description: 'Real-time flight tracking and aviation data'
});

// Metaculus Block
blockRegistry.register({
    block_id: 'metaculus_forecast',
    display_name: 'Metaculus Forecast',
    category: 'truth',
    data_type: 'probabilistic_stream',
    refresh_rate: '1m',
    semantic_tags: ['metaculus', 'forecasting', 'prediction', 'probability', 'science'],
    wiring_logic: 'map_to_game_theory_agent',
    ports: [
        createJsonOutputPort('out', 'Forecast Data')
    ],
    icon: 'Target',
    description: 'Scientific forecasting and prediction questions'
});

// OpenAlex Block
blockRegistry.register({
    block_id: 'openalex_works',
    display_name: 'OpenAlex',
    category: 'truth',
    data_type: 'news_feed',
    refresh_rate: '30m',
    semantic_tags: ['research', 'papers', 'citations', 'scholarly'],
    wiring_logic: 'map_to_research_agent',
    ports: [
        createJsonOutputPort('out', 'Research Feed')
    ],
    icon: 'BookOpen',
    description: 'Recent research works and citations',
    isUserCreatable: true
});

// FRED Block
blockRegistry.register({
    block_id: 'fred_series',
    display_name: 'FRED',
    category: 'truth',
    data_type: 'financial',
    refresh_rate: '15m',
    semantic_tags: ['economics', 'macro', 'time series', 'fred', 'fed'],
    wiring_logic: 'map_to_quant_agent',
    ports: [
        createJsonOutputPort('out', 'Series Data')
    ],
    icon: 'LineChart',
    description: 'Federal Reserve Economic Data series observations',
    isUserCreatable: true
});

// BLS Block
blockRegistry.register({
    block_id: 'bls_series',
    display_name: 'BLS',
    category: 'truth',
    data_type: 'financial',
    refresh_rate: '30m',
    semantic_tags: ['labor', 'employment', 'time series', 'statistics'],
    wiring_logic: 'map_to_quant_agent',
    ports: [
        createJsonOutputPort('out', 'Series Data')
    ],
    icon: 'LineChart',
    description: 'Bureau of Labor Statistics time series data',
    isUserCreatable: true
});

// World Bank Block
blockRegistry.register({
    block_id: 'worldbank_indicator',
    display_name: 'World Bank',
    category: 'truth',
    data_type: 'financial',
    refresh_rate: '1h',
    semantic_tags: ['development', 'global', 'indicator', 'time series'],
    wiring_logic: 'map_to_quant_agent',
    ports: [
        createJsonOutputPort('out', 'Indicator Data')
    ],
    icon: 'Globe',
    description: 'World Bank global development indicators',
    isUserCreatable: true
});

// MarineTraffic Block (placeholder for Phase 3)
blockRegistry.register({
    block_id: 'marinetraffic_ais',
    display_name: 'Marine Traffic',
    category: 'physicality',
    data_type: 'telemetry',
    refresh_rate: '1m',
    semantic_tags: ['maritime', 'shipping', 'logistics', 'vessels'],
    wiring_logic: 'map_to_logistics_agent',
    icon: 'Ship',
    description: 'AIS vessel tracking and maritime intelligence'
});

// ============================================
// WORKSPACE BLOCKS
// ============================================

// Text Note Block
blockRegistry.register({
    block_id: 'text_note',
    display_name: 'Text Note',
    category: 'workspace',
    data_type: 'text',
    refresh_rate: 'manual',
    semantic_tags: ['notes', 'documents', 'research', 'writing', 'markdown'],
    wiring_logic: 'map_to_analyst_agent',
    ports: [
        createTextOutputPort('out', 'Text Content')
    ],
    icon: 'FileText',
    description: 'Markdown notes with preview toggle',
    expandMode: 'portal',
    isUserCreatable: true
});

// Code Block
blockRegistry.register({
    block_id: 'code_sandbox',
    display_name: 'Code',
    category: 'workspace',
    data_type: 'code',
    refresh_rate: 'manual',
    semantic_tags: ['code', 'programming', 'scripts', 'analysis', 'developer'],
    wiring_logic: 'map_to_developer_agent',
    icon: 'Code',
    description: 'Syntax-highlighted code display',
    expandMode: 'portal',
    isUserCreatable: true
});

// Chat Block
blockRegistry.register({
    block_id: 'mind_chat',
    display_name: 'Mind Chat',
    category: 'workspace',
    data_type: 'conversation',
    refresh_rate: 'manual',
    semantic_tags: ['chat', 'conversation', 'ai', 'assistant', 'mind'],
    wiring_logic: 'map_to_active_persona',
    ports: [
        createAnyInputPort('in', 'Context Input'),
        createTextOutputPort('out', 'Conversation')
    ],
    icon: 'MessageSquare',
    description: 'Direct conversation with the Mind',
    expandMode: 'fullscreen',
    isUserCreatable: true
});

// Media Block
blockRegistry.register({
    block_id: 'media_gallery',
    display_name: 'Media',
    category: 'workspace',
    data_type: 'media',
    refresh_rate: 'manual',
    semantic_tags: ['images', 'video', 'gallery', 'media', 'files'],
    wiring_logic: 'map_to_analyst_agent',
    icon: 'Image',
    description: 'Image and video gallery',
    expandMode: 'portal',
    isUserCreatable: true
});

// Embed Block
blockRegistry.register({
    block_id: 'web_embed',
    display_name: 'Web Embed',
    category: 'workspace',
    data_type: 'embed',
    refresh_rate: 'manual',
    semantic_tags: ['embed', 'iframe', 'website', 'external', 'browser'],
    wiring_logic: 'map_to_analyst_agent',
    icon: 'Globe',
    description: 'Embed external web content',
    expandMode: 'fullscreen',
    isUserCreatable: true
});

// ============================================
// PERSONA BLOCKS
// ============================================

// Analyst Persona
blockRegistry.register({
    block_id: 'persona_analyst',
    display_name: 'Analyst',
    category: 'model',
    data_type: 'conversation',
    refresh_rate: 'manual',
    semantic_tags: ['persona', 'ai', 'analyst', 'data', 'insights', 'intelligence'],
    wiring_logic: 'accepts_wire_input',
    ports: [
        createAnyInputPort('in', 'Data Input'),
        createTextOutputPort('out', 'Analysis')
    ],
    icon: 'Target',
    description: '🎯 Data-driven insights and market analysis',
    expandMode: 'portal',
    isUserCreatable: true
});

// Strategist Persona
blockRegistry.register({
    block_id: 'persona_strategist',
    display_name: 'Strategist',
    category: 'model',
    data_type: 'conversation',
    refresh_rate: 'manual',
    semantic_tags: ['persona', 'ai', 'strategist', 'planning', 'tactics'],
    wiring_logic: 'accepts_wire_input',
    ports: [
        createAnyInputPort('in', 'Data Input'),
        createTextOutputPort('out', 'Strategy')
    ],
    icon: 'Swords',
    description: '⚔️ Long-term planning and tactical decisions',
    expandMode: 'portal',
    isUserCreatable: true
});

// Researcher Persona
blockRegistry.register({
    block_id: 'persona_researcher',
    display_name: 'Researcher',
    category: 'model',
    data_type: 'conversation',
    refresh_rate: 'manual',
    semantic_tags: ['persona', 'ai', 'researcher', 'science', 'knowledge'],
    wiring_logic: 'accepts_wire_input',
    ports: [
        createAnyInputPort('in', 'Data Input'),
        createTextOutputPort('out', 'Research')
    ],
    icon: 'FlaskConical',
    description: '🔬 Deep investigation and knowledge synthesis',
    expandMode: 'portal',
    isUserCreatable: true
});

// Creative Persona
blockRegistry.register({
    block_id: 'persona_creative',
    display_name: 'Creative',
    category: 'model',
    data_type: 'conversation',
    refresh_rate: 'manual',
    semantic_tags: ['persona', 'ai', 'creative', 'ideas', 'innovation'],
    wiring_logic: 'accepts_wire_input',
    ports: [
        createAnyInputPort('in', 'Data Input'),
        createTextOutputPort('out', 'Ideas')
    ],
    icon: 'Palette',
    description: '🎨 Ideation and unconventional thinking',
    expandMode: 'portal',
    isUserCreatable: true
});

// Guardian Persona
blockRegistry.register({
    block_id: 'persona_guardian',
    display_name: 'Guardian',
    category: 'model',
    data_type: 'conversation',
    refresh_rate: 'manual',
    semantic_tags: ['persona', 'ai', 'guardian', 'risk', 'protection'],
    wiring_logic: 'accepts_wire_input',
    ports: [
        createAnyInputPort('in', 'Data Input'),
        createTextOutputPort('out', 'Risk Analysis')
    ],
    icon: 'Shield',
    description: '🛡️ Risk assessment and protective analysis',
    expandMode: 'portal',
    isUserCreatable: true
});

// ============================================
// SYSTEM BLOCKS
// ============================================

// System Proxy Block (template - instances are created per system)
blockRegistry.register({
    block_id: 'system_proxy_health',
    display_name: 'Health System',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '1m',
    semantic_tags: ['system', 'health', 'life', 'stability', 'proxy'],
    wiring_logic: 'map_to_core_calculator',
    ports: [
        createJsonOutputPort('stability', 'Stability Score'),
        createJsonOutputPort('outputs', 'Exposed Outputs')
    ],
    icon: 'Heart',
    description: '🏥 Health System proxy - stability and outputs',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'health'
});

blockRegistry.register({
    block_id: 'system_proxy_career',
    display_name: 'Career System',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '1m',
    semantic_tags: ['system', 'career', 'life', 'stability', 'proxy'],
    wiring_logic: 'map_to_core_calculator',
    ports: [
        createJsonOutputPort('stability', 'Stability Score'),
        createJsonOutputPort('outputs', 'Exposed Outputs')
    ],
    icon: 'Briefcase',
    description: '💼 Career System proxy - stability and outputs',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'career'
});

blockRegistry.register({
    block_id: 'system_proxy_finance',
    display_name: 'Finance System',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '1m',
    semantic_tags: ['system', 'finance', 'life', 'stability', 'proxy'],
    wiring_logic: 'map_to_core_calculator',
    ports: [
        createJsonOutputPort('stability', 'Stability Score'),
        createJsonOutputPort('outputs', 'Exposed Outputs')
    ],
    icon: 'Wallet',
    description: '💰 Finance System proxy - stability and outputs',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'finance'
});

blockRegistry.register({
    block_id: 'system_proxy_mind',
    display_name: 'Mind System',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '1m',
    semantic_tags: ['system', 'mind', 'life', 'stability', 'proxy'],
    wiring_logic: 'map_to_core_calculator',
    ports: [
        createJsonOutputPort('stability', 'Stability Score'),
        createJsonOutputPort('outputs', 'Exposed Outputs')
    ],
    icon: 'Brain',
    description: '🧠 Mind System proxy - stability and outputs',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'mind'
});

blockRegistry.register({
    block_id: 'system_proxy_relationships',
    display_name: 'Relationships System',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '1m',
    semantic_tags: ['system', 'relationships', 'life', 'stability', 'proxy'],
    wiring_logic: 'map_to_core_calculator',
    ports: [
        createJsonOutputPort('stability', 'Stability Score'),
        createJsonOutputPort('outputs', 'Exposed Outputs')
    ],
    icon: 'Users',
    description: '💞 Relationships System proxy - stability and outputs',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'relationships'
});

blockRegistry.register({
    block_id: 'system_proxy_environment',
    display_name: 'Environment System',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '1m',
    semantic_tags: ['system', 'environment', 'life', 'stability', 'proxy'],
    wiring_logic: 'map_to_core_calculator',
    ports: [
        createJsonOutputPort('stability', 'Stability Score'),
        createJsonOutputPort('outputs', 'Exposed Outputs')
    ],
    icon: 'Home',
    description: '🏠 Environment System proxy - stability and outputs',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'environment'
});

blockRegistry.register({
    block_id: 'system_proxy_time',
    display_name: 'Time System',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '1m',
    semantic_tags: ['system', 'time', 'life', 'stability', 'proxy'],
    wiring_logic: 'map_to_core_calculator',
    ports: [
        createJsonOutputPort('stability', 'Stability Score'),
        createJsonOutputPort('outputs', 'Exposed Outputs')
    ],
    icon: 'Clock',
    description: '⏳ Time System proxy - stability and outputs',
    expandMode: 'resize',
    isUserCreatable: true,
    systemId: 'time'
});

// Core Calculator Block
blockRegistry.register({
    block_id: 'core_calculator',
    display_name: 'Core Calculator',
    category: 'system',
    data_type: 'custom',
    refresh_rate: '30s',
    semantic_tags: ['system', 'calculator', 'aggregate', 'overall', 'stability'],
    wiring_logic: 'aggregate_systems',
    ports: [
        createAnyInputPort('systems', 'System Inputs'),
        createJsonOutputPort('overall', 'Overall Stability'),
        createJsonOutputPort('recommendations', 'Recommendations')
    ],
    icon: 'Calculator',
    description: '📊 Aggregates all System outputs into overall metrics',
    expandMode: 'resize',
    isUserCreatable: true
});

// Garden Portal Block
blockRegistry.register({
    block_id: 'garden_portal',
    display_name: 'Garden Portal',
    category: 'system',
    data_type: 'embed',
    refresh_rate: 'manual',
    semantic_tags: ['system', 'garden', 'portal', 'navigation', 'map'],
    wiring_logic: 'none',
    ports: [],
    icon: 'Hexagon',
    description: '🌌 Mini-map portal to the System Garden',
    expandMode: 'fullscreen',
    isUserCreatable: true
});

// ============================================
// LIFE SYSTEM DOMAIN BLOCKS
// ============================================

// Register all domain-specific blocks for each Life System
const ALL_SYSTEM_BLOCKS = [
    ...HEALTH_BLOCKS,
    ...CAREER_BLOCKS,
    ...FINANCE_BLOCKS,
    ...MIND_BLOCKS,
    ...RELATIONSHIPS_BLOCKS,
    ...ENVIRONMENT_BLOCKS,
    ...TIME_BLOCKS
];

ALL_SYSTEM_BLOCKS.forEach(block => {
    blockRegistry.register(block);
});

export default blockRegistry;

