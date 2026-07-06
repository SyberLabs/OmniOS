// ============================================
// PROJECT OMNI: COGNITION KERNEL (apex A4)
// The ONE turn lifecycle for every cognitive engine in the system:
//
//     availability → options (registry token floor) → stream/complete
//     → accumulate → fail-closed with an actionable message
//
// Before the kernel, four engines (persona, mind, systemMind, coreMind)
// plus two services (relationModeler, skin) each re-implemented this
// ~30-50 line lifecycle with subtle divergences (differing availability
// checks, error texts, token budgets). Now they are thin callers that own
// only their DOMAIN knowledge — context assembly, prompts, memory pools —
// and delegate the turn itself here. This resolves the long-parked
// "two Mind engines" question: one engine, many context sources.
// ============================================

import { getLLMService, LLMMessage, LLMOptions } from '@/core/services/llm.service';
import { useMindStore } from '@/core/stores/mindStore';
import { minOutputTokensFor } from '@/core/models.registry';
import type { LLMConfig } from '@/core/schemas/mind.schema';

export interface TurnOptions {
    temperature?: number;
    maxTokens?: number;
}

export interface TurnResult {
    success: boolean;
    /** Full response text ('' on failure). */
    content: string;
    error?: string;
    tokensUsed?: number;
}

/** The one actionable "no LLM" message, everywhere. */
export function unavailableMessage(config: LLMConfig): string {
    return config.provider === 'local'
        ? 'No LLM available — make sure Ollama is running (localhost:11434).'
        : `No LLM available — set the ${config.provider} API key in .env.`;
}

/**
 * Effective LLM options: caller overrides fall back to the active config,
 * and the model registry floors the output budget (thinking models like
 * Gemini 2.5 return empty text under small caps — learned live).
 */
function effectiveOptions(config: LLMConfig, options?: TurnOptions): LLMOptions {
    return {
        temperature: options?.temperature ?? config.temperature,
        maxTokens: Math.max(
            options?.maxTokens ?? config.maxTokens,
            minOutputTokensFor(config.model)
        )
    };
}

interface AvailabilityCheck {
    ok: boolean;
    config: LLMConfig;
    error?: string;
}

/** Shared availability gate (ping-based; no generation). */
export async function checkLLMAvailable(): Promise<AvailabilityCheck> {
    const { llmConfig } = useMindStore.getState();
    const llm = getLLMService(llmConfig);
    const ok = await llm.isAvailable();
    return ok
        ? { ok: true, config: llmConfig }
        : { ok: false, config: llmConfig, error: unavailableMessage(llmConfig) };
}

/**
 * Run a complete (non-streaming) turn. Never throws — fails closed with an
 * actionable error in the result.
 */
export async function runTurn(messages: LLMMessage[], options?: TurnOptions): Promise<TurnResult> {
    const avail = await checkLLMAvailable();
    if (!avail.ok) return { success: false, content: '', error: avail.error };

    try {
        const llm = getLLMService(avail.config);
        const response = await llm.complete(messages, effectiveOptions(avail.config, options));
        return { success: true, content: response.content, tokensUsed: response.tokensUsed };
    } catch (err) {
        return {
            success: false,
            content: '',
            error: err instanceof Error ? err.message : 'LLM request failed.'
        };
    }
}

/**
 * Run a streaming turn. Yields chunks; returns the final TurnResult with the
 * accumulated content. Never throws — fails closed in the result.
 */
export async function* runTurnStream(
    messages: LLMMessage[],
    options?: TurnOptions
): AsyncGenerator<string, TurnResult> {
    const avail = await checkLLMAvailable();
    if (!avail.ok) return { success: false, content: '', error: avail.error };

    try {
        const llm = getLLMService(avail.config);
        let full = '';
        for await (const chunk of llm.stream(messages, effectiveOptions(avail.config, options))) {
            full += chunk;
            yield chunk;
        }
        return { success: true, content: full };
    } catch (err) {
        return {
            success: false,
            content: '',
            error: err instanceof Error ? err.message : 'LLM request failed.'
        };
    }
}
