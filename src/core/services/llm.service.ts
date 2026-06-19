// ============================================
// PROJECT OMNI: LLM SERVICE
// Provider-agnostic LLM interface with adapters
// ============================================

import { LLMProvider, LLMConfig, LLM_DEFAULTS } from '@/core/schemas/mind.schema';

// ============================================
// TYPES
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

export interface LLMAdapter {
    complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
    stream?(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<string>;
    isAvailable(): Promise<boolean>;
}

// ============================================
// OLLAMA ADAPTER (Local)
// ============================================

class OllamaAdapter implements LLMAdapter {
    private baseUrl: string;
    private model: string;

    constructor(model: string = 'tinyllama', baseUrl: string = 'http://localhost:11434') {
        this.model = model;
        this.baseUrl = baseUrl;
    }

    async isAvailable(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                stream: false,
                options: {
                    temperature: options?.temperature ?? 0.7,
                    num_predict: options?.maxTokens ?? 512
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.message?.content || '',
            tokensUsed: data.eval_count,
            finishReason: data.done ? 'stop' : 'unknown'
        };
    }

    async *stream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<string> {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.model,
                messages: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                stream: true,
                options: {
                    temperature: options?.temperature ?? 0.7,
                    num_predict: options?.maxTokens ?? 512
                }
            })
        });

        if (!response.ok || !response.body) {
            throw new Error(`Ollama stream error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.message?.content) {
                        yield data.message.content;
                    }
                } catch {
                    // Skip invalid JSON
                }
            }
        }
    }
}

// ============================================
// OPENAI ADAPTER
// ============================================

class OpenAIAdapter implements LLMAdapter {
    private apiKey: string;
    private model: string;
    private baseUrl: string;

    constructor(apiKey: string, model: string = 'gpt-4o-mini', baseUrl: string = 'https://api.openai.com/v1') {
        this.apiKey = apiKey;
        this.model = model;
        this.baseUrl = baseUrl;
    }

    async isAvailable(): Promise<boolean> {
        return !!this.apiKey;
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 512
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            tokensUsed: data.usage?.total_tokens,
            finishReason: data.choices?.[0]?.finish_reason
        };
    }
}

// ============================================
// ANTHROPIC ADAPTER
// ============================================

class AnthropicAdapter implements LLMAdapter {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async isAvailable(): Promise<boolean> {
        return !!this.apiKey;
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        // Extract system message
        const systemMessage = messages.find(m => m.role === 'system');
        const chatMessages = messages.filter(m => m.role !== 'system');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: this.model,
                max_tokens: options?.maxTokens ?? 512,
                system: systemMessage?.content,
                messages: chatMessages.map(m => ({
                    role: m.role,
                    content: m.content
                }))
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Anthropic error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return {
            content: data.content?.[0]?.text || '',
            tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens,
            finishReason: data.stop_reason
        };
    }
}

// ============================================
// GOOGLE ADAPTER (Gemini)
// ============================================

class GoogleAdapter implements LLMAdapter {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'gemini-2.0-flash-exp') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async isAvailable(): Promise<boolean> {
        return !!this.apiKey;
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        const systemInstruction = messages.find(m => m.role === 'system')?.content;
        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
                    contents,
                    generationConfig: {
                        temperature: options?.temperature ?? 0.7,
                        maxOutputTokens: options?.maxTokens ?? 512
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Google error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
            tokensUsed: data.usageMetadata?.totalTokenCount,
            finishReason: data.candidates?.[0]?.finishReason
        };
    }
}

// ============================================
// DEEPSEEK ADAPTER
// ============================================

class DeepSeekAdapter implements LLMAdapter {
    private apiKey: string;
    private model: string;

    constructor(apiKey: string, model: string = 'deepseek-chat') {
        this.apiKey = apiKey;
        this.model = model;
    }

    async isAvailable(): Promise<boolean> {
        return !!this.apiKey;
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        // DeepSeek uses OpenAI-compatible API
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens ?? 512
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`DeepSeek error: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return {
            content: data.choices?.[0]?.message?.content || '',
            tokensUsed: data.usage?.total_tokens,
            finishReason: data.choices?.[0]?.finish_reason
        };
    }
}

// ============================================
// LLM SERVICE FACTORY
// ============================================

export class LLMService {
    private adapter: LLMAdapter;
    private provider: LLMProvider;

    constructor(config: LLMConfig) {
        this.provider = config.provider;
        this.adapter = this.createAdapter(config);
    }

    private createAdapter(config: LLMConfig): LLMAdapter {
        switch (config.provider) {
            case 'local':
                return new OllamaAdapter(config.model);
            case 'openai':
                return new OpenAIAdapter(config.apiKey || '', config.model);
            case 'anthropic':
                return new AnthropicAdapter(config.apiKey || '', config.model);
            case 'google':
                return new GoogleAdapter(config.apiKey || '', config.model);
            case 'deepseek':
                return new DeepSeekAdapter(config.apiKey || '', config.model);
            default:
                return new OllamaAdapter();
        }
    }

    get providerName(): LLMProvider {
        return this.provider;
    }

    async isAvailable(): Promise<boolean> {
        return this.adapter.isAvailable();
    }

    async complete(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
        return this.adapter.complete(messages, options);
    }

    async *stream(messages: LLMMessage[], options?: LLMOptions): AsyncGenerator<string> {
        if (this.adapter.stream) {
            yield* this.adapter.stream(messages, options);
        } else {
            // Fallback: simulate streaming with complete
            const response = await this.adapter.complete(messages, options);
            yield response.content;
        }
    }
}

// ============================================
// SINGLETON FACTORY
// ============================================

let currentService: LLMService | null = null;

export function getLLMService(config: LLMConfig): LLMService {
    // Create new service if config changed
    if (!currentService ||
        currentService.providerName !== config.provider) {
        currentService = new LLMService(config);
    }
    return currentService;
}

export function createLLMService(config: LLMConfig): LLMService {
    return new LLMService(config);
}
