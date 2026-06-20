// ============================================
// PROJECT OMNI: PERSONA ENGINE
// The real "Think over wired data" loop for persona BLOCKS.
// Connects aggregateWireContext (the data half) to getLLMService (the LLM half)
// — replacing the former setTimeout placeholder in PersonaBlock.
// Shared by both chat (handleSendMessage) and autonomous Think (handleThink).
// ============================================

import { getLLMService, LLMMessage } from './llm.service';
import { aggregateWireContext } from './wire.service';
import { useMindStore } from '@/core/stores/mindStore';
import { PERSONA_CONFIGS, PersonaChatMessage } from '@/core/schemas/wire.schema';
import { PersonaType } from '@/core/schemas/shell.schema';

const MAX_HISTORY = 10;
// Generous budget: "thinking" models (e.g. Gemini 2.5) spend part of the token
// budget on internal reasoning before producing visible output, so a small cap
// can truncate the answer to nothing.
const MAX_TOKENS = 2048;

/**
 * Build a system prompt for a persona block from its type. Self-contained on
 * PERSONA_CONFIGS so the persona-block path doesn't depend on the Mind store's
 * separately-keyed personas.
 */
export function buildPersonaSystemPrompt(personaType: PersonaType, customName?: string): string {
    const cfg = PERSONA_CONFIGS[personaType];
    const name = customName || cfg.name;
    return `You are ${name} ${cfg.avatar}, an AI persona within "The Citadel" — a spatial command center for truth-seeking and strategic intelligence.

Your focus: ${cfg.description}.

You reason over data streams that the user has wired directly into you (prediction markets, news, economic series, crypto, forecasts, notes, etc.). When you answer:
- Ground every claim in the wired data below; cite specific values when you can.
- Be explicit about uncertainty and when the data is insufficient.
- Stay in character for your focus, but be concise and useful.
- If no data is wired in, say so and answer from general reasoning, noting the limitation.`;
}

export interface PersonaTurnInput {
    instanceId: string;
    personaType: PersonaType;
    customName?: string;
    /** Recent conversation history (most recent last). */
    history?: PersonaChatMessage[];
    /** The user's message. Omit for autonomous Think. */
    userMessage?: string;
}

export interface PersonaTurnPrepared {
    messages: LLMMessage[];
    sourceIds: string[];
    /** Whether any wired data context was found. */
    hasContext: boolean;
}

const DEFAULT_THINK_TASK =
    'Analyze the data wired into you and share your most useful observation right now. ' +
    'Note patterns, risks, or anomalies, and flag anything the data cannot tell us.';

/**
 * Assemble the LLM messages for a persona turn: system prompt + fresh wired
 * context + recent history + the user task. Pure (no network) for easy testing.
 */
export function preparePersonaTurn(input: PersonaTurnInput): PersonaTurnPrepared {
    const { context, sourceIds } = aggregateWireContext(input.instanceId);
    // aggregateWireContext returns a human sentinel string when nothing is
    // wired, so presence of real context is keyed off sourceIds, not the text.
    const hasContext = sourceIds.length > 0;

    const system = buildPersonaSystemPrompt(input.personaType, input.customName);

    const contextBlock = hasContext
        ? `## Wired Data Context\n\n${context}`
        : '## Wired Data Context\n\n(No data blocks are currently wired into you.)';

    const task = input.userMessage?.trim() || DEFAULT_THINK_TASK;

    const history: LLMMessage[] = (input.history || [])
        .slice(-MAX_HISTORY)
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const messages: LLMMessage[] = [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: `${contextBlock}\n\n---\n\n${task}` }
    ];

    return { messages, sourceIds, hasContext };
}

export interface PersonaTurnResult {
    success: boolean;
    content?: string;
    sourceIds: string[];
    error?: string;
}

/**
 * Stream a persona turn. Yields response chunks; returns a final result.
 * Fails closed with a clear message when no provider is available.
 */
export async function* streamPersonaTurn(
    input: PersonaTurnInput
): AsyncGenerator<string, PersonaTurnResult> {
    const { llmConfig } = useMindStore.getState();
    const llm = getLLMService(llmConfig);
    const { messages, sourceIds } = preparePersonaTurn(input);

    if (!(await llm.isAvailable())) {
        return {
            success: false,
            sourceIds,
            error: llmConfig.provider === 'local'
                ? 'No LLM available — make sure Ollama is running (localhost:11434).'
                : `No LLM available — set the ${llmConfig.provider} API key in your .env.`
        };
    }

    try {
        let full = '';
        for await (const chunk of llm.stream(messages, {
            temperature: llmConfig.temperature,
            maxTokens: MAX_TOKENS
        })) {
            full += chunk;
            yield chunk;
        }
        return { success: true, content: full, sourceIds };
    } catch (err) {
        return {
            success: false,
            sourceIds,
            error: err instanceof Error ? err.message : 'LLM request failed.'
        };
    }
}
