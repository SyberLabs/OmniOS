// ============================================
// PROJECT OMNI: LLM NORMALIZER
// Handles OpenAI-compatible API responses
// ============================================

import {
    ApiTypeDefinition,
    OmniData,
    OmniContent,
    createOmniData,
    createOmniError
} from '../omnidata.schema';

/**
 * OpenAI-compatible chat completion response
 */
interface LLMRawResponse {
    id?: string;
    object?: string;
    created?: number;
    model?: string;
    choices?: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
    error?: {
        message: string;
        type: string;
        code?: string;
    };
}

/**
 * LLM API normalizer (OpenAI-compatible)
 * Works with OpenAI, Anthropic (via adapter), Groq, etc.
 */
export const llmNormalizer: ApiTypeDefinition<LLMRawResponse> = {
    category: 'llm',
    displayName: 'LLM Gateway',
    cacheTtlMs: 0,        // Don't cache LLM responses
    rateLimitMs: 100,     // Minimal rate limiting

    fetchFn: async (apiKey, params) => {
        if (!apiKey) {
            return {
                error: {
                    message: 'LLM API requires an API key. Add one in the API Dashboard.',
                    type: 'authentication_error'
                }
            };
        }

        const baseUrl = (params?.baseUrl as string) || 'https://api.openai.com/v1';
        const model = (params?.model as string) || 'gpt-4o-mini';
        const messages = params?.messages as Array<{ role: string; content: string }> || [];
        const temperature = (params?.temperature as number) ?? 0.7;
        const maxTokens = (params?.maxTokens as number) || 1024;

        try {
            const url = `${baseUrl}/chat/completions`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens
                })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            return {
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    type: 'network_error'
                }
            };
        }
    },

    normalizeFn: (raw) => {
        if (raw.error) {
            return createOmniError('llm', 'llm', {
                code: raw.error.code || raw.error.type,
                message: raw.error.message,
                retryable: raw.error.type !== 'authentication_error'
            });
        }

        const choice = raw.choices?.[0];
        if (!choice) {
            return createOmniError('llm', 'llm', {
                code: 'NO_RESPONSE',
                message: 'No response from LLM',
                retryable: true
            });
        }

        const content: OmniContent = {
            text: choice.message.content,
            type: 'markdown',
            role: choice.message.role as 'user' | 'assistant' | 'system',
            tokens: raw.usage ? {
                input: raw.usage.prompt_tokens,
                output: raw.usage.completion_tokens
            } : undefined
        };

        return createOmniData('llm', 'llm', { content }, 0);
    }
};

export default llmNormalizer;
