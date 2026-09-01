'use client';

// ============================================
// PROJECT OMNI: PERSONA BLOCK
// AI persona with wired context connections
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    Send,
    ChevronDown,
    ChevronUp,
    Zap,
    Loader2,
    Plug,
    MessageSquare,
} from 'lucide-react';
import { useBlockStore, useUIStore } from '@/core/stores';
import { useWireStore } from '@/core/stores/wireStore';
import { aggregateWireContext } from '@/core/services/wire.service';
import { streamPersonaTurn } from '@/core/services/persona.engine';
import { PersonaType } from '@/core/schemas/shell.schema';
import {
    PersonaBlockData,
    PERSONA_CONFIGS,
    createPersonaBlockData,
    ContextSource,
    PersonaChatMessage
} from '@/core/schemas/wire.schema';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

interface PersonaBlockViewProps {
    instanceId: string;
}

/**
 * How often a streaming answer is published to the store. Fast enough to read
 * as live typing, slow enough that the canvas is not re-rendered per token.
 */
const STREAM_COMMIT_MS = 80;

export function PersonaBlockView({ instanceId }: PersonaBlockViewProps) {
    const block = useBlockStore(state => state.blocks.find(b => b.instance_id === instanceId));
    const updateData = useBlockStore(state => state.updateData);
    const getWiresToBlock = useWireStore(state => state.getWiresToBlock);
    const getBlock = useBlockStore(state => state.getBlock);

    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initialize data if needed - do this FIRST
    useEffect(() => {
        if (block && !block.data) {
            // Extract persona type from block schema (e.g., "persona_analyst" -> "analyst")
            const personaType = block.schema.block_id.replace('persona_', '') as PersonaType;
            updateData(instanceId, createPersonaBlockData(personaType));
        }
    }, [block, instanceId, updateData]);

    // Get persona data or create default
    const personaData: PersonaBlockData = (block?.data as PersonaBlockData) ||
        createPersonaBlockData('analyst');

    const config = PERSONA_CONFIGS[personaData.personaType];
    const connectedWires = getWiresToBlock(instanceId);

    // Auto-scroll to bottom of messages - use scrollTop to avoid page shift
    useEffect(() => {
        const container = messagesEndRef.current?.parentElement;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [personaData.messages]);

    const updatePersonaData = useCallback((updates: Partial<PersonaBlockData>) => {
        updateData(instanceId, { ...personaData, ...updates });
    }, [instanceId, personaData, updateData]);

    // Shared real-LLM turn: streams a response from the persona engine and
    // commits it to the block's message history. Used by both chat and Think.
    // Reads the latest persona data from the store on each commit to avoid
    // stale-closure issues during streaming.
    const runTurn = useCallback(async (userMessage?: string) => {
        const current = (getBlock(instanceId)?.data as PersonaBlockData) || personaData;
        if (current.isThinking) return;

        const baseMessages = userMessage
            ? [
                ...current.messages,
                {
                    id: `msg-${Date.now()}`,
                    role: 'user' as const,
                    content: userMessage,
                    timestamp: Date.now()
                }
            ]
            : current.messages;

        // Show the user message immediately + thinking state.
        updateData(instanceId, { ...current, messages: baseMessages, isThinking: true });

        const assistantId = `msg-${Date.now()}-a`;
        let acc = '';
        // Provenance comes from the turn itself. A wire that is connected but
        // carried no data did not feed this answer and must not be cited.
        let turnSources: ContextSource[] = [];
        const commit = (content: string, isThinking: boolean) => {
            const latest = (getBlock(instanceId)?.data as PersonaBlockData) || current;
            const withoutDraft = latest.messages.filter(m => m.id !== assistantId);
            updateData(instanceId, {
                ...latest,
                isThinking,
                lastContextUpdate: Date.now(),
                messages: [
                    ...withoutDraft,
                    {
                        id: assistantId,
                        role: 'assistant' as const,
                        content,
                        timestamp: Date.now(),
                        sourcedFrom: turnSources.map(x => x.id),
                        sources: turnSources
                    }
                ]
            });
        };

        try {
            const gen = streamPersonaTurn({
                instanceId,
                personaType: personaData.personaType,
                customName: personaData.customName,
                history: current.messages,
                userMessage
            });

            // Accumulate every token, but publish on a clock. commit() writes
            // to the global block store, so a per-token commit re-rendered the
            // whole canvas once per token — hundreds of full renders per answer,
            // felt exactly when the user is watching most closely. The text is
            // never lost: acc holds it and the final commit below always runs.
            let lastCommit = 0;
            let result = await gen.next();
            while (!result.done) {
                acc += result.value;
                const now = Date.now();
                if (now - lastCommit >= STREAM_COMMIT_MS) {
                    lastCommit = now;
                    commit(acc, true);
                }
                result = await gen.next();
            }

            const final = result.value;
            turnSources = final.sources;
            if (!final.success) {
                commit(`⚠️ ${final.error}`, false);
            } else {
                commit(final.content || acc, false);
            }
        } catch (err) {
            commit(`⚠️ ${err instanceof Error ? err.message : 'Something went wrong.'}`, false);
        }
    }, [instanceId, getBlock, updateData, personaData]);

    const handleSendMessage = () => {
        if (!input.trim() || personaData.isThinking) return;
        const message = input.trim();
        setInput('');
        void runTurn(message);
    };

    const handleUpdateContext = useCallback(() => {
        // Use wireService to aggregate context from all connected blocks
        const { context, lastUpdate } = aggregateWireContext(instanceId);

        updatePersonaData({
            currentContext: context,
            lastContextUpdate: lastUpdate
        });
    }, [instanceId, updatePersonaData]);

    const handleThink = () => {
        if (personaData.isThinking) return;
        // Autonomous analysis: no user message — the engine uses its default
        // "analyze the wired data" task.
        void runTurn();
    };

    const toggleCollapsed = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        updatePersonaData({ isCollapsed: !personaData.isCollapsed });
    }, [personaData.isCollapsed, updatePersonaData]);

    // Collapsed view
    if (personaData.isCollapsed) {
        return (
            <div
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-[var(--citadel-surface)]"
                onClick={toggleCollapsed}
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{config.avatar}</span>
                    <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                            {personaData.customName || config.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                            {connectedWires.length} connections • {personaData.messages.length} messages
                        </p>
                    </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative">
            {/* Compact Header */}
            <div
                className="flex items-center justify-between px-2 py-1.5 border-b border-[var(--citadel-border)]/50"
                style={{ backgroundColor: `${config.color}08` }}
            >
                <div className="flex items-center gap-2">
                    <span className="text-base">{config.avatar}</span>
                    <div>
                        <p className="text-xs font-medium" style={{ color: config.color }}>
                            {personaData.customName || config.name}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div
                        className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                    >
                        <Plug className="w-3 h-3" />
                        {connectedWires.length}
                    </div>
                    <button
                        onClick={toggleCollapsed}
                        className="p-1 hover:bg-[var(--citadel-surface)] rounded transition-colors"
                        title="Collapse"
                    >
                        <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>
            </div>

            {/* Compact Context Status */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--citadel-border)]/50 bg-[var(--citadel-surface)]/30">
                <span className="text-[10px] text-[var(--text-muted)]">
                    {connectedWires.length === 0 ? 'No wires' : `${connectedWires.length} connected`}
                </span>
                <button
                    onClick={(e) => { e.stopPropagation(); handleUpdateContext(); }}
                    className="text-[10px] text-[var(--citadel-primary)] hover:underline"
                >
                    Refresh
                </button>
            </div>

            {/* Messages - maximized */}
            <div className="flex-1 overflow-auto p-2 space-y-2">
                {personaData.messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                        <MessageSquare
                            className="w-8 h-8 mb-2 opacity-50"
                            style={{ color: config.color }}
                        />
                        <p className="text-sm text-[var(--text-muted)]">
                            Wire data blocks to me for context
                        </p>
                        <p className="text-xs text-[var(--text-muted)]/70 mt-1">
                            Drag from block edge → drop here
                        </p>
                    </div>
                ) : (
                    personaData.messages.map(msg => (
                        <div
                            key={msg.id}
                            className={cn(
                                "flex gap-2",
                                msg.role === 'user' ? "justify-end" : "justify-start"
                            )}
                        >
                            {msg.role === 'assistant' && (
                                <span className="text-lg flex-shrink-0">{config.avatar}</span>
                            )}
                            <div
                                className={cn(
                                    "max-w-[85%] px-3 py-2 rounded-lg text-sm",
                                    msg.role === 'user'
                                        ? "text-white"
                                        : "bg-[var(--citadel-surface)] text-[var(--text-primary)] border border-[var(--citadel-border)]"
                                )}
                                style={msg.role === 'user' ? { backgroundColor: config.color } : undefined}
                            >
                                {msg.role === 'assistant' ? (
                                    <AnswerBody content={msg.content} />
                                ) : (
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                )}
                                <ProvenanceChips
                                    message={msg}
                                    show={msg.role === 'assistant'}
                                />
                            </div>
                        </div>
                    ))
                )}
                {personaData.isThinking && (
                    <div className="flex gap-2 items-center">
                        <span className="text-lg">{config.avatar}</span>
                        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--citadel-surface)] rounded-lg border border-[var(--citadel-border)]">
                            <Loader2 className="w-4 h-4 animate-spin" style={{ color: config.color }} />
                            <span className="text-sm text-[var(--text-muted)]">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Compact Input Area */}
            <div className="p-1.5 border-t border-[var(--citadel-border)]/50">
                <div className="flex gap-1">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        placeholder={`Ask ${config.name}...`}
                        disabled={personaData.isThinking}
                        className="flex-1 px-2 py-1 bg-transparent border border-[var(--citadel-border)]/50 rounded text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/50 focus:outline-none focus:border-[var(--citadel-primary)] disabled:opacity-50"
                    />
                    <button
                        onClick={handleThink}
                        disabled={personaData.isThinking}
                        className="p-1 rounded transition-colors disabled:opacity-50"
                        style={{ backgroundColor: `${config.color}20`, color: config.color }}
                        title="Think"
                    >
                        <Zap className="w-3 h-3" />
                    </button>
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || personaData.isThinking}
                        className="p-1 rounded text-white transition-colors disabled:opacity-50"
                        style={{ backgroundColor: config.color }}
                    >
                        <Send className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
}


