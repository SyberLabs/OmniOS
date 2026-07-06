// ============================================
// PROJECT OMNI: SYSTEM MIND ENGINE
// Context-isolated AI for the 7 Life Systems
// ============================================

import { LLMMessage } from './llm.service';
import { runTurn, runTurnStream } from '@/core/cognition';
import { useCognitiveStore } from '@/core/stores/coreStore';
import { useStabilityStore } from '@/core/stores/stabilityStore';
import { SystemType, LifeSystem, AIMemoryEntry } from '@/core/schemas/core.schema';
import { StabilityResult, computeStability } from '@/core/schemas/stability.schema';

// ============================================
// SYSTEM MIND PROMPTS
// ============================================

const SYSTEM_PROMPTS: Record<SystemType, string> = {
    health: `You are the Health Mind within the Omni cognitive system.
Your domain covers: physical wellbeing, sleep, nutrition, exercise, energy levels, and stress management.
You have access to the user's Health System data including current attributes and stability.
Be supportive but honest. Help identify patterns and suggest actionable improvements.
Always consider how health connects to other life domains.`,

    career: `You are the Career Mind within the Omni cognitive system.
Your domain covers: professional development, skills, productivity, work relationships, and career trajectory.
You have access to the user's Career System data including productivity metrics and skill growth.
Be strategic and forward-thinking. Help the user optimize their professional path.
Consider how career impacts other life domains like finance, time, and relationships.`,

    finance: `You are the Finance Mind within the Omni cognitive system.
Your domain covers: income, savings, investments, runway, cash flow, and financial security.
You have access to the user's Finance System data including runway and savings rate.
Be practical and risk-aware. Help the user build financial resilience.
Consider how financial decisions impact other life domains.`,

    mind: `You are the Mind Mind (meta-cognitive advisor) within the Omni cognitive system.
Your domain covers: mental clarity, creativity, focus, learning, and cognitive performance.
You have access to the user's Mind System data including clarity and creativity metrics.
Be thoughtful and introspective. Help the user optimize their mental state.
Consider how mental state affects all other life domains.`,

    relationships: `You are the Relationships Mind within the Omni cognitive system.
Your domain covers: social connections, family, friendships, professional network, and isolation levels.
You have access to the user's Relationships System data including connection quality and network health.
Be empathetic and socially intelligent. Help nurture meaningful connections.
Consider how relationships impact wellbeing across all domains.`,

    environment: `You are the Environment Mind within the Omni cognitive system.
Your domain covers: living space, physical surroundings, possessions, organization, and comfort.
You have access to the user's Environment System data.
Be practical and design-aware. Help optimize the user's physical environment.
Consider how environment affects productivity, health, and peace of mind.`,

    time: `You are the Time Mind within the Omni cognitive system.
Your domain covers: time allocation, work-life balance, focus time, scheduling, and priorities.
You have access to the user's Time System data including focus hours and balance metrics.
Be strategic about time as a finite resource. Help optimize allocation.
Consider how time choices impact all other life domains.`
};

// ============================================
// SYSTEM MIND CLASS
// ============================================

export interface SystemMindMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface SystemMindInstance {
    systemId: SystemType;
    messages: SystemMindMessage[];
    isProcessing: boolean;
    lastActivity: number;
}

class SystemMindEngine {
    private instances: Map<SystemType, SystemMindInstance> = new Map();

    /**
     * Get or create a System Mind instance
     */
    getInstance(systemId: SystemType): SystemMindInstance {
        if (!this.instances.has(systemId)) {
            this.instances.set(systemId, {
                systemId,
                messages: [],
                isProcessing: false,
                lastActivity: Date.now()
            });
        }
        return this.instances.get(systemId)!;
    }

    /**
     * Build context for a System Mind
     */
    private buildSystemContext(systemId: SystemType): string {
        const cognitiveStore = useCognitiveStore.getState();
        const stabilityStore = useStabilityStore.getState();

        const system = cognitiveStore.systems.find(s => s.id === systemId);
        if (!system) return '';

        const model = stabilityStore.models[systemId];
        let stabilityInfo = '';

        if (model) {
            const result = computeStability(system.attributes, model);
            stabilityInfo = `
STABILITY ANALYSIS:
- Current Score: ${Math.round(result.score)}%
- Status: ${result.score >= 80 ? 'Stable' : result.score >= 60 ? 'Balanced' : result.score >= 40 ? 'In Flux' : 'Needs Attention'}
${result.alerts.length > 0 ? `- Alerts: ${result.alerts.map(a => a.message).join('; ')}` : ''}`;
        }

        const attributesList = system.attributes
            .map(a => `- ${a.name}: ${a.value}${a.unit || '%'} (${a.trend})`)
            .join('\n');

        return `
CURRENT ${system.name.toUpperCase()} SYSTEM STATE:
${attributesList}
${stabilityInfo}
`;
    }

