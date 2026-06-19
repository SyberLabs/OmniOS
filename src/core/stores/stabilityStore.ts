// ============================================
// PROJECT OMNI: STABILITY STORE
// Zustand store for system models and computed stability
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    SystemModel,
    DEFAULT_SYSTEM_MODELS,
    computeStability,
    StabilityResult,
    AttributeEffect,
    StabilityRule,
    SYSTEM_SURVEY,
    SurveyQuestion
} from '../schemas/stability.schema';
import { SystemType, SystemAttribute } from '../schemas/core.schema';
import { getRelationModeler, SurveyAnswer } from '../services/relationModeler.service';

// ============================================
// STORE STATE
// ============================================

interface StabilityState {
    /** System models (effects + rules) */
    models: Record<SystemType, SystemModel>;

    /** Computed stability results (cached) */
    stabilityCache: Record<SystemType, StabilityResult>;

    /** Survey responses */
    surveyResponses: SurveyAnswer[];

    /** Has completed initial survey? */
    surveyCompleted: boolean;

    /** LLM-generated insights */
    modelInsights: string;

    // Actions
    initializeModels: () => void;
    computeSystemStability: (systemId: SystemType, attributes: SystemAttribute[]) => StabilityResult;

    // Effect management
    addEffect: (systemId: SystemType, effect: AttributeEffect) => void;
    updateEffect: (systemId: SystemType, effectId: string, updates: Partial<AttributeEffect>) => void;
    removeEffect: (systemId: SystemType, effectId: string) => void;

    // Rule management
    addRule: (systemId: SystemType, rule: StabilityRule) => void;
    updateRule: (systemId: SystemType, ruleId: string, updates: Partial<StabilityRule>) => void;
    removeRule: (systemId: SystemType, ruleId: string) => void;
    toggleRule: (systemId: SystemType, ruleId: string) => void;

    // Survey
    getSurveyQuestions: () => SurveyQuestion[];
    submitSurveyAnswer: (answer: SurveyAnswer) => void;
    completeSurvey: () => Promise<void>;
    resetSurvey: () => void;

    // Model adjustments
    setBaseStability: (systemId: SystemType, baseStability: number) => void;
    resetToDefaults: (systemId: SystemType) => void;
}

// ============================================
// STORE
// ============================================

export const useStabilityStore = create<StabilityState>()(
    persist(
        (set, get) => ({
            models: {} as Record<SystemType, SystemModel>,
            stabilityCache: {} as Record<SystemType, StabilityResult>,
            surveyResponses: [],
            surveyCompleted: false,
            modelInsights: '',

            initializeModels: () => {
                const { models } = get();
                if (Object.keys(models).length > 0) return;

                set({ models: { ...DEFAULT_SYSTEM_MODELS } });
            },

            computeSystemStability: (systemId, attributes) => {
                const { models } = get();
                const model = models[systemId];

                if (!model) {
                    return { score: 50, breakdown: [], triggeredRules: [], alerts: [] };
                }

                const result = computeStability(attributes, model);

                // Cache result
                set(state => ({
                    stabilityCache: {
                        ...state.stabilityCache,
                        [systemId]: result
                    }
                }));

                return result;
            },

            addEffect: (systemId, effect) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            effects: [...state.models[systemId].effects, effect]
                        }
                    }
                }));
            },

            updateEffect: (systemId, effectId, updates) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            effects: state.models[systemId].effects.map(e =>
                                e.id === effectId ? { ...e, ...updates } : e
                            )
                        }
                    }
                }));
            },

            removeEffect: (systemId, effectId) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            effects: state.models[systemId].effects.filter(e => e.id !== effectId)
                        }
                    }
                }));
            },

            addRule: (systemId, rule) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            rules: [...state.models[systemId].rules, rule]
                        }
                    }
                }));
            },

            updateRule: (systemId, ruleId, updates) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            rules: state.models[systemId].rules.map(r =>
                                r.id === ruleId ? { ...r, ...updates } : r
                            )
                        }
                    }
                }));
            },

            removeRule: (systemId, ruleId) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            rules: state.models[systemId].rules.filter(r => r.id !== ruleId)
                        }
                    }
                }));
            },

            toggleRule: (systemId, ruleId) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            rules: state.models[systemId].rules.map(r =>
                                r.id === ruleId ? { ...r, isActive: !r.isActive } : r
                            )
                        }
                    }
                }));
            },

            getSurveyQuestions: () => SYSTEM_SURVEY,

            submitSurveyAnswer: (answer) => {
                set(state => ({
                    surveyResponses: [
                        ...state.surveyResponses.filter(r => r.questionId !== answer.questionId),
                        answer
                    ]
                }));
            },

            completeSurvey: async () => {
                const { surveyResponses } = get();

                // First, apply local model adjustments
                const modeler = getRelationModeler();
                const localModels = modeler.generateModelsLocal(surveyResponses);

                set({
                    models: localModels,
                    surveyCompleted: true
                });

                // Then try LLM enhancement (non-blocking)
                try {
                    const result = await modeler.generateModels(surveyResponses);
                    if (result.success && result.models) {
                        // Merge LLM adjustments with local models
                        set(state => {
                            const mergedModels = { ...state.models };
                            for (const [sysId, adjustment] of Object.entries(result.models!)) {
                                const systemId = sysId as SystemType;
                                if (adjustment.effects) {
                                    // Replace effects that match, add new ones
                                    for (const effect of adjustment.effects) {
                                        const existingIdx = mergedModels[systemId].effects.findIndex(
                                            e => e.attributeId === effect.attributeId
                                        );
                                        if (existingIdx >= 0) {
                                            mergedModels[systemId].effects[existingIdx] = effect;
                                        } else {
                                            mergedModels[systemId].effects.push(effect);
                                        }
                                    }
                                }
                                if (adjustment.rules) {
                                    mergedModels[systemId].rules.push(...adjustment.rules);
                                }
                            }
                            return {
                                models: mergedModels,
                                modelInsights: result.insights || ''
                            };
                        });
                    }
                } catch (error) {
                    console.warn('LLM model enhancement failed, using local models', error);
                }
            },

            resetSurvey: () => {
                set({
                    surveyResponses: [],
                    surveyCompleted: false,
                    modelInsights: ''
                });
            },

            setBaseStability: (systemId, baseStability) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: {
                            ...state.models[systemId],
                            baseStability
                        }
                    }
                }));
            },

            resetToDefaults: (systemId) => {
                set(state => ({
                    models: {
                        ...state.models,
                        [systemId]: DEFAULT_SYSTEM_MODELS[systemId]
                    }
                }));
            }
        }),
        {
            name: 'omni-stability-models',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                models: state.models,
                surveyResponses: state.surveyResponses,
                surveyCompleted: state.surveyCompleted,
                modelInsights: state.modelInsights
            })
        }
    )
);

export default useStabilityStore;