// ============================================
// PROVENANCE CHIPS
// The answer to "what does this persona actually know?". Every source that
// fed a turn is named here. Every source is a block on the canvas, so every
// chip is hoverable and lights the thing it names — recollection included,
// since Memory became a wired block rather than a hidden per-persona toggle.
// Memory is styled apart because it is a different kind of evidence from
// live data, not because it is less pointable.
// ============================================

function ProvenanceChips({ message, show }: { message: PersonaChatMessage; show: boolean }) {
    const setHighlightedBlocks = useUIStore(state => state.setHighlightedBlocks);

    // Older messages predate typed sources; fall back to the legacy id list.
    const sources: ContextSource[] =
        message.sources && message.sources.length > 0
            ? message.sources
            : (message.sourcedFrom || []).map(id => ({ id, kind: 'wire' as const, label: id }));

    if (!show || sources.length === 0) return null;

    // One chip per source, ordered so the reader meets evidence before opinion.
    const order: Array<ContextSource['kind']> = ['wire', 'memory', 'inference'];
    const ordered = order.flatMap(k => sources.filter(s => s.kind === k));
    const hasDerived = sources.some(s => s.kind !== 'wire');

    return (
        <div className="mt-2 pt-2 border-t border-[var(--citadel-border)]/60">
            <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] mr-1">
                    Grounded in
                </span>

                {ordered.map(src => (
                    <SourceChip key={src.id} source={src} onHighlight={setHighlightedBlocks} />
                ))}
            </div>

            {hasDerived && (
                <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                    Dashed sources are recollection or another persona&apos;s answer, not live data.
                </p>
            )}
        </div>
    );
}

