// ============================================
// PROJECT OMNI: OMNI-SCHEMA TYPE DEFINITIONS
// ============================================

/**
 * Core data types for API Blocks
 */
export type BlockDataType =
  | 'probabilistic_stream'  // Truth Blocks (prediction markets)
  | 'news_feed'             // Pulse Blocks (news/narrative)
  | 'telemetry'             // Physicality Blocks (location/movement)
  | 'biometric'             // Model Blocks (AI models/biomarkers)
  | 'financial'             // Truth Blocks (market data)
  | 'social'                // Pulse Blocks (social media)
  | 'custom'
  // Workspace types
  | 'text'                  // Rich text/markdown content
  | 'code'                  // Source code display
  | 'media'                 // Images, video, audio
  | 'conversation'          // Mind chat thread
  | 'embed';                // External iframe content

/**
 * Block categories aligned with the "Senses"
 */
export type BlockCategory =
  | 'truth'
  | 'pulse'
  | 'model'
  | 'workspace';

/**
 * Connection status for live data streams
 */
export type ConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error'
  | 'paused';

/**
 * Expand behavior for blocks
 */
export type BlockExpandMode = 'resize' | 'portal' | 'fullscreen';

/**
 * Port data types for typed wiring
 */
export type PortDataType = 'json' | 'text' | 'media' | 'any';

/**
 * Port direction
 */
export type PortDirection = 'input' | 'output';

/**
 * Port definition for block schema
 */
export interface PortSchema {
  /** Port identifier (unique within block) */
  id: string;

  /** Port direction */
  direction: PortDirection;

  /** Data type this port handles */
  dataType: PortDataType;

  /** Human-readable label */
  label?: string;

  /** For input ports: which types can be accepted (defaults to same as dataType) */
  accepts?: PortDataType[];

  /** Whether this port is required for block operation */
  required?: boolean;

  /** Description for tooltip */
  description?: string;
}

/**
 * Type conversion result
 */
export interface ConversionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * The core Omni-Schema for API Blocks
 * Every API must be wrapped in this schema to be "Lego-ized"
 */
export interface OmniBlockSchema {
  /** Unique identifier for this block type */
  block_id: string;

  /** Human-readable name */
  display_name: string;

  /** Category of the block */
  category: BlockCategory;

  /** Type of data this block provides */
  data_type: BlockDataType;

  /** Refresh rate (e.g., "1s", "5m", "1h", "manual") */
  refresh_rate: string;

  /** Tags for semantic search and filtering */
  semantic_tags: string[];

  /** Logic for wiring to AI personas */
  wiring_logic: string;

  /** Port definitions for typed wiring */
  ports?: PortSchema[];

  /** Optional icon identifier */
  icon?: string;

  /** Description for the Armory UI */
  description?: string;

  /** How this block behaves when expanded */
  expandMode?: BlockExpandMode;

  /** Whether this block can be created by the user (vs API-sourced) */
  isUserCreatable?: boolean;
}

/**
 * Runtime state for an active block instance
 */
export interface BlockInstance {
  /** Unique instance ID */
  instance_id: string;

  /** Reference to the block schema */
  schema: OmniBlockSchema;

  /** Current connection status */
  status: ConnectionStatus;

  /** Last data update timestamp */
  last_updated: number | null;

  /** Current data payload */
  data: unknown;

  /** Error message if status is 'error' */
  error?: string;

  /** Canvas position */
  position: { x: number; y: number };

  /** Canvas dimensions */
  dimensions: { width: number; height: number };

  /** Shell isolation - ID of the shell this block belongs to */
  shellId: string;
}

/**
 * Configuration for API connections
 */
export interface ApiConfig {
  /** API key or token */
  apiKey?: string;

  /** Base URL for the API */
  baseUrl: string;

  /** Whether to use mock data instead of live API */
  useMockData: boolean;

  /** Additional headers */
  headers?: Record<string, string>;
}

/**
 * Polymarket-specific data types
 */
export interface PolymarketMarket {
  id: string;
  question: string;
  description?: string;
  outcomes: PolymarketOutcome[];
  volume: number;
  liquidity: number;
  endDate: string;
  category: string;
  tags: string[];
}

export interface PolymarketOutcome {
  id: string;
  name: string;
  probability: number;
  priceHistory?: { timestamp: number; price: number }[];
}

/**
 * NewsAPI-specific data types
 */
export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  author?: string;
  url: string;
  imageUrl?: string;
  publishedAt: string;
  content?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface NewsFeed {
  articles: NewsArticle[];
  totalResults: number;
  query?: string;
  category?: string;
}

/**
 * Canvas wiring between blocks
 */
export interface BlockConnection {
  id: string;
  sourceBlockId: string;
  sourcePort: string;
  targetBlockId: string;
  targetPort: string;
}

/**
 * Block event payloads
 */
export interface BlockEvent {
  type: 'data_update' | 'status_change' | 'error' | 'connected' | 'disconnected';
  blockId: string;
  timestamp: number;
  payload: unknown;
}
