// ============================================
// PROJECT OMNI: COGNITIVE CORE SCHEMA
// Systems + Projects dual-core architecture
// ============================================

import { PersonaConfig } from './mind.schema';
import { ShellConfig } from './shell.schema';

// ============================================
// FUNDAMENTAL SYSTEMS (7 Life Domains)
// ============================================

/**
 * The 7 fundamental human systems
 */
export type SystemType =
    | 'health'        // Body, sleep, nutrition, exercise
    | 'career'        // Work, skills, reputation
    | 'finance'       // Assets, liabilities, cash flow
    | 'mind'          // Learning, creativity, mental state
    | 'relationships' // Family, friends, network
    | 'environment'   // Home, possessions, spaces
    | 'time';         // Schedule, energy, rhythms

/**
 * System stability states (for Real Dynamics visualization)
 */
export type StabilityState = 'stable' | 'balanced' | 'flux' | 'unstable' | 'critical';

/**
 * A fundamental life system with isolated context
 */
export interface LifeSystem {
    /** System identifier */
    id: SystemType;

    /** Display name */
    name: string;

    /** Emoji icon */
    icon: string;

    /** Description of this domain */
    description: string;

    /** Current stability state */
    stability: StabilityState;

    /** Stability score (0-100) */
    stabilityScore: number;

    /** Context pool for this system (isolated) */
    contextPoolId: string;

    /** Dedicated AI instance ID (context-secure) */
    aiInstanceId: string;

    /** Last activity timestamp */
    lastActivity: number;

    /** Custom attributes (programmable) */
    attributes: SystemAttribute[];

    /** Behavioral rules */
    rules: SystemRule[];

    /** Hierarchical domain structure */
    domainIds: string[];

    /** Framework overlays (e.g., Maslow's pyramid) */
    frameworkIds: string[];
}

/**
 * Custom attribute for a system
 */
export interface SystemAttribute {
    id: string;
    name: string;
    value: number;      // 0-100 scale
    unit?: string;
    trend: 'up' | 'down' | 'stable';
    lastUpdated: number;
}

/**
 * Behavioral rule for a system
 */
export interface SystemRule {
    id: string;
    name: string;
    condition: string;      // e.g., "energy < 30"
    action: string;         // e.g., "suggest_rest"
    isActive: boolean;
    priority: number;
}

/**
 * System influence relationship (for Real Dynamics)
 */
export interface SystemInfluence {
    sourceSystemId: SystemType;
    targetSystemId: SystemType;
    influenceType: 'positive' | 'negative' | 'bidirectional';
    strength: number;       // 0-1
    description?: string;
}

// ============================================
// SYSTEM SHELLS (Programmable Workspaces)
// ============================================

/**
 * A programmable variable within a System Shell
 */
export interface SystemVariable {
    id: string;
    name: string;
    type: 'number' | 'string' | 'boolean' | 'json';
    value: unknown;
    defaultValue?: unknown;
    unit?: string;
    min?: number;           // For numeric variables
    max?: number;           // For numeric variables
    source: 'manual' | 'block' | 'computed';
    sourceBlockId?: string; // If value comes from a block output
    description?: string;
    createdAt: number;
    updatedAt: number;
}

/**
 * A relationship between two variables (for computation/influence)
 */
export interface VariableRelationship {
    id: string;
    fromVariableId: string;
    toVariableId: string;
    relationshipType: 'correlation' | 'causal' | 'dependency' | 'custom';
    weight: number;         // -1 to 1 (negative = inverse relationship)
    formula?: string;       // Optional: custom formula for computation
    description?: string;
    createdAt: number;
}

/**
 * An output exposed from a System Shell to the Main Shell
 */
export interface ExposedOutput {
    id: string;
    name: string;
    type: 'number' | 'string' | 'insight' | 'json';
    sourceType: 'variable' | 'block' | 'computed';
    sourceId: string;       // Variable ID or Block Instance ID
    portName?: string;      // If from block, which output port
    value: unknown;         // Current computed value
    updatedAt: number;
}

/**
 * A System Shell - a programmable Canvas workspace for a System
 */
export interface SystemShell {
    /** The system type this shell represents */
    systemId: SystemType;

    /** Dedicated persona for this system */
    persona: PersonaConfig;

