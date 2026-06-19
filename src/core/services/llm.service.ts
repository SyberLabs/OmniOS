// ============================================
// PROJECT OMNI: LLM SERVICE (client)
// Thin client that proxies all LLM calls through the server-side /api/llm
// route. No provider API keys ever live in the browser — they are read from
// process.env on the server. See IMPLEMENTATION_PLAN.md (Phase 3).
// ============================================

import { LLMConfig } from '@/core/schemas/mind.schema';

// ============================================
// TYPES (public interface preserved for callers)
// ============================================

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMOptions {
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
}

export interface LLMResponse {
    content: string;
    tokensUsed?: number;
    finishReason?: string;
}

const LLM_ENDPOINT = '/api/llm';

// ============================================
// LLM SERVICE
// ============================================

export class LLMService {
    private config: LLMConfig;

    constructor(config: LLMConfig) {
        this.config = config;
    }

    get providerName(): LLMConfig['provider'] {
        return this.config.provider;
    }

    /**
     * Best-effort availability probe. For local (Ollama) this attempts a tiny
     * request; for cloud providers the server validates key presence and
     * returns 503 if unconfigured. We treat a non-503 as "available".
     */
    async isAvailable(): Promise<boolean> {
        try {
            const res = await fetch(LLM_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    provider: this.config.provider,
                    model: this.config.model,
                    baseUrl: this.config.baseUrl,
                    messages: [{ role: 'user', content: 'ping' }],
                    options: { maxTokens: 1 }
                })
            });
            // 503 = provider not configured server-side; anything else means
            // the provider is reachable/configured enough to attempt.
            return res.status !== 503;
        } catch {
            return false;
        }
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        const res = await fetch(LLM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: this.config.provider,
                model: this.config.model,
                baseUrl: this.config.baseUrl,
                messages,
                options: {
                    temperature: options?.temperature ?? this.config.temperature,
                    maxTokens: options?.maxTokens ?? this.config.maxTokens
                }
            })
        });

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `LLM request failed: ${res.status}`);
        }

        return res.json();
    }

    async *stream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<string> {
        const res = await fetch(LLM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                provider: this.config.provider,
                model: this.config.model,
                baseUrl: this.config.baseUrl,
                messages,
                options: {
                    temperature: options?.temperature ?? this.config.temperature,
                    maxTokens: options?.maxTokens ?? this.config.maxTokens
                },
                stream: true
            })
        });

        if (!res.ok || !res.body) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `LLM stream failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            if (chunk) yield chunk;
        }
    }
}

// ============================================
// SINGLETON FACTORY
// ============================================

let currentService: LLMService | null = null;

export function getLLMService(config: LLMConfig): LLMService {
    if (!currentService || currentService.providerName !== config.provider) {
        currentService = new LLMService(config);
    }
    return currentService;
}

export function createLLMService(config: LLMConfig): LLMService {
    return new LLMService(config);
}
