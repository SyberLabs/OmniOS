// ============================================
// PROJECT OMNI: GRAPH POOL SCHEMA
// Unified data structure for System Shells
// ============================================

import { SystemType } from './core.schema';

// ============================================
// GRAPH NODE TYPES
// ============================================

/**
 * Node types in the graph
 */
export type GraphNodeType =
    | 'entity'      // Person, place, thing
    | 'metric'      // Measurable value (steps, calories)
    | 'event'       // Point-in-time occurrence (workout, meal)
    | 'computed'    // Derived from other nodes
    | 'tracker'     // Links to domain tracker
    | 'goal';       // Target/aspiration

/**
 * A node in the graph
 */
export interface GraphNode {
    /** Unique node ID */
    id: string;

    /** Node type */
    type: GraphNodeType;

    /** Display label */
    label: string;

    /** Emoji icon */
    icon?: string;

    /** Current value (for metric/computed nodes) */
    value?: number;

    /** Unit of measurement */
    unit?: string;

    /** Target value (for goal nodes) */
    target?: number;

    /** Arbitrary properties */
    properties: Record<string, unknown>;

    /** Position in graph layout */
    position?: { x: number; y: number };

    /** Visual styling */
    color?: string;

    /** Creation timestamp */
    createdAt: number;

    /** Last updated */
    lastUpdated: number;
}

// ============================================
// GRAPH EDGE TYPES
// ============================================

/**
 * Relationship types for edges
 */
export type EdgeRelationType =
    | 'increases'       // A positively affects B
    | 'decreases'       // A negatively affects B
    | 'requires'        // A depends on B
    | 'produces'        // A creates B
    | 'correlates'      // A and B move together
    | 'is_a'            // A is type of B
    | 'part_of'         // A belongs to B
    | 'knows'           // For person graphs
    | 'custom';         // User-defined

/**
 * An edge connecting two nodes
 */
export interface GraphEdge {
    /** Unique edge ID */
    id: string;

    /** Source node ID */
    source: string;

    /** Target node ID */
    target: string;

    /** Relationship type */
    relation: EdgeRelationType | string;

    /** Relationship strength (-1 to 1) */
    weight: number;

    /** Is this edge user-defined or system-generated? */
    isUserDefined: boolean;

    /** Edge label for display */
    label?: string;

    /** Additional properties */
    properties: Record<string, unknown>;

    /** Creation timestamp */
    createdAt: number;
}

// ============================================
// GRAPH DEFINITION
// ============================================

/**
 * Graph types
 */
export type GraphType =
    | 'domain'          // Represents a life domain (Movement, Sleep)
    | 'entity'          // Represents entities (People, Assets)
    | 'process'         // Represents workflows/processes
    | 'relationship';   // Represents connections between entities

/**
 * A single graph within the pool
 */
export interface Graph {
    /** Unique graph ID */
    id: string;

    /** Display name */
    name: string;

    /** Description */
    description?: string;

    /** Graph type */
    type: GraphType;

    /** Emoji icon */
    icon?: string;

    /** Color theme */
    color?: string;

    /** Nodes in this graph */
    nodes: GraphNode[];

    /** Edges within this graph */
    edges: GraphEdge[];

    /** Block types that can read/write to this graph */
    subscribedBlockTypes: string[];

    /** Is this a system graph (not user-deletable)? */
    isSystemGraph: boolean;

    /** Creation timestamp */
    createdAt: number;

    /** Last updated */
    updatedAt: number;
}

// ============================================
// CROSS-GRAPH EDGES
// ============================================

/**
 * An edge that connects nodes across different graphs
 */
export interface CrossEdge {
    /** Unique edge ID */
    id: string;

    /** Source system ID */
    sourceSystemId?: SystemType;

    /** Source graph ID */
    sourceGraphId: string;

    /** Source node ID */
    sourceNodeId: string;

    /** Target system ID */
    targetSystemId?: SystemType;

    /** Target graph ID */
    targetGraphId: string;

    /** Target node ID */
    targetNodeId: string;

    /** Relationship type */
    relation: EdgeRelationType | string;