    /** User-defined variables */
    variables: SystemVariable[];

    /** Relationships between variables */
    relationships: VariableRelationship[];

    /** Block instances in this shell's canvas */
    blockInstanceIds: string[];

    /** Outputs exposed to Main Shell / Core Calculator */
    exposedOutputs: ExposedOutput[];

    /** Shell configuration (layout, etc.) */
    shellConfig?: Partial<ShellConfig>;

    /** Whether the shell has been "activated" (user has entered it at least once) */
    isActivated: boolean;

    /** Creation timestamp */
    createdAt: number;

    /** Last modified */
    updatedAt: number;
}

// ============================================
// DEFAULT SYSTEMS
// ============================================

export const DEFAULT_SYSTEMS: Omit<LifeSystem, 'contextPoolId' | 'aiInstanceId' | 'lastActivity'>[] = [
    {
        id: 'health',
        name: 'Health',
        icon: '🏥',
        description: 'Body, sleep, nutrition, exercise',
        stability: 'balanced',
        stabilityScore: 70,
        attributes: [
            { id: 'energy', name: 'Energy', value: 75, trend: 'stable', lastUpdated: Date.now() },
            { id: 'sleep_quality', name: 'Sleep Quality', value: 80, trend: 'up', lastUpdated: Date.now() },
            { id: 'stress', name: 'Stress Level', value: 40, trend: 'down', lastUpdated: Date.now() }
        ],
        rules: [],
        domainIds: [
            'health.body', 'health.mind', 'health.spirit',
            'health.body.movement', 'health.body.nutrition', 'health.body.sleep',
            'health.mind.meditation', 'health.mind.cognitive', 'health.mind.stress',
            'health.spirit.purpose', 'health.spirit.gratitude', 'health.spirit.connection'
        ],
        frameworkIds: ['maslow_pyramid']
    },
    {
        id: 'career',
        name: 'Career',
        icon: '💼',
        description: 'Work, skills, reputation',
        stability: 'stable',
        stabilityScore: 85,
        attributes: [
            { id: 'productivity', name: 'Productivity', value: 80, trend: 'stable', lastUpdated: Date.now() },
            { id: 'skill_growth', name: 'Skill Growth', value: 65, trend: 'up', lastUpdated: Date.now() }
        ],
        rules: [],
        domainIds: [],
        frameworkIds: []
    },
    {
        id: 'finance',
        name: 'Finance',
        icon: '💰',
        description: 'Assets, liabilities, cash flow',
        stability: 'balanced',
        stabilityScore: 60,
        attributes: [
            { id: 'runway', name: 'Runway', value: 70, unit: 'months', trend: 'stable', lastUpdated: Date.now() },
            { id: 'savings_rate', name: 'Savings Rate', value: 50, unit: '%', trend: 'up', lastUpdated: Date.now() }
        ],
        rules: [],
        domainIds: [],
        frameworkIds: []
    },
    {
        id: 'mind',
        name: 'Mind',
        icon: '🧠',
        description: 'Learning, creativity, mental state',
        stability: 'stable',
        stabilityScore: 75,
        attributes: [
            { id: 'clarity', name: 'Mental Clarity', value: 80, trend: 'stable', lastUpdated: Date.now() },
            { id: 'creativity', name: 'Creativity', value: 70, trend: 'up', lastUpdated: Date.now() }
        ],
        rules: [],
        domainIds: [],
        frameworkIds: []
    },
    {
        id: 'relationships',
        name: 'Relationships',
        icon: '💞',
        description: 'Family, friends, network',
        stability: 'balanced',
        stabilityScore: 65,
        attributes: [
            { id: 'connection', name: 'Connection Quality', value: 70, trend: 'stable', lastUpdated: Date.now() },
            { id: 'network_health', name: 'Network Health', value: 60, trend: 'down', lastUpdated: Date.now() }
        ],
        rules: [],
        domainIds: [],
        frameworkIds: []
    },
    {
        id: 'environment',
        name: 'Environment',
        icon: '🏠',
        description: 'Home, possessions, spaces',
        stability: 'stable',
        stabilityScore: 80,
        attributes: [
            { id: 'organization', name: 'Organization', value: 75, trend: 'stable', lastUpdated: Date.now() },
            { id: 'comfort', name: 'Comfort', value: 85, trend: 'stable', lastUpdated: Date.now() }
        ],
        rules: [],
        domainIds: [],
        frameworkIds: []
    },
    {
        id: 'time',
        name: 'Time',
        icon: '⏳',
        description: 'Schedule, energy, rhythms',
        stability: 'flux',
        stabilityScore: 55,
        attributes: [
            { id: 'focus_time', name: 'Focus Time', value: 60, unit: 'hrs/week', trend: 'down', lastUpdated: Date.now() },
            { id: 'balance', name: 'Work-Life Balance', value: 50, trend: 'stable', lastUpdated: Date.now() }
        ],
        rules: [],
        domainIds: [],
        frameworkIds: []
    }
];