const CHIP_STYLE: Record<ContextSource['kind'], { className: string; title: string }> = {
    wire: {
        className:
            'border-[var(--citadel-secondary)]/40 text-[var(--citadel-secondary)] bg-[var(--citadel-secondary)]/10 hover:bg-[var(--citadel-secondary)]/20',
        title: 'Live data — highlight this block on the canvas'
    },
    memory: {
        className:
            'border-dashed border-[var(--truth-amber)]/60 text-[var(--truth-amber)] bg-[var(--truth-amber)]/10 hover:bg-[var(--truth-amber)]/20',
        title: 'Recollection from a Memory block — highlight it on the canvas'
    },
    inference: {
        // Deliberately distinct: an answer resting on another answer is the
        // one case where errors compound, and the reader should see it.
        className:
            'border-dashed border-[var(--citadel-primary)]/60 text-[var(--citadel-primary-glow)] bg-[var(--citadel-primary)]/10 hover:bg-[var(--citadel-primary)]/20',
        title: "Another persona's conclusion — highlight it on the canvas"
    }
};

function SourceChip({
    source,
    onHighlight
}: {
    source: ContextSource;
    onHighlight: (ids: string[]) => void;
}) {
    const style = CHIP_STYLE[source.kind] ?? CHIP_STYLE.wire;
    return (
        <button
            type="button"
            onMouseEnter={() => onHighlight([source.id])}
            onMouseLeave={() => onHighlight([])}
            onFocus={() => onHighlight([source.id])}
            onBlur={() => onHighlight([])}
            className={cn(
                'px-1.5 py-0.5 rounded text-[10px] border transition-colors',
                style.className
            )}
            title={style.title}
        >
            {source.label}
        </button>
    );
}