    /** Relationship strength */
    weight: number;

    /** Edge label */
    label?: string;

    /** Is user-defined? */
    isUserDefined: boolean;

    /** Creation timestamp */
    createdAt: number;
}

// ============================================
// POOL VARIABLES
// ============================================

/**
 * Variable binding types
 */
export type VariableBindingType =
    | 'edge_weight'     // Binds to an edge's weight
    | 'node_value'      // Binds to a node's value
    | 'node_property'   // Binds to a node's property
    | 'threshold'       // Used in rule conditions
    | 'coefficient';    // Multiplier in computations

/**
 * A variable that can control graph properties
 */
export interface PoolVariable {
    /** Unique variable ID */
    id: string;

    /** Display name */
    name: string;

    /** Current value */
    value: number;

    /** Minimum value */
    min?: number;

    /** Maximum value */
    max?: number;

    /** Step size for sliders */
    step?: number;

    /** Binding type */
    bindingType: VariableBindingType;

    /** Target ID (edge, node, or rule) */
    targetId: string;

    /** Target graph ID (for scoping) */
    targetGraphId?: string;

    /** Target property name (for node_property binding) */
    targetProperty?: string;

    /** Description */
    description?: string;

    /** Is user-editable? */
    isUserEditable: boolean;

    /** Creation timestamp */
    createdAt: number;
}

// ============================================
// GRAPH POOL
// ============================================

/**
 * The complete Graph Pool for a System Shell
 */
export interface GraphPool {
    /** Pool identifier */
    id: string;

    /** System this pool belongs to */
    systemId: SystemType;

    /** Display name */
    name: string;

    /** Vector of graphs in this pool */
    graphs: Graph[];

    /** Cross-graph edges */
    crossEdges: CrossEdge[];

    /** Pool variables */
    variables: PoolVariable[];

    /** Version for migrations */
    version: number;

    /** Creation timestamp */
    createdAt: number;

    /** Last updated */
    updatedAt: number;
}

// ============================================
// DEFAULT GRAPH POOLS
// ============================================

const now = Date.now();

/**
 * Default Health System Graph Pool
 */
