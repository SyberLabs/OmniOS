import { MasterRule } from '../schemas/equilibrium.schema';
import { SystemType } from '../schemas/core.schema';

/**
 * Service to evaluate cross-system Master Rules
 */
export function evaluateMasterRule(rule: MasterRule, graphPoolStore: any): boolean {
    const { condition } = rule;
    
    try {
        // Condition matches: [system].[graph].[node] [operator] [value]
        // Example: health.core.energy < 20
        const parts = condition.split(' ');
        if (parts.length < 3) return false;

        const leftSide = parts[0];   // e.g., "health.core.energy"
        const operator = parts[1];   // e.g., "<"
        const rightSide = parseFloat(parts[2]); // e.g., "20"

        // Handle logical AND (&&) - simple split for now
        if (condition.includes('&&')) {
            const subConditions = condition.split('&&').map(c => c.trim());
            return subConditions.every(c => evaluateMasterRule({ ...rule, condition: c }, graphPoolStore));
        }

        const path = leftSide.split('.');
        if (path.length !== 3) return false;

        const systemId = path[0] as SystemType;
        const graphId = `${path[0]}.${path[1]}`;
        const nodeId = path[2];

        const pool = graphPoolStore.pools[systemId];
        if (!pool) return false;

        const graph = pool.graphs.find((g: any) => g.id === graphId);
        if (!graph) return false;

        const node = graph.nodes.find((n: any) => n.id === nodeId);
        if (!node || node.value === undefined) return false;

        const actualValue = node.value;

        switch (operator) {
            case '>': return actualValue > rightSide;
            case '<': return actualValue < rightSide;
            case '>=': return actualValue >= rightSide;
            case '<=': return actualValue <= rightSide;
            case '===':
            case '==': return actualValue === rightSide;
            default: return false;
        }
    } catch (error) {
        console.error(`[RuleEngine] Failed to evaluate condition: ${condition}`, error);
        return false;
    }
}

/**
 * Global rule evaluator - can be called by a central loop or event listener
 */
export class RuleEngineService {
    static validateConditions(rules: MasterRule[], graphPoolStore: any): string[] {
        return rules
            .filter(r => r.isActive && evaluateMasterRule(r, graphPoolStore))
            .map(r => r.id);
    }
}
