// ============================================
// PROJECT OMNI: TRACKER-ATTRIBUTE BRIDGE
// Maps domain trackers to stability attributes
// ============================================

import { SystemType, SystemAttribute } from '../schemas/core.schema';
import { DomainTracker } from '../schemas/domain.schema';
import { evaluateExpression } from '../schemas/safeExpression';

// ============================================
// TRACKER TO ATTRIBUTE MAPPING
// ============================================

export interface TrackerAttributeMapping {
    /** Tracker ID pattern (can use wildcards) */
    trackerId: string;

    /** Target system */
    systemId: SystemType;

    /** Target attribute ID */
    attributeId: string;

    /** Weight when aggregating multiple trackers */
    weight: number;

    /** Transform function name */
    transform: 'direct' | 'percent_of_target' | 'inverse' | 'scale_10_to_100' | 'custom';

    /** Custom transform expression (if transform is 'custom') */
    customFormula?: string;
}

export interface TrackerGraphMapping {
    /** Domain tracker ID */
    trackerId: string;

    /** Target system */
    systemId: SystemType;

    /** Target graph ID within the pool */
    graphId: string;

    /** Target node ID within the graph */
    nodeId: string;

    /** Transform function */
    transform: 'direct' | 'percent_of_target';
}

/**
 * Master mapping of trackers to stability attributes
 * This defines how tracker data flows into the stability engine
 */
export const TRACKER_ATTRIBUTE_MAP: TrackerAttributeMapping[] = [
    // ============================================
    // HEALTH SYSTEM MAPPINGS
    // ============================================

    // Movement trackers → Energy attribute
    {
        trackerId: 'steps',
        systemId: 'health',
        attributeId: 'energy',
        weight: 0.4,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'active_minutes',
        systemId: 'health',
        attributeId: 'energy',
        weight: 0.6,
        transform: 'percent_of_target'
    },

    // Sleep trackers → Sleep Quality attribute
    {
        trackerId: 'sleep_duration',
        systemId: 'health',
        attributeId: 'sleep_quality',
        weight: 0.5,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'sleep_quality',
        systemId: 'health',
        attributeId: 'sleep_quality',
        weight: 0.5,
        transform: 'direct'
    },

    // Stress tracker → Stress attribute (inverse - lower is better)
    {
        trackerId: 'stress_level',
        systemId: 'health',
        attributeId: 'stress',
        weight: 1.0,
        transform: 'scale_10_to_100'
    },

    // Meditation → reduces stress
    {
        trackerId: 'meditation_minutes',
        systemId: 'health',
        attributeId: 'stress',
        weight: -0.3,  // Negative = reduces stress
        transform: 'percent_of_target'
    },

    // Nutrition trackers → could map to energy or a nutrition attribute
    {
        trackerId: 'calories',
        systemId: 'health',
        attributeId: 'energy',
        weight: 0.2,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'water',
        systemId: 'health',
        attributeId: 'energy',
        weight: 0.15,
        transform: 'percent_of_target'
    },

    // ============================================
    // CAREER SYSTEM MAPPINGS
    // ============================================

    {
        trackerId: 'tasks_completed',
        systemId: 'career',
        attributeId: 'productivity',
        weight: 0.6,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'focus_hours',
        systemId: 'career',
        attributeId: 'productivity',
        weight: 0.4,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'skills_learned',
        systemId: 'career',
        attributeId: 'skill_growth',
        weight: 1.0,
        transform: 'direct'
    },

    // ============================================
    // FINANCE SYSTEM MAPPINGS
    // ============================================

    {
        trackerId: 'savings_balance',
        systemId: 'finance',
        attributeId: 'runway',
        weight: 1.0,
        transform: 'custom',
        customFormula: 'value / monthlyExpenses'  // Months of runway
    },
    {
        trackerId: 'savings_rate',
        systemId: 'finance',
        attributeId: 'savings_rate',
        weight: 1.0,
        transform: 'direct'
    },

    // ============================================
    // RELATIONSHIPS SYSTEM MAPPINGS
    // ============================================

    {
        trackerId: 'social_interactions',
        systemId: 'relationships',
        attributeId: 'connection',
        weight: 0.7,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'quality_time',
        systemId: 'relationships',
        attributeId: 'connection',
        weight: 0.3,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'days_alone',
        systemId: 'relationships',
        attributeId: 'isolation_level',
        weight: 1.0,
        transform: 'scale_10_to_100'
    },

    // ============================================
    // TIME SYSTEM MAPPINGS
    // ============================================

    {
        trackerId: 'deep_focus_hours',
        systemId: 'time',
        attributeId: 'focus_time',
        weight: 1.0,
        transform: 'direct'
    },
    {
        trackerId: 'work_hours',
        systemId: 'time',
        attributeId: 'balance',
        weight: 1.0,
        transform: 'custom',
        customFormula: '100 - Math.abs(value - 40) * 2'  // Optimal around 40 hrs
    },

    // ============================================
    // MIND SYSTEM MAPPINGS
    // ============================================

    {
        trackerId: 'focus_sessions',
        systemId: 'mind',
        attributeId: 'clarity',
        weight: 0.5,
        transform: 'percent_of_target'
    },
    {
        trackerId: 'creative_output',
        systemId: 'mind',
        attributeId: 'creativity',
        weight: 1.0,
        transform: 'percent_of_target'
    },

    // ============================================
    // ENVIRONMENT SYSTEM MAPPINGS
    // ============================================

    {
        trackerId: 'space_organization',
        systemId: 'environment',
        attributeId: 'organization',
        weight: 1.0,
        transform: 'direct'
    },
    {
        trackerId: 'comfort_rating',
        systemId: 'environment',
        attributeId: 'comfort',
        weight: 1.0,
        transform: 'scale_10_to_100'
    }
];