export const DEFAULT_HEALTH_GRAPH_POOL: GraphPool = {
    id: 'health_pool',
    systemId: 'health',
    name: 'Health Graph Pool',
    version: 1,
    createdAt: now,
    updatedAt: now,

    graphs: [
        // Movement Graph
        {
            id: 'health.movement',
            name: 'Movement',
            description: 'Physical activity and exercise',
            type: 'domain',
            icon: '🏃',
            color: '#f97316',
            nodes: [
                { id: 'steps', type: 'metric', label: 'Daily Steps', value: 0, unit: 'steps', target: 10000, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'active_minutes', type: 'metric', label: 'Active Minutes', value: 0, unit: 'min', target: 30, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'workouts', type: 'tracker', label: 'Workouts', value: 0, unit: 'sessions', properties: {}, createdAt: now, lastUpdated: now },
                { id: 'movement_energy', type: 'computed', label: 'Energy from Movement', value: 50, properties: {}, createdAt: now, lastUpdated: now }
            ],
            edges: [
                { id: 'steps_energy', source: 'steps', target: 'movement_energy', relation: 'increases', weight: 0.4, isUserDefined: false, properties: {}, createdAt: now },
                { id: 'active_energy', source: 'active_minutes', target: 'movement_energy', relation: 'increases', weight: 0.6, isUserDefined: false, properties: {}, createdAt: now }
            ],
            subscribedBlockTypes: ['health.exercise_tracker', 'health.workout_log', 'health.activity_rings'],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        },

        // Nutrition Graph
        {
            id: 'health.nutrition',
            name: 'Nutrition',
            description: 'Calories, macros, and hydration',
            type: 'domain',
            icon: '🥗',
            color: '#22c55e',
            nodes: [
                { id: 'calories', type: 'metric', label: 'Calories', value: 0, unit: 'kcal', target: 2000, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'water', type: 'metric', label: 'Water Intake', value: 0, unit: 'oz', target: 64, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'protein', type: 'metric', label: 'Protein', value: 0, unit: 'g', target: 120, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'nutrition_score', type: 'computed', label: 'Nutrition Score', value: 50, properties: {}, createdAt: now, lastUpdated: now }
            ],
            edges: [
                { id: 'cal_nutrition', source: 'calories', target: 'nutrition_score', relation: 'increases', weight: 0.4, isUserDefined: false, properties: {}, createdAt: now },
                { id: 'water_nutrition', source: 'water', target: 'nutrition_score', relation: 'increases', weight: 0.3, isUserDefined: false, properties: {}, createdAt: now },
                { id: 'protein_nutrition', source: 'protein', target: 'nutrition_score', relation: 'increases', weight: 0.3, isUserDefined: false, properties: {}, createdAt: now }
            ],
            subscribedBlockTypes: ['health.calorie_tracker', 'health.meal_planner', 'health.grocery_budget'],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        },

        // Sleep Graph
        {
            id: 'health.sleep',
            name: 'Sleep',
            description: 'Sleep quality and recovery',
            type: 'domain',
            icon: '😴',
            color: '#6366f1',
            nodes: [
                { id: 'sleep_duration', type: 'metric', label: 'Sleep Duration', value: 0, unit: 'hrs', target: 8, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'sleep_quality', type: 'metric', label: 'Sleep Quality', value: 0, unit: '%', target: 85, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'recovery', type: 'computed', label: 'Recovery', value: 50, properties: {}, createdAt: now, lastUpdated: now }
            ],
            edges: [
                { id: 'duration_recovery', source: 'sleep_duration', target: 'recovery', relation: 'increases', weight: 0.5, isUserDefined: false, properties: {}, createdAt: now },
                { id: 'quality_recovery', source: 'sleep_quality', target: 'recovery', relation: 'increases', weight: 0.5, isUserDefined: false, properties: {}, createdAt: now }
            ],
            subscribedBlockTypes: ['health.sleep_tracker', 'health.sleep_cycles', 'health.bedtime_routine'],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        },

        // Stress Graph
        {
            id: 'health.stress',
            name: 'Stress',
            description: 'Stress levels and mental load',
            type: 'domain',
            icon: '😤',
            color: '#ef4444',
            nodes: [
                { id: 'stress_level', type: 'metric', label: 'Stress Level', value: 50, unit: '/100', properties: {}, createdAt: now, lastUpdated: now },
                { id: 'anxiety', type: 'metric', label: 'Anxiety', value: 30, unit: '/100', properties: {}, createdAt: now, lastUpdated: now },
                { id: 'meditation', type: 'tracker', label: 'Meditation', value: 0, unit: 'min', target: 15, properties: {}, createdAt: now, lastUpdated: now }
            ],
            edges: [
                { id: 'meditation_stress', source: 'meditation', target: 'stress_level', relation: 'decreases', weight: 0.4, isUserDefined: false, properties: {}, createdAt: now },
                { id: 'anxiety_stress', source: 'anxiety', target: 'stress_level', relation: 'increases', weight: 0.6, isUserDefined: false, properties: {}, createdAt: now }
            ],
            subscribedBlockTypes: ['health.stress_log', 'health.meditation_timer', 'health.breath_guide'],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        },

        // Core Health Graph (aggregates from others)
        {
            id: 'health.core',
            name: 'Core Health',
            description: 'Aggregate health metrics',
            type: 'domain',
            icon: '❤️',
            color: '#ec4899',
            nodes: [
                { id: 'energy', type: 'computed', label: 'Energy', value: 50, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'vitality', type: 'computed', label: 'Vitality', value: 50, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'health_stability', type: 'computed', label: 'Health Stability', value: 50, properties: {}, createdAt: now, lastUpdated: now }
            ],
            edges: [
                { id: 'energy_vitality', source: 'energy', target: 'vitality', relation: 'increases', weight: 0.5, isUserDefined: false, properties: {}, createdAt: now },
                { id: 'vitality_stability', source: 'vitality', target: 'health_stability', relation: 'increases', weight: 1.0, isUserDefined: false, properties: {}, createdAt: now }
            ],
            subscribedBlockTypes: [],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        }
    ],

    crossEdges: [
        // Movement → Core
        { id: 'movement_to_energy', sourceGraphId: 'health.movement', sourceNodeId: 'movement_energy', targetGraphId: 'health.core', targetNodeId: 'energy', relation: 'increases', weight: 0.35, isUserDefined: false, createdAt: now },

        // Sleep → Core
        { id: 'sleep_to_energy', sourceGraphId: 'health.sleep', sourceNodeId: 'recovery', targetGraphId: 'health.core', targetNodeId: 'energy', relation: 'increases', weight: 0.35, isUserDefined: false, createdAt: now },

        // Nutrition → Core
        { id: 'nutrition_to_energy', sourceGraphId: 'health.nutrition', sourceNodeId: 'nutrition_score', targetGraphId: 'health.core', targetNodeId: 'energy', relation: 'increases', weight: 0.2, isUserDefined: false, createdAt: now },

        // Stress → Core (negative)
        { id: 'stress_to_energy', sourceGraphId: 'health.stress', sourceNodeId: 'stress_level', targetGraphId: 'health.core', targetNodeId: 'energy', relation: 'decreases', weight: 0.3, isUserDefined: false, createdAt: now },

        // Movement → Stress (negative - exercise reduces stress)
        { id: 'movement_to_stress', sourceGraphId: 'health.movement', sourceNodeId: 'workouts', targetGraphId: 'health.stress', targetNodeId: 'stress_level', relation: 'decreases', weight: 0.25, isUserDefined: false, createdAt: now },

        // Sleep → Stress (negative - good sleep reduces stress)
        { id: 'sleep_to_stress', sourceGraphId: 'health.sleep', sourceNodeId: 'recovery', targetGraphId: 'health.stress', targetNodeId: 'stress_level', relation: 'decreases', weight: 0.2, isUserDefined: false, createdAt: now }
    ],

    variables: [
        { id: 'movement_energy_weight', name: 'Movement → Energy Weight', value: 0.35, min: 0, max: 1, step: 0.05, bindingType: 'edge_weight', targetId: 'movement_to_energy', isUserEditable: true, createdAt: now },
        { id: 'sleep_energy_weight', name: 'Sleep → Energy Weight', value: 0.35, min: 0, max: 1, step: 0.05, bindingType: 'edge_weight', targetId: 'sleep_to_energy', isUserEditable: true, createdAt: now },
        { id: 'stress_penalty', name: 'Stress Energy Penalty', value: 0.3, min: 0, max: 1, step: 0.05, bindingType: 'edge_weight', targetId: 'stress_to_energy', isUserEditable: true, createdAt: now },
        { id: 'step_target', name: 'Daily Step Target', value: 10000, min: 1000, max: 30000, step: 1000, bindingType: 'node_property', targetId: 'steps', targetGraphId: 'health.movement', targetProperty: 'target', isUserEditable: true, createdAt: now }
    ]
};