    /**
     * Chat with a System Mind
     */
    async chat(systemId: SystemType, userMessage: string): Promise<string> {
        const instance = this.getInstance(systemId);

        if (instance.isProcessing) {
            return 'I am still processing the previous message. Please wait.';
        }

        instance.isProcessing = true;
        instance.lastActivity = Date.now();

        try {

            // Add user message to history
            instance.messages.push({
                id: `msg_${Date.now()}_user`,
                role: 'user',
                content: userMessage,
                timestamp: Date.now()
            });

            // Build system prompt with context
            const systemPrompt = SYSTEM_PROMPTS[systemId];
            const contextInfo = this.buildSystemContext(systemId);
            const fullSystemPrompt = `${systemPrompt}\n\n${contextInfo}`;

            // Build conversation history
            const messages: LLMMessage[] = [
                { role: 'system', content: fullSystemPrompt },
                ...instance.messages.slice(-10).map(m => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                }))
            ];

            // The Cognition Kernel owns the turn lifecycle (apex A4).
            const response = await runTurn(messages, { temperature: 0.7, maxTokens: 1024 });
            if (!response.success) {
                throw new Error(response.error);
            }

            // Add assistant response to history
            instance.messages.push({
                id: `msg_${Date.now()}_assistant`,
                role: 'assistant',
                content: response.content,
                timestamp: Date.now()
            });

            return response.content;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return `Error: ${errorMessage}`;
        } finally {
            instance.isProcessing = false;
        }
    }

    /**
     * Stream chat response
     */
    async *chatStream(systemId: SystemType, userMessage: string): AsyncGenerator<string, void> {
        const instance = this.getInstance(systemId);

        if (instance.isProcessing) {
            yield 'I am still processing the previous message.';
            return;
        }

        instance.isProcessing = true;
        instance.lastActivity = Date.now();

        try {

            // Add user message
            instance.messages.push({
                id: `msg_${Date.now()}_user`,
                role: 'user',
                content: userMessage,
                timestamp: Date.now()
            });

            const systemPrompt = SYSTEM_PROMPTS[systemId];
            const contextInfo = this.buildSystemContext(systemId);
            const fullSystemPrompt = `${systemPrompt}\n\n${contextInfo}`;

            const messages: LLMMessage[] = [
                { role: 'system', content: fullSystemPrompt },
                ...instance.messages.slice(-10).map(m => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content
                }))
            ];

            // The Cognition Kernel owns the turn lifecycle (apex A4).
            const turn = runTurnStream(messages);
            let step = await turn.next();
            let fullResponse = '';
            while (!step.done) {
                fullResponse += step.value;
                yield step.value;
                step = await turn.next();
            }
            if (!step.value.success) {
                yield `⚠️ ${step.value.error}`;
                return;
            }

            // Add complete response to history
            instance.messages.push({
                id: `msg_${Date.now()}_assistant`,
                role: 'assistant',
                content: fullResponse,
                timestamp: Date.now()
            });

        } catch (error) {
            yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        } finally {
            instance.isProcessing = false;
        }
    }

    /**
     * Get conversation history for a System
     */
    getMessages(systemId: SystemType): SystemMindMessage[] {
        return this.getInstance(systemId).messages;
    }

    /**
     * Clear conversation history for a System
     */
    clearMessages(systemId: SystemType): void {
        const instance = this.getInstance(systemId);
        instance.messages = [];
    }

    /**
     * Check if a System Mind is currently processing
     */
    isProcessing(systemId: SystemType): boolean {
        return this.getInstance(systemId).isProcessing;
    }
}

// ============================================
// SINGLETON
// ============================================

let systemMindEngineInstance: SystemMindEngine | null = null;

export function getSystemMindEngine(): SystemMindEngine {
    if (!systemMindEngineInstance) {
        systemMindEngineInstance = new SystemMindEngine();
    }
    return systemMindEngineInstance;
}

export default SystemMindEngine;