// ============================================
// ANSWER BODY
// Models answer in markdown because the system prompt asks for grounded,
// structured replies. Rendering that as preformatted text showed every reader
// literal ## and ** — the product's primary output, looking broken.
//
// react-markdown escapes HTML rather than injecting it, which matters here:
// an answer can quote text that came from an external feed.
//
// The element map keeps a 320px-wide block readable — tight spacing, wrapped
// code, and tables that scroll instead of forcing the card wider.
// ============================================

const MD_COMPONENTS = {
    p: (props: React.ComponentProps<'p'>) => <p className="mb-1.5 last:mb-0" {...props} />,
    ul: (props: React.ComponentProps<'ul'>) => (
        <ul className="list-disc pl-4 mb-1.5 last:mb-0 space-y-0.5" {...props} />
    ),
    ol: (props: React.ComponentProps<'ol'>) => (
        <ol className="list-decimal pl-4 mb-1.5 last:mb-0 space-y-0.5" {...props} />
    ),
    li: (props: React.ComponentProps<'li'>) => <li className="leading-snug" {...props} />,
    strong: (props: React.ComponentProps<'strong'>) => (
        <strong className="font-semibold text-[var(--text-primary)]" {...props} />
    ),
    // Headings in a card this small are emphasis, not hierarchy.
    h1: (props: React.ComponentProps<'h1'>) => (
        <p className="font-semibold text-[var(--text-primary)] mt-2 first:mt-0 mb-1" {...props} />
    ),
    h2: (props: React.ComponentProps<'h2'>) => (
        <p className="font-semibold text-[var(--text-primary)] mt-2 first:mt-0 mb-1" {...props} />
    ),
    h3: (props: React.ComponentProps<'h3'>) => (
        <p className="font-semibold text-[var(--text-primary)] mt-2 first:mt-0 mb-1" {...props} />
    ),
    code: ({ className, ...props }: React.ComponentProps<'code'>) =>
        className?.includes('language-') ? (
            <code className="block" {...props} />
        ) : (
            <code
                className="px-1 py-0.5 rounded bg-[var(--citadel-void)] text-[var(--citadel-secondary)] text-[11px]"
                {...props}
            />
        ),
    pre: (props: React.ComponentProps<'pre'>) => (
        <pre
            className="my-1.5 p-2 rounded bg-[var(--citadel-void)] border border-[var(--citadel-border)] overflow-x-auto text-[11px] leading-snug"
            {...props}
        />
    ),
    a: (props: React.ComponentProps<'a'>) => (
        <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--citadel-secondary)] underline underline-offset-2"
            {...props}
        />
    ),
    blockquote: (props: React.ComponentProps<'blockquote'>) => (
        <blockquote
            className="border-l-2 border-[var(--citadel-border)] pl-2 my-1.5 text-[var(--text-secondary)]"
            {...props}
        />
    ),
    table: (props: React.ComponentProps<'table'>) => (
        <div className="my-1.5 overflow-x-auto">
            <table className="text-[11px] border-collapse" {...props} />
        </div>
    ),
    th: (props: React.ComponentProps<'th'>) => (
        <th className="border border-[var(--citadel-border)] px-1.5 py-0.5 text-left font-semibold" {...props} />
    ),
    td: (props: React.ComponentProps<'td'>) => (
        <td className="border border-[var(--citadel-border)] px-1.5 py-0.5" {...props} />
    ),
    hr: () => <hr className="my-2 border-[var(--citadel-border)]" />
};

function AnswerBody({ content }: { content: string }) {
    return (
        <div className="text-sm break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
                {content}
            </ReactMarkdown>
        </div>
    );
}

export default PersonaBlockView;
