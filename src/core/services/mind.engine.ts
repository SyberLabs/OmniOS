// ============================================
// PROJECT OMNI: MIND ENGINE
// The reasoning core that makes the Mind think
// ============================================

import { getLLMService, LLMMessage } from './llm.service';
import {
    getPersonaSystemPrompt,
    buildAnalysisPrompt,
    parseInsightsFromResponse,
    BlockDataSummary,
    ExtractedInsight
} from './persona.prompts';
import { captureShellSnapshot, formatSnapshotForLLM } from './shell.snapshot';
import { useMindStore } from '@/core/stores';
import { useBlockStore } from '@/core/stores';
import { PersonaConfig } from '@/core/schemas/mind.schema';
import { BlockInstance } from '@/core/schemas/block.schema';

// ============================================
// MIND ENGINE
// ============================================

export class MindEngine {
    private isProcessing: boolean = false;

    /**
     * Trigger the Mind to think about current Shell data
     */
    async think(question?: string): Promise<ThinkResult> {
        if (this.isProcessing) {
            return { success: false, error: 'Already processing' };
        }

        this.isProcessing = true;
        const mindStore = useMindStore.getState();
        mindStore.setStatus('processing');

        try {
            // Get current state
            const { llmConfig, personas, activePersonaId } = mindStore;
            const activePersona = personas.find(p => p.id === activePersonaId);

            if (!activePersona) {
                throw new Error('No active persona');
            }

            // Capture complete Shell snapshot
            const snapshot = captureShellSnapshot();

            if (snapshot.totalBlocks === 0) {
                mindStore.setStatus('ready');
                return {
                    success: false,
                    error: 'No data blocks available. Add blocks to the canvas first.'
                };
            }

            // Build messages with rich snapshot context
            const systemPrompt = getPersonaSystemPrompt(activePersona);
            const snapshotContext = formatSnapshotForLLM(snapshot);

            // Build user prompt
            const userPrompt = this.buildSnapshotAnalysisPrompt(snapshotContext, question);

            const messages: LLMMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            // Get LLM service
            const llm = getLLMService(llmConfig);

            // Check availability
            const isAvailable = await llm.isAvailable();
            if (!isAvailable) {
                mindStore.setStatus('error');
                return {
                    success: false,
                    error: `${llmConfig.provider} is not available. ${llmConfig.provider === 'local'
                        ? 'Make sure Ollama is running at localhost:11434'
                        : 'Check your API key'
                        }`
                };
            }

            // Generate response
            const response = await llm.complete(messages, {
                temperature: llmConfig.temperature,
                maxTokens: 1024
            });

            // Parse insights
            const insights = parseInsightsFromResponse(response.content);

            // Add insights to context pools
            // Disable auto-distribution to prevent noise - keep only raw observation
            // this.distributeInsights(insights, activePersona);

            // Add raw response to observations
            mindStore.addToPool('observations', {
                type: 'analysis',
                content: response.content,
                importance: 0.8,
                metadata: {
                    source: activePersona.name,
                    tokensUsed: response.tokensUsed,
                    blocksAnalyzed: snapshot.totalBlocks,
                    snapshotTimestamp: snapshot.timestamp
                }
            });

            mindStore.setStatus('ready');

            return {
                success: true,
                response: response.content,
                insights,
                tokensUsed: response.tokensUsed
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            useMindStore.getState().setStatus('error');

            return {
                success: false,
                error: errorMessage
            };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Stream a response for real-time display
     */
    async *thinkStream(question?: string): AsyncGenerator<string, ThinkResult> {
        if (this.isProcessing) {
            return { success: false, error: 'Already processing' };
        }

        this.isProcessing = true;
        const mindStore = useMindStore.getState();
        mindStore.setStatus('processing');

        try {
            const { llmConfig, personas, activePersonaId } = mindStore;
            const activePersona = personas.find(p => p.id === activePersonaId);

            if (!activePersona) {
                throw new Error('No active persona');
            }

            // Capture complete Shell snapshot
            const snapshot = captureShellSnapshot();
            const systemPrompt = getPersonaSystemPrompt(activePersona);
            const snapshotContext = formatSnapshotForLLM(snapshot);
            const userPrompt = this.buildSnapshotAnalysisPrompt(snapshotContext, question);

            const messages: LLMMessage[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ];

            const llm = getLLMService(llmConfig);

            if (!await llm.isAvailable()) {
                mindStore.setStatus('error');
                return { success: false, error: 'LLM not available' };
            }

            let fullResponse = '';

            for await (const chunk of llm.stream(messages)) {
                fullResponse += chunk;
                yield chunk;
            }

            const insights = parseInsightsFromResponse(fullResponse);
            // Disable auto-distribution to prevent noise - keep only raw observation
            // this.distributeInsights(insights, activePersona);

            // Manually save the streamed response to observations
            mindStore.addToPool('observations', {
                type: 'analysis',
                content: fullResponse,
                importance: 0.8,
                metadata: {
                    source: activePersona.name,
                    tokensUsed: 0, // Stream doesn't report tokens yet
                    blocksAnalyzed: snapshot.totalBlocks,
                    snapshotTimestamp: snapshot.timestamp
                }
            });

            mindStore.setStatus('ready');

            return {
                success: true,
                response: fullResponse,
                insights
            };

        } catch (error) {
            useMindStore.getState().setStatus('error');
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Summarize a block of context into a single concise insight
     */
    async summarizeContext(context: string): Promise<string> {
        const mindStore = useMindStore.getState();
        const { llmConfig } = mindStore;
        const llm = getLLMService(llmConfig);

        if (!await llm.isAvailable()) {
            return "Unable to crystallize: LLM unavailable.";
        }

        const prompt = `
You are a highly efficient memory crystallization engine.
Target: Distill the following data into a SINGLE, dense, high-value sentence for long-term storage.
Input Data:
${context.slice(0, 10000)}

Rules:
1. Output ONLY the crystallized insight.
2. Discard noise, formatting, and temporary details.
3. Focus on the core fact, probability, or event.
4. Max 50 words.
        `.trim();

        const response = await llm.complete([
            { role: 'system', content: 'You are a precise data summarizer.' },
            { role: 'user', content: prompt }
        ]);

        return response.content.trim();
    }

    /**
     * Build analysis prompt using Shell snapshot
     */
    private buildSnapshotAnalysisPrompt(snapshotContext: string, question?: string): string {
        const taskDescription = question ||
            'Analyze the current Shell landscape and provide your perspective based on your persona. What patterns, insights, or concerns do you observe across the data streams?';

        return `${snapshotContext}

---

## Your Task

${taskDescription}

**Instructions:**
- Consider the complete landscape context above, including all blocks, their relationships, and current state
- Pay special attention to FOCUSED BLOCKS (📌) - these have been pinned for deep analysis
- Note the status and freshness of data across different streams
- Respond concisely but thoroughly, being specific about what the data tells you
- If you find information critical for long-term retention, output it on a separate line starting with "SUGGEST_MEMORY: "`;
    }

    /**
     * Gather data from Shell blocks (legacy method, kept for compatibility)
     */
    private gatherBlockData(): BlockDataSummary[] {
        const blockStore = useBlockStore.getState();
        const blocks = blockStore.blocks;

        return blocks.map((block: BlockInstance) => {
            // Extract key info based on block type
            const blockType = block.schema.block_id;
            const summary = this.summarizeBlockData(blockType, block.data);

            return {
                type: blockType,
                title: block.schema.display_name || blockType,
                summary,
                keyMetrics: this.extractKeyMetrics(blockType, block.data),
                timestamp: block.last_updated ?? undefined
            };
        });
    }

    /**
     * Summarize block data for context
     */
    private summarizeBlockData(blockType: string, data: unknown): string {
        const d = data as Record<string, any> | null;

        switch (blockType) {
            case 'polymarket':
                if (d?.market) {
                    return `Market: "${d.market.question}" - Current probability: ${Math.round((d.market.yes_price || 0.5) * 100)}% YES. Volume: $${d.market.volume?.toLocaleString() || 'N/A'}`;
                }
                return 'Polymarket block - no data loaded';

            case 'tradingview':
                if (d?.symbol) {
                    return `Chart: ${d.symbol} - ${d.interval || '1D'} timeframe`;
                }
                return 'TradingView chart - no symbol configured';

            case 'newsfeed':
                if (d?.articles?.length) {
                    const headlines = d.articles.slice(0, 3).map((a: any) => a.title).join('; ');
                    return `Recent headlines: ${headlines}`;
                }
                return 'News feed - no articles loaded';

            default:
                return `${blockType} block with ${Object.keys(d || {}).length} data fields`;
        }
    }

    /**
     * Extract key metrics from block
     */
    private extractKeyMetrics(blockType: string, data: unknown): string[] {
        const metrics: string[] = [];
        const d = data as Record<string, any> | null;

        if (blockType === 'polymarket' && d?.market) {
            metrics.push(`YES: ${Math.round((d.market.yes_price || 0.5) * 100)}%`);
            if (d.market.volume) metrics.push(`Vol: $${(d.market.volume / 1000).toFixed(0)}k`);
        }

        return metrics;
    }

    /**
     * Distribute insights to appropriate context pools
     */
    private distributeInsights(insights: ExtractedInsight[], persona: PersonaConfig): void {
        const mindStore = useMindStore.getState();

        for (const insight of insights) {
            let poolId: string;

            switch (insight.type) {
                case 'prediction':
                    poolId = 'predictions';
                    break;
                case 'directive':
                    poolId = 'directives';
                    break;
                case 'warning':
                case 'inference':
                case 'memory_suggestion':
                    poolId = 'inferences';
                    break;
                default:
                    poolId = 'observations';
            }

            const isMemorySuggestion = insight.type === 'memory_suggestion';

            mindStore.addToPool(poolId, {
                type: isMemorySuggestion ? 'inference' : (insight.type === 'warning' ? 'inference' : insight.type as any), // Cast to fit ContextEntryType
                content: insight.content,
                importance: isMemorySuggestion ? 0.95 : (insight.confidence === 'high' ? 0.9 : insight.confidence === 'medium' ? 0.6 : 0.3),
                metadata: {
                    source: persona.name,
                    confidence: insight.confidence,
                    personaId: persona.id,
                    isMemorySuggestion: isMemorySuggestion
                }
            });
        }
    }
}

// ============================================
// TYPES
// ============================================

export interface ThinkResult {
    success: boolean;
    response?: string;
    insights?: ExtractedInsight[];
    tokensUsed?: number;
    error?: string;
}

// ============================================
// SINGLETON
// ============================================

let mindEngineInstance: MindEngine | null = null;

export function getMindEngine(): MindEngine {
    if (!mindEngineInstance) {
        mindEngineInstance = new MindEngine();
    }
    return mindEngineInstance;
}
