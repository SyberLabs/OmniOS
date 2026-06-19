import { SystemType } from './core.schema';

/**
 * Master Rule: A cross-system condition that triggers a global action
 */
export interface MasterRule {
    id: string;
    name: string;
    description: string;
    /** Condition syntax: "[systemId].[graphId].[nodeId] [operator] [value]" */
    condition: string;
    action: MasterRuleAction;
    isActive: boolean;
    priority: number;
}

export interface MasterRuleAction {
    type: 'add_global_alert' | 'modify_system_stability' | 'trigger_intervention';
    message?: string;
    severity?: 'info' | 'warning' | 'critical' | 'emergency';
    targetSystemId?: SystemType;
    stabilityDelta?: number;
    interventionId?: string;
}

/**
 * System Equilibrium: The state of balance between the 7 life systems
 */
export interface EquilibriumState {
    /** Total system order vs disorder (0-100, 0 is perfect order) */
    entropy: number;
    /** Current active Master Rule alerts */
    alerts: MasterRuleAlert[];
    /** Historical equilibrium scores */
    history: EquilibriumSnaphot[];
    /** System weights for balance calculation */
    systemWeights: Record<SystemType, number>;
}

export interface MasterRuleAlert {
    id: string;
    ruleId: string;
    message: string;
    severity: 'info' | 'warning' | 'critical' | 'emergency';
    timestamp: number;
    isDismissed: boolean;
}

export interface EquilibriumSnaphot {
    timestamp: number;
    entropy: number;
    systemScores: Record<SystemType, number>;
}

/**
 * Default Master Rules for the Trinity
 */
export const DEFAULT_MASTER_RULES: MasterRule[] = [
    {
        id: 'rule_burnout_v2',
        name: 'The Icarus Rule (Burnout Protection)',
        description: 'Triggers when career velocity is high but health stability is failing.',
        condition: 'career.performance.project_velocity > 70 && health.core.health_stability < 40',
        action: {
            type: 'add_global_alert',
            message: 'CRITICAL: High professional velocity on low biological fuel. Burnout imminent.',
            severity: 'critical'
        },
        isActive: true,
        priority: 100
    },
    {
        id: 'rule_financial_stress',
        name: 'The Scarcity Trap',
        description: 'Triggers when low financial runway starts impacting health stability.',
        condition: 'finance.liquidity.runway < 2 && health.core.health_stability < 50',
        action: {
            type: 'add_global_alert',
            message: 'WARNING: Financial scarcity is degrading biological safety levels.',
            severity: 'warning'
        },
        isActive: true,
        priority: 90
    },
    {
        id: 'rule_social_battery',
        name: 'Social Battery Recharge',
        description: 'Triggers when isolation is high and health energy is low.',
        condition: 'relationships.community.isolation_level > 70 && health.core.energy < 30',
        action: {
            type: 'add_global_alert',
            message: 'EMERGENCY: Extreme isolation combined with low energy. Connection required.',
            severity: 'emergency'
        },
        isActive: true,
        priority: 110
    }
];
