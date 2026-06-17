// ============================================
// PROJECT OMNI: DOMAIN SCHEMA
// Hierarchical sub-domain structure for Life Systems
// ============================================

import { SystemType } from './core.schema';

// ============================================
// DOMAIN HIERARCHY TYPES
// ============================================

/**
 * Domain hierarchy levels
 * system → primary → secondary → functional
 */
export type DomainLevel = 'system' | 'primary' | 'secondary' | 'functional';

/**
 * Framework overlay types for domain organization
 */
export type FrameworkType = 'maslow' | 'wellness_wheel' | 'custom';

/**
 * Tracker input types
 */
export type TrackerType = 'counter' | 'gauge' | 'log' | 'checklist' | 'duration' | 'rating';

/**
 * Data source for trackers
 */
export type TrackerSource = 'manual' | 'apple_health' | 'fitbit' | 'google_fit' | 'oura' | 'whoop' | 'computed';

// ============================================
// MASLOW'S HIERARCHY LEVELS
// ============================================

export type MaslowLevel =
    | 'physiological'      // Food, water, shelter, sleep
    | 'safety'             // Security, stability, health
    | 'love_belonging'     // Relationships, connection
    | 'esteem'             // Achievement, respect
    | 'self_actualization';// Purpose, growth, transcendence

export interface MaslowMapping {
    level: MaslowLevel;
    fulfillment: number;  // 0-100
    contributingDomains: string[];  // Domain IDs that contribute
}

// ============================================
// DOMAIN TRACKER
// ============================================

/**
 * A tracker entry (historical data point)
 */
export interface TrackerEntry {
    id: string;
    timestamp: number;
    value: number;
    note?: string;
    source: TrackerSource;
    metadata?: Record<string, unknown>;
}

/**
 * A domain tracker configuration
 */
export interface DomainTracker {
    id: string;
    domainId: string;
    name: string;
    icon: string;
    type: TrackerType;
    unit?: string;

    // Target/goal configuration
    target?: number;
    targetPeriod?: 'daily' | 'weekly' | 'monthly';

    // Current state
    currentValue: number;
    lastUpdated: number;

    // Data source
    source: TrackerSource;
    externalId?: string;  // ID in external system (e.g., Apple Health identifier)

    // History
    history: TrackerEntry[];
    historyLimit: number;  // Max entries to keep

    // Visualization
    chartType?: 'line' | 'bar' | 'radial' | 'heatmap';
    color?: string;
}

// ============================================
// DOMAIN METRIC (Computed/Aggregated)
// ============================================

/**
 * A computed metric aggregated from trackers or sub-domains
 */
export interface DomainMetric {
    id: string;
    name: string;
    value: number;
    unit?: string;
    trend: 'up' | 'down' | 'stable';
    trendPercent?: number;
    source: 'computed' | 'manual' | 'block' | 'tracker';
    sourceIds?: string[];  // IDs of contributing sources
    lastUpdated: number;
}

// ============================================
// SYSTEM DOMAIN
// ============================================

/**
 * A hierarchical domain within a Life System
 */
export interface SystemDomain {
    /** Unique domain identifier */
    id: string;

    /** Parent system (health, career, etc.) */
    systemId: SystemType;

    /** Parent domain ID (for nested domains) */
    parentDomainId?: string;

    /** Hierarchy level */
    level: DomainLevel;

    /** Display name */
    name: string;

    /** Emoji icon */
    icon: string;

    /** Description */
    description: string;

    /** Color theme (hex or CSS variable) */
    color?: string;

    /** Child domain IDs */
    childDomainIds: string[];

    /** Trackers in this domain */
    trackers: DomainTracker[];

    /** Available block types for this domain */
    availableBlockTypes: string[];

    /** Active block instance IDs */
    blockInstanceIds: string[];

    /** Aggregated metrics from trackers/children */
    metrics: DomainMetric[];

    /** Maslow's pyramid mapping */
    maslowLevel?: MaslowLevel;

    /** Order for display */
    sortOrder: number;

    /** Whether domain is expanded in UI */
    isExpanded: boolean;

    /** Creation timestamp */
    createdAt: number;

    /** Last updated */
    updatedAt: number;
}

// ============================================
// FRAMEWORK OVERLAY
// ============================================

