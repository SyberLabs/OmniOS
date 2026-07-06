// ============================================
// PROJECT OMNI: RELATION MODELER SERVICE
// LLM-powered survey → model generation
// ============================================

import { LLMMessage } from './llm.service';
import { runTurn } from '@/core/cognition';
import {
    SurveyResponses,
    SYSTEM_SURVEY,
    SystemModel,
    DEFAULT_SYSTEM_MODELS,
    AttributeEffect,
    StabilityRule,
    SystemType
} from '../schemas/stability.schema';

// ============================================
// RELATION MODELER PROMPT
// ============================================

const RELATION_MODELER_PROMPT = `You are an expert in behavioral psychology and mathematical modeling.
Your task is to analyze a user's survey responses and generate personalized system stability models.

The survey responses indicate how different attributes (like sleep, stress, isolation) affect the user.

Based on the responses, you will generate:
1. Attribute effects with appropriate mathematical relationships
2. Custom rules for edge cases

Output format: Valid JSON object with the following structure:
{
  "systemId": "health",
  "adjustedEffects": [
    {
      "attributeId": "stress",
      "effectType": "exponential",
      "direction": "negative",
      "coefficient": 0.6,
      "exponent": 1.5,
      "description": "Based on survey: user experiences compounding stress"
    }
  ],
  "newRules": [
    {
      "name": "Custom Rule Name",
      "condition": "attribute_name > 70",
      "action": {
        "type": "add_alert",
        "alertMessage": "Alert message here",
        "alertSeverity": "warning"
      },
      "priority": 5
    }
  ],
  "insights": "Brief explanation of the personalization"
}

Available effect types:
- linear: value * coefficient
- exponential: value^exponent * coefficient (for compounding effects)
- threshold: if value > threshold then highValue else lowValue
- inverse: coefficient / value (diminishing returns)
- logarithmic: log(value) * coefficient

Be thoughtful about the mathematical relationships. Consider:
- Someone who says isolation "recharges" them should have positive coefficient
- Someone who says stress "compounds" should use exponential type
- Someone who needs high runway should have higher threshold value`;

// ============================================
// RELATION MODELER SERVICE
// ============================================

export interface ModelGenerationResult {
    success: boolean;
    models?: Record<SystemType, Partial<SystemModel>>;
    insights?: string;
    error?: string;
}

export interface SurveyAnswer {
    questionId: string;
    selectedValue: number;
    selectedLabel: string;
}

class RelationModelerService {
    /**
     * Process survey responses and generate personalized models
     */
    async generateModels(responses: SurveyAnswer[]): Promise<ModelGenerationResult> {
        try {
            // Group responses by system
            const systemResponses = this.groupBySystem(responses);
            const allModels: Record<SystemType, Partial<SystemModel>> = {} as Record<SystemType, Partial<SystemModel>>;
            let combinedInsights = '';

            // Generate model for each system with responses
            for (const [systemId, systemAnswers] of Object.entries(systemResponses)) {
                const messages: LLMMessage[] = [
                    { role: 'system', content: RELATION_MODELER_PROMPT },
                    { role: 'user', content: this.buildPrompt(systemId as SystemType, systemAnswers) }
                ];

                // The Cognition Kernel owns the turn lifecycle (apex A4).
                const response = await runTurn(messages, { temperature: 0.5, maxTokens: 2000 });
                if (!response.success) {
                    throw new Error(response.error);
                }

                const parsed = this.parseResponse(response.content, systemId as SystemType);
                if (parsed) {
                    allModels[systemId as SystemType] = parsed.model;
                    combinedInsights += `\n**${systemId}**: ${parsed.insights || 'Personalized based on survey'}`;
                }
            }

            return {
                success: true,
                models: allModels,
                insights: combinedInsights.trim()
            };
        } catch (error) {
            return {
                success: false,
                error: (error as Error).message
            };
        }
    }

