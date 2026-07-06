// ============================================
// PROJECT OMNI: CORE MIND ENGINE
// Context-isolated AI for Projects
// Can access linked Systems with permission
// ============================================

import { LLMMessage } from './llm.service';
import { runTurn, runTurnStream } from '@/core/cognition';
import { useCognitiveStore } from '@/core/stores/coreStore';
import { useStabilityStore } from '@/core/stores/stabilityStore';
import { Project, SystemType, LifeSystem } from '@/core/schemas/core.schema';
import { computeStability } from '@/core/schemas/stability.schema';

// ============================================
// CORE MIND PROMPTS
// ============================================

function buildProjectPrompt(project: Project): string {
    const linkedSystemsText = project.linkedSystems.length > 0
        ? `You have access to context from linked Systems: ${project.linkedSystems.join(', ')}.`
        : 'This project has no linked Systems yet.';

    return `You are the Core Mind for the project "${project.name}".
${project.description ? `Project description: ${project.description}` : ''}

Your role is to help the user with this specific project. You understand the project's goals, context, and constraints.
${linkedSystemsText}

When the user asks questions, consider:
1. The specific context of this project
2. Relevant information from linked life Systems (if any)
3. The project's current state: ${project.state}

Be focused, practical, and help drive the project forward.`;
}

// ============================================
// CORE MIND MESSAGE TYPE
// ============================================

export interface CoreMindMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface CoreMindInstance {
    projectId: string;
    messages: CoreMindMessage[];
    isProcessing: boolean;
    lastActivity: number;
}

// ============================================
// CORE MIND ENGINE CLASS
// ============================================

class CoreMindEngine {
    private instances: Map<string, CoreMindInstance> = new Map();

    /**
     * Get or create a Core Mind instance for a project
     */
    getInstance(projectId: string): CoreMindInstance {
        if (!this.instances.has(projectId)) {
            this.instances.set(projectId, {
                projectId,
                messages: [],
                isProcessing: false,
                lastActivity: Date.now()
            });
        }
        return this.instances.get(projectId)!;
    }

    /**
     * Build context from linked Systems
     */
    private buildLinkedSystemsContext(linkedSystems: SystemType[]): string {
        if (linkedSystems.length === 0) return '';

        const cognitiveStore = useCognitiveStore.getState();
        const stabilityStore = useStabilityStore.getState();
        const systems = cognitiveStore.systems;

        const contextParts: string[] = [];

        for (const systemId of linkedSystems) {
            const system = systems.find(s => s.id === systemId);
            if (!system) continue;

            const model = stabilityStore.models[systemId];
            let stabilityScore = system.stabilityScore;

            if (model) {
                const result = computeStability(system.attributes, model);
                stabilityScore = Math.round(result.score);
            }

            const attributes = system.attributes
                .map(a => `${a.name}: ${a.value}${a.unit || '%'}`)
                .join(', ');

            contextParts.push(`
📊 ${system.icon} ${system.name} System (Stability: ${stabilityScore}%)
   Attributes: ${attributes}`);
        }

        if (contextParts.length === 0) return '';

        return `
=== LINKED SYSTEMS CONTEXT ===
${contextParts.join('\n')}
==============================`;
    }

    /**
     * Chat with a Core Mind (Project AI)
     */
    async chat(projectId: string, userMessage: string): Promise<string> {
        const instance = this.getInstance(projectId);

        if (instance.isProcessing) {
            return 'I am still processing the previous message. Please wait.';
        }

        instance.isProcessing = true;
        instance.lastActivity = Date.now();

        try {
            const cognitiveStore = useCognitiveStore.getState();

            // Find the project
            const project = cognitiveStore.projects.find(p => p.id === projectId);
            if (!project) {
                throw new Error('Project not found');
            }

            // Add user message to history
            instance.messages.push({
                id: `msg_${Date.now()}_user`,
                role: 'user',
                content: userMessage,
                timestamp: Date.now()
            });

            // Build prompts
            const basePrompt = buildProjectPrompt(project);
            const linkedContext = this.buildLinkedSystemsContext(project.linkedSystems);
            const fullSystemPrompt = `${basePrompt}\n${linkedContext}`;

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
    async *chatStream(projectId: string, userMessage: string): AsyncGenerator<string, void> {
        const instance = this.getInstance(projectId);

        if (instance.isProcessing) {
            yield 'I am still processing the previous message.';
            return;
        }

        instance.isProcessing = true;
        instance.lastActivity = Date.now();

        try {
            const cognitiveStore = useCognitiveStore.getState();

            const project = cognitiveStore.projects.find(p => p.id === projectId);
            if (!project) {
                yield 'Error: Project not found';
                return;
            }

            // Add user message
            instance.messages.push({
                id: `msg_${Date.now()}_user`,
                role: 'user',
                content: userMessage,
                timestamp: Date.now()
            });

            const basePrompt = buildProjectPrompt(project);
            const linkedContext = this.buildLinkedSystemsContext(project.linkedSystems);
            const fullSystemPrompt = `${basePrompt}\n${linkedContext}`;

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
     * Get conversation history for a Project
     */
    getMessages(projectId: string): CoreMindMessage[] {
        return this.getInstance(projectId).messages;
    }

    /**
     * Clear conversation history for a Project
     */
    clearMessages(projectId: string): void {
        const instance = this.getInstance(projectId);
        instance.messages = [];
    }

    /**
     * Check if processing
     */
    isProcessing(projectId: string): boolean {
        return this.getInstance(projectId).isProcessing;
    }
}

// ============================================
// SINGLETON
// ============================================

let coreMindEngineInstance: CoreMindEngine | null = null;

export function getCoreMindEngine(): CoreMindEngine {
    if (!coreMindEngineInstance) {
        coreMindEngineInstance = new CoreMindEngine();
    }
    return coreMindEngineInstance;
}

export default CoreMindEngine;