/**
 * Default Relationships Graph Pool
 */
export const DEFAULT_RELATIONSHIPS_GRAPH_POOL: GraphPool = {
    id: 'relationships_pool',
    systemId: 'relationships',
    name: 'Relationships Graph Pool',
    version: 1,
    createdAt: now,
    updatedAt: now,

    graphs: [
        // Self Graph
        {
            id: 'relationships.self',
            name: 'Self',
            description: 'Your identity and values',
            type: 'entity',
            icon: '🧑',
            color: '#8b5cf6',
            nodes: [
                { id: 'self', type: 'entity', label: 'Me', icon: '🧑', properties: { isCore: true }, createdAt: now, lastUpdated: now }
            ],
            edges: [],
            subscribedBlockTypes: [],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        },

        // People Graph
        {
            id: 'relationships.people',
            name: 'People',
            description: 'People in your life',
            type: 'entity',
            icon: '👥',
            color: '#ec4899',
            nodes: [],
            edges: [],
            subscribedBlockTypes: ['relationships.contact_hub', 'relationships.interaction_log'],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        },

        // Connection Metrics Graph
        {
            id: 'relationships.metrics',
            name: 'Connection Metrics',
            description: 'Relationship health metrics',
            type: 'domain',
            icon: '📊',
            color: '#06b6d4',
            nodes: [
                { id: 'social_energy', type: 'computed', label: 'Social Energy', value: 50, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'network_health', type: 'computed', label: 'Network Health', value: 50, properties: {}, createdAt: now, lastUpdated: now },
                { id: 'isolation_level', type: 'metric', label: 'Isolation Level', value: 30, properties: {}, createdAt: now, lastUpdated: now }
            ],
            edges: [
                { id: 'isolation_social', source: 'isolation_level', target: 'social_energy', relation: 'decreases', weight: 0.5, isUserDefined: false, properties: {}, createdAt: now }
            ],
            subscribedBlockTypes: [],
            isSystemGraph: true,
            createdAt: now,
            updatedAt: now
        }
    ],

    crossEdges: [],

    variables: [
        { id: 'isolation_penalty', name: 'Isolation Penalty', value: 0.5, min: 0, max: 1, step: 0.1, bindingType: 'edge_weight', targetId: 'isolation_social', isUserEditable: true, createdAt: now }
    ]
};