// ============================================
// PROJECTS
// ============================================

/**
 * Project lifecycle states
 */
export type ProjectState = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

/**
 * A user-defined project with linked systems
 */
export interface Project {
    /** Unique project ID */
    id: string;

    /** Project name */
    name: string;

    /** Description */
    description?: string;

    /** Project icon/emoji */
    icon: string;

    /** Current state */
    state: ProjectState;

    /** Linked system IDs (with permission to access) */
    linkedSystems: SystemType[];

    /** Context pool for this project */
    contextPoolId: string;

    /** Dedicated AI instance ID */
    aiInstanceId: string;

    /** Preferred shell configuration */
    preferredShellId?: string;

    /** Creation timestamp */
    createdAt: number;

    /** Last modified */
    updatedAt: number;

    /** Custom metadata */
    metadata: Record<string, unknown>;
}

// ============================================
// AI INSTANCES
// ============================================

/**
 * An AI instance bound to a context (System or Project)
 */
export interface AIInstance {
    /** Unique instance ID */
    id: string;

    /** Display name */
    name: string;

    /** Bound persona configuration */
    persona: PersonaConfig;

    /** Context type */
    contextType: 'system' | 'project';

    /** ID of the system or project this is bound to */
    contextId: string;

    /** Conversation/insight memory */
    memory: AIMemoryEntry[];

    /** Maximum memory entries to retain */
    memoryLimit: number;

    /** Last interaction timestamp */
    lastInteraction: number;

    /** Whether this instance is context-isolated */
    isIsolated: boolean;
}

/**
 * A memory entry for an AI instance
 */
export interface AIMemoryEntry {
    id: string;
    timestamp: number;
    type: 'conversation' | 'insight' | 'observation' | 'action';
    content: string;
    metadata?: Record<string, unknown>;
}

// ============================================
// CONTEXT POOLS
// ============================================

/**
 * A shared knowledge container
 */
export interface ContextPool {
    /** Unique pool ID */
    id: string;

    /** Pool name */
    name: string;

    /** Owner type */
    ownerType: 'system' | 'project';

    /** Owner ID */
    ownerId: string;

    /** Knowledge nodes in this pool */
    nodes: ContextNode[];

    /** Relationships between nodes */
    edges: ContextEdge[];

    /** Last updated */
    updatedAt: number;
}

/**
 * A node in the context pool (knowledge unit)
 */
export interface ContextNode {
    id: string;
    type: 'entity' | 'concept' | 'event' | 'insight' | 'metric' | 'goal';
    label: string;
    content: string;
    importance: number;     // 0-1
    createdAt: number;
    sourceBlockId?: string; // If pinned from a data block
    metadata?: Record<string, unknown>;
}

/**
 * An edge connecting context nodes
 */
export interface ContextEdge {
    id: string;
    sourceId: string;
    targetId: string;
    relation: 'related_to' | 'causes' | 'supports' | 'contradicts' | 'depends_on' | 'part_of';
    weight: number;
    createdAt: number;
}

// ============================================
// COGNITIVE CORE STATE
// ============================================

/**
 * The complete cognitive core state
 */
export interface CognitiveCore {
    /** All life systems */
    systems: LifeSystem[];

    /** System influence relationships */
    systemInfluences: SystemInfluence[];

    /** All projects */
    projects: Project[];

    /** All context pools */
    contextPools: ContextPool[];

    /** All AI instances */
    aiInstances: AIInstance[];

    /** Currently active context (system or project) */
    activeContextType: 'system' | 'project' | null;
    activeContextId: string | null;
}