/**
 * Mappings from domain trackers to graph pool nodes
 */
export const TRACKER_GRAPH_MAP: TrackerGraphMapping[] = [
    // Health System
    { trackerId: 'steps', systemId: 'health', graphId: 'health.movement', nodeId: 'steps', transform: 'direct' },
    { trackerId: 'active_minutes', systemId: 'health', graphId: 'health.movement', nodeId: 'active_minutes', transform: 'direct' },
    { trackerId: 'sleep_duration', systemId: 'health', graphId: 'health.sleep', nodeId: 'sleep_duration', transform: 'direct' },
    { trackerId: 'sleep_quality', systemId: 'health', graphId: 'health.sleep', nodeId: 'sleep_quality', transform: 'direct' },
    { trackerId: 'stress_level', systemId: 'health', graphId: 'health.stress', nodeId: 'stress_level', transform: 'direct' },
    { trackerId: 'meditation_minutes', systemId: 'health', graphId: 'health.stress', nodeId: 'meditation', transform: 'direct' },
    { trackerId: 'calories', systemId: 'health', graphId: 'health.nutrition', nodeId: 'calories', transform: 'direct' },
    { trackerId: 'water', systemId: 'health', graphId: 'health.nutrition', nodeId: 'water', transform: 'direct' }
];

// ============================================
// TRANSFORM FUNCTIONS
// ============================================

/**
 * Apply transform to tracker value
 */
export function transformTrackerValue(
    tracker: DomainTracker,
    mapping: TrackerAttributeMapping
): number {
    const value = tracker.currentValue;
    const target = tracker.target || 100;

    switch (mapping.transform) {
        case 'direct':
            // Direct value (0-100 assumed)
            return Math.min(100, Math.max(0, value));

        case 'percent_of_target':
            // Value as percentage of target
            return Math.min(100, (value / target) * 100);

        case 'inverse':
            // Higher value = lower attribute (e.g., stress)
            return Math.max(0, 100 - value);

        case 'scale_10_to_100':
            // Scale 0-10 rating to 0-100
            return value * 10;

        case 'custom':
            // Evaluate custom formula safely (no arbitrary JS — see safeExpression.ts).
            // Preserve original behavior: fall back to the raw value on any error.
            if (mapping.customFormula) {
                try {
                    const result = evaluateExpression(mapping.customFormula, { value, target });
                    return Math.min(100, Math.max(0, result));
                } catch {
                    return value;
                }
            }
            return value;

        default:
            return value;
    }
}