/**
 * All default graph pools indexed by system
 */
export const DEFAULT_GRAPH_POOLS: Record<SystemType, GraphPool> = {
    health: DEFAULT_HEALTH_GRAPH_POOL,
    relationships: DEFAULT_RELATIONSHIPS_GRAPH_POOL,
    career: {
        id: 'career_pool',
        systemId: 'career',
        name: 'Career Graph Pool',
        version: 1,
        graphs: [
            {
                id: 'career.performance',
                name: 'Professional Performance',
                description: 'Output, focus, and project velocity',
                type: 'domain',
                icon: '💻',
                color: '#3b82f6',
                nodes: [
                    { id: 'focus', type: 'computed', label: 'Focus', value: 60, properties: {}, createdAt: now, lastUpdated: now },
                    { id: 'project_velocity', type: 'computed', label: 'Velocity', value: 50, properties: {}, createdAt: now, lastUpdated: now },
                    { id: 'tasks_completed', type: 'metric', label: 'Tasks Completed', value: 0, unit: 'count', properties: {}, createdAt: now, lastUpdated: now },
                    { id: 'deliverables', type: 'metric', label: 'Deliverables', value: 0, unit: 'count', properties: {}, createdAt: now, lastUpdated: now }
                ],
                edges: [
                    { id: 'tasks_to_velocity', source: 'tasks_completed', target: 'project_velocity', relation: 'increases', weight: 0.5, isUserDefined: false, properties: {}, createdAt: now },
                    { id: 'deliv_to_velocity', source: 'deliverables', target: 'project_velocity', relation: 'increases', weight: 0.5, isUserDefined: false, properties: {}, createdAt: now },
                    { id: 'vel_to_focus', source: 'project_velocity', target: 'focus', relation: 'increases', weight: 0.3, isUserDefined: false, properties: {}, createdAt: now }
                ],
                subscribedBlockTypes: ['career.task_manager', 'career.project_tracker'],
                isSystemGraph: true,
                createdAt: now,
                updatedAt: now
            },
            {
                id: 'career.growth',
                name: 'Career Growth',
                description: 'Skills, leverage, and network influence',
                type: 'domain',
                icon: '📈',
                color: '#8b5cf6',
                nodes: [
                    { id: 'skill_leverage', type: 'computed', label: 'Skill Leverage', value: 40, properties: {}, createdAt: now, lastUpdated: now },
                    { id: 'learning_hours', type: 'metric', label: 'Learning', value: 0, unit: 'hrs', properties: {}, createdAt: now, lastUpdated: now }
                ],
                edges: [
                    { id: 'learn_to_leverage', source: 'learning_hours', target: 'skill_leverage', relation: 'increases', weight: 0.8, isUserDefined: false, properties: {}, createdAt: now }
                ],
                subscribedBlockTypes: ['career.skill_radar', 'career.learning_log'],
                isSystemGraph: true,
                createdAt: now,
                updatedAt: now
            }
        ],
        crossEdges: [
            // INTER-SYSTEM: Health Stability → Career Focus
            { 
                id: 'health_to_career_focus', 
                sourceSystemId: 'health',
                sourceGraphId: 'health.core', 
                sourceNodeId: 'health_stability', 
                targetGraphId: 'career.performance', 
                targetNodeId: 'focus', 
                relation: 'increases', 
                weight: 0.6, 
                isUserDefined: false, 
                createdAt: now 
            }
        ],
        variables: [],
        createdAt: now,
        updatedAt: now
    },
    finance: {
        id: 'finance_pool',
        systemId: 'finance',
        name: 'Finance Graph Pool',
        version: 1,
        graphs: [
            {
                id: 'finance.liquidity',
                name: 'Liquidity & Cash Flow',
                description: 'Income, expenses, and burn rate',
                type: 'domain',
                icon: '💵',
                color: '#10b981',
                nodes: [
                    { id: 'cash_flow', type: 'computed', label: 'Cash Flow', value: 1000, unit: '$', properties: {}, createdAt: now, lastUpdated: now },
                    { id: 'income_node', type: 'metric', label: 'Income', value: 5000, unit: '$', properties: {}, createdAt: now, lastUpdated: now },
                    { id: 'expense_node', type: 'metric', label: 'Expenses', value: 4000, unit: '$', properties: {}, createdAt: now, lastUpdated: now },
                    { id: 'runway', type: 'computed', label: 'Runway', value: 6, unit: 'mo', properties: {}, createdAt: now, lastUpdated: now }
                ],
                edges: [
                    { id: 'inc_to_flow', source: 'income_node', target: 'cash_flow', relation: 'increases', weight: 1.0, isUserDefined: false, properties: {}, createdAt: now },
                    { id: 'exp_to_flow', source: 'expense_node', target: 'cash_flow', relation: 'decreases', weight: 1.0, isUserDefined: false, properties: {}, createdAt: now },
                    { id: 'flow_to_runway', source: 'cash_flow', target: 'runway', relation: 'increases', weight: 0.7, isUserDefined: false, properties: {}, createdAt: now }
                ],
                subscribedBlockTypes: ['finance.income_streams', 'finance.expense_tracker'],
                isSystemGraph: true,
                createdAt: now,
                updatedAt: now
            }
        ],
        crossEdges: [
            // INTER-SYSTEM: Career Velocity → Finance Income
            { 
                id: 'career_to_finance_income', 
                sourceSystemId: 'career',
                sourceGraphId: 'career.performance', 
                sourceNodeId: 'project_velocity', 
                targetGraphId: 'finance.liquidity', 
                targetNodeId: 'income_node', 
                relation: 'increases', 
                weight: 0.4, 
                isUserDefined: false, 
                createdAt: now 
            },
            // INTER-SYSTEM: Finance Runway → Health Stability (Safety)
            { 
                id: 'runway_to_health_safety', 
                sourceSystemId: 'finance',
                sourceGraphId: 'finance.liquidity', 
                sourceNodeId: 'runway', 
                targetGraphId: 'health.core', 
                targetNodeId: 'health_stability', 
                relation: 'increases', 
                weight: 0.2, 
                isUserDefined: false, 
                createdAt: now 
            }
        ],
        variables: [],
        createdAt: now,
        updatedAt: now
    },
    mind: {
        id: 'mind_pool',
        systemId: 'mind',
        name: 'Mind Graph Pool',
        version: 1,
        graphs: [],
        crossEdges: [],
        variables: [],
        createdAt: now,
        updatedAt: now
    },
    environment: {
        id: 'environment_pool',
        systemId: 'environment',
        name: 'Environment Graph Pool',
        version: 1,
        graphs: [],
        crossEdges: [],
        variables: [],
        createdAt: now,
        updatedAt: now
    },
    time: {
        id: 'time_pool',
        systemId: 'time',
        name: 'Time Graph Pool',
        version: 1,
        graphs: [],
        crossEdges: [],
        variables: [],
        createdAt: now,
        updatedAt: now
    }
};