/**
 * A framework level (e.g., one level of Maslow's pyramid)
 */
export interface FrameworkLevel {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    sortOrder: number;
    fulfillment: number;  // 0-100
}

/**
 * A framework overlay for organizing/visualizing domains
 */
export interface FrameworkOverlay {
    id: string;
    type: FrameworkType;
    name: string;
    description: string;
    levels: FrameworkLevel[];
    isActive: boolean;
    createdAt: number;
}

// ============================================
// HEALTH SYSTEM DEFAULTS
// ============================================

export const MASLOW_PYRAMID: FrameworkOverlay = {
    id: 'maslow_pyramid',
    type: 'maslow',
    name: "Maslow's Hierarchy of Needs",
    description: 'Five-tier model of human needs from physiological to self-actualization',
    isActive: true,
    createdAt: Date.now(),
    levels: [
        {
            id: 'physiological',
            name: 'Physiological',
            description: 'Food, water, shelter, sleep, breathing',
            icon: '🫀',
            color: '#ef4444',  // Red
            sortOrder: 1,
            fulfillment: 0
        },
        {
            id: 'safety',
            name: 'Safety',
            description: 'Security, stability, health, property',
            icon: '🛡️',
            color: '#f97316',  // Orange
            sortOrder: 2,
            fulfillment: 0
        },
        {
            id: 'love_belonging',
            name: 'Love & Belonging',
            description: 'Relationships, family, friendship, connection',
            icon: '💞',
            color: '#eab308',  // Yellow
            sortOrder: 3,
            fulfillment: 0
        },
        {
            id: 'esteem',
            name: 'Esteem',
            description: 'Achievement, respect, recognition, confidence',
            icon: '🏆',
            color: '#22c55e',  // Green
            sortOrder: 4,
            fulfillment: 0
        },
        {
            id: 'self_actualization',
            name: 'Self-Actualization',
            description: 'Purpose, creativity, growth, transcendence',
            icon: '✨',
            color: '#8b5cf6',  // Purple
            sortOrder: 5,
            fulfillment: 0
        }
    ]
};

/**
 * Default Health system domains
 */
