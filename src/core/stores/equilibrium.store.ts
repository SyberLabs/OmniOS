import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { 
    MasterRule, 
    MasterRuleAlert, 
    EquilibriumState, 
    DEFAULT_MASTER_RULES,
    EquilibriumSnaphot
} from '../schemas/equilibrium.schema';
import { SystemType } from '../schemas/core.schema';
import { evaluateMasterRule } from '../services';
import { useGraphPoolStore } from './graphPool.store';

interface EquilibriumStateStore extends EquilibriumState {
    rules: MasterRule[];
    isProcessing: boolean;
    
    // Actions
    initializeEquilibrium: () => void;
    addRule: (rule: MasterRule) => void;
    updateRule: (id: string, updates: Partial<MasterRule>) => void;
    removeRule: (id: string) => void;
    
    // Core Engine Calls
    evaluateRules: () => void;
    calculateEntropy: () => number;
    dismissAlert: (id: string) => void;
    
    // History
    addHistorySnapshot: () => void;
}

export const useEquilibriumStore = create<EquilibriumStateStore>()(
    persist(
        (set, get) => ({
            entropy: 0,
            alerts: [],
            history: [],
            rules: [],
            isProcessing: false,
            systemWeights: {
                health: 1.0,
                career: 0.8,
                finance: 0.8,
                mind: 0.7,
                relationships: 0.7,
                environment: 0.5,
                time: 0.6
            },

            initializeEquilibrium: () => {
                const { rules } = get();
                if (rules.length > 0) return;
                set({ rules: [...DEFAULT_MASTER_RULES] });
            },

            addRule: (rule) => set(state => ({ rules: [...state.rules, rule] })),
            
            updateRule: (id, updates) => set(state => ({
                rules: state.rules.map(r => r.id === id ? { ...r, ...updates } : r)
            })),

            removeRule: (id) => set(state => ({
                rules: state.rules.filter(r => r.id !== id)
            })),

            evaluateRules: () => {
                const { rules, alerts } = get();
                const graphPoolStore = useGraphPoolStore.getState();
                const newAlerts: MasterRuleAlert[] = [];
                
                set({ isProcessing: true });
                
                try {
                    for (const rule of rules.filter(r => r.isActive)) {
                        const isTriggered = evaluateMasterRule(rule, graphPoolStore);
                        
                        if (isTriggered) {
                            // Only add if not already active or if enough time has passed
                            const existing = alerts.find(a => a.ruleId === rule.id && !a.isDismissed);
                            if (!existing) {
                                newAlerts.push({
                                    id: `alert_${Date.now()}_${rule.id}`,
                                    ruleId: rule.id,
                                    message: rule.action.message || `Rule ${rule.name} triggered`,
                                    severity: rule.action.severity || 'info',
                                    timestamp: Date.now(),
                                    isDismissed: false
                                });
                            }
                        }
                    }

                    if (newAlerts.length > 0) {
                        set(state => ({
                            alerts: [...newAlerts, ...state.alerts].slice(0, 50),
                            entropy: get().calculateEntropy()
                        }));
                    }
                } finally {
                    set({ isProcessing: false });
                }
            },

            calculateEntropy: () => {
                const { alerts } = get();
                const activeAlerts = alerts.filter(a => !a.isDismissed);
                
                // Base entropy from active alerts severity
                const entropyScore = activeAlerts.reduce((acc, alert) => {
                    const weight = alert.severity === 'emergency' ? 40 : 
                                   alert.severity === 'critical' ? 25 : 
                                   alert.severity === 'warning' ? 10 : 2;
                    return acc + weight;
                }, 0);

                return Math.min(100, entropyScore);
            },

            dismissAlert: (id) => set(state => ({
                alerts: state.alerts.map(a => a.id === id ? { ...a, isDismissed: true } : a)
            })),

            addHistorySnapshot: () => {
                const pools = useGraphPoolStore.getState().pools;
                const systemScores: Record<string, number> = {};
                
                // Sample some core metrics for history
                Object.entries(pools).forEach(([sysId, pool]) => {
                    // Look for core stability node if possible
                    const coreGraph = pool.graphs.find(g => g.id.includes('.core') || g.id.includes('.performance'));
                    const stabilityNode = coreGraph?.nodes.find(n => n.id.includes('stability') || n.id === 'focus' || n.id === 'runway');
                    systemScores[sysId] = stabilityNode?.value ?? 50;
                });

                const snapshot: EquilibriumSnaphot = {
                    timestamp: Date.now(),
                    entropy: get().entropy,
                    systemScores: systemScores as Record<SystemType, number>
                };

                set(state => ({
                    history: [...state.history, snapshot].slice(-100)
                }));
            }
        }),
        {
            name: 'omni-equilibrium',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                rules: state.rules,
                alerts: state.alerts,
                history: state.history,
                entropy: state.entropy
            })
        }
    )
);