    /**
     * Generate models using quick local logic (no LLM)
     */
    generateModelsLocal(responses: SurveyAnswer[]): Record<SystemType, SystemModel> {
        const models = { ...DEFAULT_SYSTEM_MODELS };

        for (const answer of responses) {
            const question = SYSTEM_SURVEY.find(q => q.id === answer.questionId);
            if (!question) continue;

            const option = question.options.find(o => o.value === answer.selectedValue);
            if (!option?.effectModifier) continue;

            const model = models[question.systemId];
            const effectIndex = model.effects.findIndex(e => e.attributeId === question.attributeId);

            if (effectIndex >= 0) {
                // Merge effect modifier
                model.effects[effectIndex] = {
                    ...model.effects[effectIndex],
                    ...option.effectModifier
                };
            }
        }

        return models;
    }

    /**
     * Group survey answers by system
     */
    private groupBySystem(responses: SurveyAnswer[]): Record<string, SurveyAnswer[]> {
        const grouped: Record<string, SurveyAnswer[]> = {};

        for (const answer of responses) {
            const question = SYSTEM_SURVEY.find(q => q.id === answer.questionId);
            if (!question) continue;

            if (!grouped[question.systemId]) {
                grouped[question.systemId] = [];
            }
            grouped[question.systemId].push(answer);
        }

        return grouped;
    }

    /**
     * Build LLM prompt for a system
     */
    private buildPrompt(systemId: SystemType, answers: SurveyAnswer[]): string {
        const questionsAndAnswers = answers.map(a => {
            const q = SYSTEM_SURVEY.find(s => s.id === a.questionId);
            return q ? `Q: ${q.question}\nA: ${a.selectedLabel}` : '';
        }).filter(Boolean).join('\n\n');

        const defaultModel = DEFAULT_SYSTEM_MODELS[systemId];
        const currentEffects = JSON.stringify(defaultModel.effects, null, 2);

        return `System: ${systemId}

Survey Responses:
${questionsAndAnswers}

Current default effects for reference:
${currentEffects}

Based on these survey responses, generate personalized attribute effects for the ${systemId} system.
Focus on adjusting coefficients, effect types, and thresholds based on the user's indicated sensitivities.`;
    }

    /**
     * Parse LLM response into model structure
     */
    private parseResponse(
        response: string,
        systemId: SystemType
    ): { model: Partial<SystemModel>; insights?: string } | null {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return null;

            const parsed = JSON.parse(jsonMatch[0]);
            const model: Partial<SystemModel> = {
                systemId,
                effects: [],
                rules: []
            };

            // Process adjusted effects
            if (Array.isArray(parsed.adjustedEffects)) {
                for (const effect of parsed.adjustedEffects) {
                    const validEffect: AttributeEffect = {
                        id: `${systemId}_${effect.attributeId}_custom`,
                        attributeId: effect.attributeId,
                        effectType: effect.effectType || 'linear',
                        direction: effect.direction || 'positive',
                        coefficient: effect.coefficient || 0.3,
                        threshold: effect.threshold,
                        highValue: effect.highValue,
                        lowValue: effect.lowValue,
                        exponent: effect.exponent,
                        customExpression: effect.customExpression,
                        description: effect.description
                    };
                    model.effects!.push(validEffect);
                }
            }

            // Process new rules
            if (Array.isArray(parsed.newRules)) {
                for (const rule of parsed.newRules) {
                    const validRule: StabilityRule = {
                        id: `${systemId}_rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        name: rule.name || 'Custom Rule',
                        condition: rule.condition || 'false',
                        action: {
                            type: rule.action?.type || 'add_alert',
                            stabilityDelta: rule.action?.stabilityDelta,
                            alertMessage: rule.action?.alertMessage,
                            alertSeverity: rule.action?.alertSeverity || 'info'
                        },
                        priority: rule.priority || 5,
                        isActive: true,
                        isLLMGenerated: true
                    };
                    model.rules!.push(validRule);
                }
            }

            return {
                model,
                insights: parsed.insights
            };
        } catch {
            console.warn('Failed to parse LLM model response');
            return null;
        }
    }
}

// Singleton
let relationModelerInstance: RelationModelerService | null = null;

export function getRelationModeler(): RelationModelerService {
    if (!relationModelerInstance) {
        relationModelerInstance = new RelationModelerService();
    }
    return relationModelerInstance;
}

export default RelationModelerService;