// ============================================
// AGGREGATION ENGINE
// ============================================

export interface AggregatedAttribute {
    systemId: SystemType;
    attributeId: string;
    value: number;
    contributors: {
        trackerId: string;
        trackerName: string;
        rawValue: number;
        transformedValue: number;
        weight: number;
        contribution: number;
    }[];
    lastUpdated: number;
}

/**
 * Aggregate trackers into system attributes
 */
export function aggregateTrackersToAttributes(
    trackers: DomainTracker[],
    systemId?: SystemType
): AggregatedAttribute[] {
    // Group trackers by their target attributes
    const attributeMap = new Map<string, {
        systemId: SystemType;
        attributeId: string;
        contributions: {
            tracker: DomainTracker;
            mapping: TrackerAttributeMapping;
            transformedValue: number;
        }[];
    }>();

    for (const tracker of trackers) {
        // Find mappings for this tracker
        const mappings = TRACKER_ATTRIBUTE_MAP.filter(m =>
            m.trackerId === tracker.id &&
            (!systemId || m.systemId === systemId)
        );

        for (const mapping of mappings) {
            const key = `${mapping.systemId}:${mapping.attributeId}`;
            const transformedValue = transformTrackerValue(tracker, mapping);

            if (!attributeMap.has(key)) {
                attributeMap.set(key, {
                    systemId: mapping.systemId,
                    attributeId: mapping.attributeId,
                    contributions: []
                });
            }

            attributeMap.get(key)!.contributions.push({
                tracker,
                mapping,
                transformedValue
            });
        }
    }

    // Compute weighted averages for each attribute
    const results: AggregatedAttribute[] = [];

    for (const [, data] of attributeMap) {
        // Separate positive and negative weights
        const positiveContribs = data.contributions.filter(c => c.mapping.weight >= 0);
        const negativeContribs = data.contributions.filter(c => c.mapping.weight < 0);

        // Weighted average for positive contributions
        const totalPositiveWeight = positiveContribs.reduce((sum, c) => sum + c.mapping.weight, 0);
        const positiveValue = totalPositiveWeight > 0
            ? positiveContribs.reduce((sum, c) => sum + (c.transformedValue * c.mapping.weight), 0) / totalPositiveWeight
            : 0;

        // Subtract negative contributions (like meditation reducing stress)
        const negativeReduction = negativeContribs.reduce((sum, c) =>
            sum + (c.transformedValue * Math.abs(c.mapping.weight)), 0
        );

        let finalValue = Math.max(0, Math.min(100, positiveValue - negativeReduction));

        // If no positive contributions, just return negative reduction from 50 (neutral)
        if (positiveContribs.length === 0 && negativeContribs.length > 0) {
            finalValue = Math.max(0, 50 - negativeReduction);
        }

        results.push({
            systemId: data.systemId,
            attributeId: data.attributeId,
            value: Math.round(finalValue),
            contributors: data.contributions.map(c => ({
                trackerId: c.tracker.id,
                trackerName: c.tracker.name,
                rawValue: c.tracker.currentValue,
                transformedValue: c.transformedValue,
                weight: c.mapping.weight,
                contribution: c.transformedValue * c.mapping.weight
            })),
            lastUpdated: Math.max(...data.contributions.map(c => c.tracker.lastUpdated))
        });
    }

    return results;
}

/**
 * Convert aggregated attributes to SystemAttribute[] for stability computation
 */
export function toSystemAttributes(
    aggregated: AggregatedAttribute[]
): SystemAttribute[] {
    return aggregated.map(a => ({
        id: a.attributeId,
        name: a.attributeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: a.value,
        trend: 'stable' as const,  // Could be computed from history
        lastUpdated: a.lastUpdated
    }));
}

export default {
    TRACKER_ATTRIBUTE_MAP,
    TRACKER_GRAPH_MAP,
    transformTrackerValue,
    aggregateTrackersToAttributes,
    toSystemAttributes
};