export const DEFAULT_HEALTH_DOMAINS: Omit<SystemDomain, 'createdAt' | 'updatedAt'>[] = [
    // PRIMARY DOMAINS (Body, Mind, Spirit)
    {
        id: 'health.body',
        systemId: 'health',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Body',
        icon: '💪',
        description: 'Physical health, fitness, and vitality',
        color: '#ef4444',
        childDomainIds: ['health.body.movement', 'health.body.nutrition', 'health.body.sleep'],
        trackers: [],
        availableBlockTypes: [],
        blockInstanceIds: [],
        metrics: [
            { id: 'body_score', name: 'Body Score', value: 75, trend: 'up', source: 'computed', lastUpdated: Date.now() }
        ],
        maslowLevel: 'physiological',
        sortOrder: 1,
        isExpanded: true
    },
    {
        id: 'health.mind',
        systemId: 'health',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Mind',
        icon: '🧘',
        description: 'Mental clarity, focus, and cognitive health',
        color: '#8b5cf6',
        childDomainIds: ['health.mind.meditation', 'health.mind.cognitive', 'health.mind.stress'],
        trackers: [],
        availableBlockTypes: [],
        blockInstanceIds: [],
        metrics: [
            { id: 'mind_score', name: 'Mind Score', value: 70, trend: 'stable', source: 'computed', lastUpdated: Date.now() }
        ],
        maslowLevel: 'self_actualization',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'health.spirit',
        systemId: 'health',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Spirit',
        icon: '✨',
        description: 'Purpose, meaning, and transcendence',
        color: '#6366f1',
        childDomainIds: ['health.spirit.purpose', 'health.spirit.gratitude', 'health.spirit.connection'],
        trackers: [],
        availableBlockTypes: [],
        blockInstanceIds: [],
        metrics: [
            { id: 'spirit_score', name: 'Spirit Score', value: 65, trend: 'up', source: 'computed', lastUpdated: Date.now() }
        ],
        maslowLevel: 'self_actualization',
        sortOrder: 3,
        isExpanded: false
    },

    // SECONDARY DOMAINS (Under Body)
    {
        id: 'health.body.movement',
        systemId: 'health',
        parentDomainId: 'health.body',
        level: 'secondary',
        name: 'Movement',
        icon: '🏃',
        description: 'Exercise, activity, and physical movement',
        color: '#f97316',
        childDomainIds: [],
        trackers: [
            {
                id: 'steps',
                domainId: 'health.body.movement',
                name: 'Daily Steps',
                icon: '👟',
                type: 'counter',
                unit: 'steps',
                target: 10000,
                targetPeriod: 'daily',
                currentValue: 6500,
                lastUpdated: Date.now(),
                source: 'apple_health',
                history: [],
                historyLimit: 90,
                chartType: 'bar',
                color: '#f97316'
            },
            {
                id: 'active_minutes',
                domainId: 'health.body.movement',
                name: 'Active Minutes',
                icon: '⏱️',
                type: 'duration',
                unit: 'min',
                target: 30,
                targetPeriod: 'daily',
                currentValue: 22,
                lastUpdated: Date.now(),
                source: 'apple_health',
                history: [],
                historyLimit: 90,
                chartType: 'line',
                color: '#22c55e'
            }
        ],
        availableBlockTypes: ['health.exercise_tracker', 'health.workout_log', 'health.activity_rings'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'physiological',
        sortOrder: 1,
        isExpanded: false
    },
    {
        id: 'health.body.nutrition',
        systemId: 'health',
        parentDomainId: 'health.body',
        level: 'secondary',
        name: 'Nutrition',
        icon: '🥗',
        description: 'Calories, macros, hydration, and diet',
        color: '#22c55e',
        childDomainIds: [],
        trackers: [
            {
                id: 'calories',
                domainId: 'health.body.nutrition',
                name: 'Calories',
                icon: '🔥',
                type: 'counter',
                unit: 'kcal',
                target: 2000,
                targetPeriod: 'daily',
                currentValue: 1450,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 90,
                chartType: 'bar',
                color: '#ef4444'
            },
            {
                id: 'water',
                domainId: 'health.body.nutrition',
                name: 'Water Intake',
                icon: '💧',
                type: 'counter',
                unit: 'oz',
                target: 64,
                targetPeriod: 'daily',
                currentValue: 40,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 90,
                chartType: 'radial',
                color: '#3b82f6'
            }
        ],
        availableBlockTypes: ['health.calorie_tracker', 'health.grocery_budget', 'health.recipe_finder', 'health.meal_planner'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'physiological',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'health.body.sleep',
        systemId: 'health',
        parentDomainId: 'health.body',
        level: 'secondary',
        name: 'Sleep',
        icon: '😴',
        description: 'Sleep quality, duration, and cycles',
        color: '#6366f1',
        childDomainIds: [],
        trackers: [
            {
                id: 'sleep_duration',
                domainId: 'health.body.sleep',
                name: 'Sleep Duration',
                icon: '🛏️',
                type: 'duration',
                unit: 'hrs',
                target: 8,
                targetPeriod: 'daily',
                currentValue: 7.2,
                lastUpdated: Date.now(),
                source: 'apple_health',
                history: [],
                historyLimit: 90,
                chartType: 'line',
                color: '#6366f1'
            },
            {
                id: 'sleep_quality',
                domainId: 'health.body.sleep',
                name: 'Sleep Quality',
                icon: '⭐',
                type: 'rating',
                unit: '%',
                target: 85,
                targetPeriod: 'daily',
                currentValue: 78,
                lastUpdated: Date.now(),
                source: 'oura',
                history: [],
                historyLimit: 90,
                chartType: 'line',
                color: '#8b5cf6'
            }
        ],
        availableBlockTypes: ['health.sleep_tracker', 'health.sleep_cycles', 'health.bedtime_routine'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'physiological',
        sortOrder: 3,
        isExpanded: false
    },

    // Mind sub-domains
    {
        id: 'health.mind.meditation',
        systemId: 'health',
        parentDomainId: 'health.mind',
        level: 'secondary',
        name: 'Meditation',
        icon: '🧘‍♂️',
        description: 'Mindfulness and meditation practice',
        color: '#8b5cf6',
        childDomainIds: [],
        trackers: [
            {
                id: 'meditation_minutes',
                domainId: 'health.mind.meditation',
                name: 'Meditation Time',
                icon: '🕐',
                type: 'duration',
                unit: 'min',
                target: 15,
                targetPeriod: 'daily',
                currentValue: 10,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 90,
                chartType: 'line',
                color: '#8b5cf6'
            }
        ],
        availableBlockTypes: ['health.meditation_timer', 'health.breath_guide'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'self_actualization',
        sortOrder: 1,
        isExpanded: false
    },
    {
        id: 'health.mind.cognitive',
        systemId: 'health',
        parentDomainId: 'health.mind',
        level: 'secondary',
        name: 'Cognitive',
        icon: '🧠',
        description: 'Focus, memory, and mental clarity',
        color: '#ec4899',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['health.focus_timer', 'health.brain_games'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'esteem',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'health.mind.stress',
        systemId: 'health',
        parentDomainId: 'health.mind',
        level: 'secondary',
        name: 'Stress',
        icon: '😤',
        description: 'Stress levels and management',
        color: '#f97316',
        childDomainIds: [],
        trackers: [
            {
                id: 'stress_level',
                domainId: 'health.mind.stress',
                name: 'Stress Level',
                icon: '📊',
                type: 'rating',
                unit: '/10',
                target: 3,
                targetPeriod: 'daily',
                currentValue: 5,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 90,
                chartType: 'line',
                color: '#f97316'
            }
        ],
        availableBlockTypes: ['health.stress_log', 'health.hrv_tracker'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'safety',
        sortOrder: 3,
        isExpanded: false
    },

    // Spirit sub-domains
    {
        id: 'health.spirit.purpose',
        systemId: 'health',
        parentDomainId: 'health.spirit',
        level: 'secondary',
        name: 'Purpose',
        icon: '🎯',
        description: 'Life purpose and meaning',
        color: '#6366f1',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['health.purpose_journal', 'health.values_tracker'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'self_actualization',
        sortOrder: 1,
        isExpanded: false
    },
    {
        id: 'health.spirit.gratitude',
        systemId: 'health',
        parentDomainId: 'health.spirit',
        level: 'secondary',
        name: 'Gratitude',
        icon: '🙏',
        description: 'Gratitude practice and appreciation',
        color: '#eab308',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['health.gratitude_journal'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'love_belonging',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'health.spirit.connection',
        systemId: 'health',
        parentDomainId: 'health.spirit',
        level: 'secondary',
        name: 'Connection',
        icon: '🤝',
        description: 'Spiritual connection and community',
        color: '#ec4899',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['health.connection_log'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'love_belonging',
        sortOrder: 3,
        isExpanded: false
    }
];

/**
 * Default Relationships system domains
 */
export const DEFAULT_RELATIONSHIPS_DOMAINS: Omit<SystemDomain, 'createdAt' | 'updatedAt'>[] = [
    // PRIMARY DOMAINS
    {
        id: 'relationships.inner_circle',
        systemId: 'relationships',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Inner Circle',
        icon: '🫂',
        description: 'Close family, friends, and intimate partners',
        color: '#ef4444',
        childDomainIds: ['relationships.inner.family', 'relationships.inner.friends', 'relationships.inner.partner'],
        trackers: [],
        availableBlockTypes: [],
        blockInstanceIds: [],
        metrics: [
            { id: 'connection_depth', name: 'Connection Depth', value: 70, trend: 'up', source: 'computed', lastUpdated: Date.now() }
        ],
        maslowLevel: 'love_belonging',
        sortOrder: 1,
        isExpanded: true
    },
    {
        id: 'relationships.community',
        systemId: 'relationships',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Community',
        icon: '🏘️',
        description: 'Groups, social circles, and local community',
        color: '#eab308',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['relationships.group_manager', 'relationships.gift_tracker', 'relationships.family_tree'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'love_belonging',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'relationships.growth',
        systemId: 'relationships',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Conflict & Growth',
        icon: '🌱',
        description: 'Communication, resolution, and relational skills',
        color: '#22c55e',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['relationships.conflict_resolution', 'relationships.gratitude_letters'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'esteem',
        sortOrder: 3,
        isExpanded: false
    },

    // SECONDARY DOMAINS (Under Inner Circle)
    {
        id: 'relationships.inner.family',
        systemId: 'relationships',
        parentDomainId: 'relationships.inner_circle',
        level: 'secondary',
        name: 'Family',
        icon: '🏠',
        description: 'Direct family and close relatives',
        color: '#ef4444',
        childDomainIds: [],
        trackers: [
            {
                id: 'family_visits',
                domainId: 'relationships.inner.family',
                name: 'Family Interactions',
                icon: '👋',
                type: 'counter',
                unit: 'times',
                target: 4,
                targetPeriod: 'monthly',
                currentValue: 2,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 12,
                chartType: 'bar',
                color: '#ef4444'
            }
        ],
        availableBlockTypes: ['relationships.contact_hub', 'relationships.interaction_log'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'love_belonging',
        sortOrder: 1,
        isExpanded: false
    },
    {
        id: 'relationships.inner.friends',
        systemId: 'relationships',
        parentDomainId: 'relationships.inner_circle',
        level: 'secondary',
        name: 'Friends',
        icon: '🤝',
        description: 'Close social bonds and friendships',
        color: '#f97316',
        childDomainIds: [],
        trackers: [
            {
                id: 'social_events',
                domainId: 'relationships.inner.friends',
                name: 'Social Events',
                icon: '🎉',
                type: 'counter',
                unit: 'events',
                target: 2,
                targetPeriod: 'weekly',
                currentValue: 1,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 52,
                chartType: 'bar',
                color: '#f97316'
            }
        ],
        availableBlockTypes: ['relationships.contact_hub', 'relationships.interaction_log'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'love_belonging',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'relationships.inner.partner',
        systemId: 'relationships',
        parentDomainId: 'relationships.inner_circle',
        level: 'secondary',
        name: 'Partner',
        icon: '❤️',
        description: 'Intimate relationships and partnership',
        color: '#ec4899',
        childDomainIds: [],
        trackers: [
            {
                id: 'quality_time',
                domainId: 'relationships.inner.partner',
                name: 'Quality Time',
                icon: '⏲️',
                type: 'duration',
                unit: 'hrs',
                target: 10,
                targetPeriod: 'weekly',
                currentValue: 4.5,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 52,
                chartType: 'line',
                color: '#ec4899'
            }
        ],
        availableBlockTypes: ['relationships.date_planner', 'relationships.interaction_log'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'love_belonging',
        sortOrder: 3,
        isExpanded: false
    }
];

/**
 * Default Career system domains
 */
export const DEFAULT_CAREER_DOMAINS: Omit<SystemDomain, 'createdAt' | 'updatedAt'>[] = [
    // PRIMARY DOMAINS
    {
        id: 'career.work',
        systemId: 'career',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Work',
        icon: '💻',
        description: 'Active projects, tasks, and core deliverables',
        color: '#3b82f6',
        childDomainIds: ['career.work.projects', 'career.work.daily'],
        trackers: [],
        availableBlockTypes: [],
        blockInstanceIds: [],
        metrics: [
            { id: 'productivity_score', name: 'Productivity', value: 75, trend: 'stable', source: 'computed', lastUpdated: Date.now() }
        ],
        maslowLevel: 'esteem',
        sortOrder: 1,
        isExpanded: true
    },
    {
        id: 'career.growth',
        systemId: 'career',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Growth',
        icon: '📈',
        description: 'Skill development, learning, and reputation',
        color: '#8b5cf6',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['career.skill_radar', 'career.learning_log', 'career.mentor_tracker'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'self_actualization',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'career.network',
        systemId: 'career',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Network',
        icon: '🕸️',
        description: 'Professional connections and opportunities',
        color: '#ec4899',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['career.network_map', 'career.job_board'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'love_belonging',
        sortOrder: 3,
        isExpanded: false
    },

    // SECONDARY DOMAINS
    {
        id: 'career.work.projects',
        systemId: 'career',
        parentDomainId: 'career.work',
        level: 'secondary',
        name: 'Projects',
        icon: '📊',
        description: 'Large scale initiatives and milestones',
        color: '#3b82f6',
        childDomainIds: [],
        trackers: [
            {
                id: 'milestones_completed',
                domainId: 'career.work.projects',
                name: 'Milestones',
                icon: '🏁',
                type: 'counter',
                unit: 'count',
                target: 5,
                targetPeriod: 'weekly',
                currentValue: 2,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 10,
                chartType: 'bar',
                color: '#3b82f6'
            }
        ],
        availableBlockTypes: ['career.project_tracker', 'career.meeting_notes'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'esteem',
        sortOrder: 1,
        isExpanded: false
    },
    {
        id: 'career.work.daily',
        systemId: 'career',
        parentDomainId: 'career.work',
        level: 'secondary',
        name: 'Daily Output',
        icon: '✅',
        description: 'Daily tasks and focus execution',
        color: '#10b981',
        childDomainIds: [],
        trackers: [
            {
                id: 'tasks_done',
                domainId: 'career.work.daily',
                name: 'Tasks Done',
                icon: '✔️',
                type: 'counter',
                unit: 'tasks',
                target: 8,
                targetPeriod: 'daily',
                currentValue: 4,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 30,
                chartType: 'bar',
                color: '#10b981'
            }
        ],
        availableBlockTypes: ['career.task_manager'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'esteem',
        sortOrder: 2,
        isExpanded: false
    }
];

/**
 * Default Finance system domains
 */
export const DEFAULT_FINANCE_DOMAINS: Omit<SystemDomain, 'createdAt' | 'updatedAt'>[] = [
    // PRIMARY DOMAINS
    {
        id: 'finance.assets',
        systemId: 'finance',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Assets',
        icon: '💰',
        description: 'Income, investments, and net worth',
        color: '#10b981',
        childDomainIds: ['finance.assets.income', 'finance.assets.investments'],
        trackers: [],
        availableBlockTypes: [],
        blockInstanceIds: [],
        metrics: [
            { id: 'net_worth', name: 'Net Worth', value: 80, trend: 'up', source: 'computed', lastUpdated: Date.now() }
        ],
        maslowLevel: 'safety',
        sortOrder: 1,
        isExpanded: true
    },
    {
        id: 'finance.expenses',
        systemId: 'finance',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Expenses',
        icon: '💳',
        description: 'Spending, bills, and budget management',
        color: '#ef4444',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['finance.budget_dashboard', 'finance.expense_tracker', 'finance.bill_calendar', 'finance.subscription_manager'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'safety',
        sortOrder: 2,
        isExpanded: false
    },
    {
        id: 'finance.planning',
        systemId: 'finance',
        parentDomainId: undefined,
        level: 'primary',
        name: 'Planning',
        icon: '🎯',
        description: 'Savings goals and long-term strategy',
        color: '#3b82f6',
        childDomainIds: [],
        trackers: [],
        availableBlockTypes: ['finance.savings_goals', 'finance.net_worth_tracker'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'safety',
        sortOrder: 3,
        isExpanded: false
    },

    // SECONDARY DOMAINS
    {
        id: 'finance.assets.income',
        systemId: 'finance',
        parentDomainId: 'finance.assets',
        level: 'secondary',
        name: 'Income',
        icon: '💵',
        description: 'Salary and other revenue sources',
        color: '#10b981',
        childDomainIds: [],
        trackers: [
            {
                id: 'monthly_revenue',
                domainId: 'finance.assets.income',
                name: 'Monthly Revenue',
                icon: '🏦',
                type: 'counter',
                unit: '$',
                currentValue: 5000,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 12,
                chartType: 'bar',
                color: '#10b981'
            }
        ],
        availableBlockTypes: ['finance.income_streams'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'safety',
        sortOrder: 1,
        isExpanded: false
    },
    {
        id: 'finance.assets.investments',
        systemId: 'finance',
        parentDomainId: 'finance.assets',
        level: 'secondary',
        name: 'Portfolio',
        icon: '📈',
        description: 'Stocks, crypto, and other investments',
        color: '#3b82f6',
        childDomainIds: [],
        trackers: [
            {
                id: 'portfolio_value',
                domainId: 'finance.assets.investments',
                name: 'Portfolio Value',
                icon: '💎',
                type: 'counter',
                unit: '$',
                currentValue: 25000,
                lastUpdated: Date.now(),
                source: 'manual',
                history: [],
                historyLimit: 365,
                chartType: 'line',
                color: '#3b82f6'
            }
        ],
        availableBlockTypes: ['finance.investment_portfolio'],
        blockInstanceIds: [],
        metrics: [],
        maslowLevel: 'safety',
        sortOrder: 2,
        isExpanded: false
    }
];
