'use client';

// ============================================
// PROJECT OMNI: PERSONA BLOCK
// AI persona with wired context connections
// ============================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    ChevronDown,
    ChevronUp,
    Zap,
    RefreshCw,
    Loader2,
    Plug,
    Settings,
    Trash2,
    MessageSquare,
    X
} from 'lucide-react';
import { useBlockStore } from '@/core/stores';
import { useWireStore } from '@/core/stores/wireStore';
import { useMindStore } from '@/core/stores/mindStore';
import { aggregateWireContext } from '@/core/services/wire.service';
import { PersonaType } from '@/core/schemas/shell.schema';
import {
    PersonaBlockData,
    PersonaChatMessage,
    PERSONA_CONFIGS,
    createPersonaBlockData,
    DEFAULT_CONTEXT_SETTINGS
} from '@/core/schemas/wire.schema';
import { cn } from '@/lib/utils';

interface PersonaBlockViewProps {
    instanceId: string;
}

export function PersonaBlockView({ instanceId }: PersonaBlockViewProps) {
    const block = useBlockStore(state => state.blocks.find(b => b.instance_id === instanceId));
    const updateData = useBlockStore(state => state.updateData);
    const getWiresToBlock = useWireStore(state => state.getWiresToBlock);
    const getBlock = useBlockStore(state => state.getBlock);

    const [input, setInput] = useState('');
    const [showSettings, setShowSettings] = useState(false);
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

    const handleSendMessage = () => {
        if (!input.trim() || personaData.isThinking) return;

        const userMessage: PersonaChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: input.trim(),
            timestamp: Date.now()
        };

        const newMessages = [...personaData.messages, userMessage];
        updatePersonaData({ messages: newMessages, isThinking: true });
        setInput('');

        // Simulate AI response (replace with actual Mind Engine call)
        setTimeout(() => {
            const assistantMessage: PersonaChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `[${config.name}]: I've analyzed the context from ${connectedWires.length} connected source(s). ${connectedWires.length === 0
                    ? "Wire some data blocks to me for richer insights!"
                    : "Based on the connected data..."
                    }\n\nYour question: "${userMessage.content}"\n\nThis is a placeholder response. Connect to an LLM provider in the API Dashboard to enable real AI responses.`,
                timestamp: Date.now(),
                sourcedFrom: connectedWires.map(w => w.sourceBlockId)
            };

            updatePersonaData({
                messages: [...newMessages, assistantMessage],
                isThinking: false
            });
        }, 1500);
    };

    const handleUpdateContext = useCallback(() => {
        // Use wireService to aggregate context from all connected blocks
        const { context, sourceIds, lastUpdate } = aggregateWireContext(instanceId);

        updatePersonaData({
            currentContext: context,
            lastContextUpdate: lastUpdate
        });
    }, [instanceId, updatePersonaData]);

    const handleThink = () => {
        if (personaData.isThinking) return;

        updatePersonaData({ isThinking: true });

        // Simulate autonomous thinking
        setTimeout(() => {
            const thinkMessage: PersonaChatMessage = {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: `💭 *${config.name} is analyzing ${connectedWires.length} data source(s)...*\n\nAutonomous analysis complete. Key observations:\n\n1. Context integration from ${connectedWires.length} sources\n2. Pattern detection across connected data\n3. Insight generation based on ${config.description}\n\nConnect more data blocks or ask me specific questions for deeper analysis.`,
                timestamp: Date.now(),
                sourcedFrom: connectedWires.map(w => w.sourceBlockId)
            };

            updatePersonaData({
                messages: [...personaData.messages, thinkMessage],
                isThinking: false,
                lastContextUpdate: Date.now()
            });
        }, 2000);
    };

    const toggleCollapsed = useCallback((e?: React.MouseEvent) => {
        if (e) {
            e.stopPropagation();
        }
        console.log('Toggle collapsed:', !personaData.isCollapsed);
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
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowSettings(!showSettings); }}
                        className="p-1.5 rounded-md hover:bg-[var(--citadel-surface)] transition-colors border border-transparent hover:border-[var(--citadel-border)]"
                        title="Shell Mind Integration Settings"
                    >
                        <Settings className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
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

            {/* Settings Modal */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
                        onClick={() => setShowSettings(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative bg-[var(--citadel-bg)]/95 backdrop-blur-xl border border-[var(--citadel-border)] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl"
                            style={{
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1) inset'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                        <span className="text-lg">🧠</span>
                                        Shell Mind Integration
                                    </h3>
                                    <p className="text-xs text-[var(--text-muted)] mt-1">
                                        Combine wired data with global awareness
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowSettings(false)}
                                    className="p-1.5 hover:bg-[var(--citadel-surface)]/50 rounded-lg transition-colors"
                                >
                                    <X className="w-4 h-4 text-[var(--text-muted)]" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <label className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-primary)]">Global Observations</p>
                                        <p className="text-xs text-[var(--text-muted)]">Import Shell Mind's observations</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={personaData.contextSettings?.useGlobalObservations ?? false}
                                        onChange={(e) => {
                                            updatePersonaData({
                                                contextSettings: {
                                                    ...(personaData.contextSettings || DEFAULT_CONTEXT_SETTINGS),
                                                    useGlobalObservations: e.target.checked
                                                }
                                            });
                                        }}
                                        className="w-4 h-4"
                                    />
                                </label>

                                <label className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-primary)]">Focused Blocks</p>
                                        <p className="text-xs text-[var(--text-muted)]">Auto-import pinned blocks</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={personaData.contextSettings?.importFocusedBlocks ?? false}
                                        onChange={(e) => {
                                            updatePersonaData({
                                                contextSettings: {
                                                    ...(personaData.contextSettings || DEFAULT_CONTEXT_SETTINGS),
                                                    importFocusedBlocks: e.target.checked
                                                }
                                            });
                                        }}
                                        className="w-4 h-4"
                                    />
                                </label>

                                <label className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-primary)]">Long-Term Memory</p>
                                        <p className="text-xs text-[var(--text-muted)]">Access global memory pool</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={personaData.contextSettings?.useGlobalMemory ?? false}
                                        onChange={(e) => {
                                            updatePersonaData({
                                                contextSettings: {
                                                    ...(personaData.contextSettings || DEFAULT_CONTEXT_SETTINGS),
                                                    useGlobalMemory: e.target.checked
                                                }
                                            });
                                        }}
                                        className="w-4 h-4"
                                    />
                                </label>

                                <label className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-[var(--text-primary)]">Max Observations</p>
                                        <p className="text-xs text-[var(--text-muted)]">Number of observations to import</p>
                                    </div>
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={personaData.contextSettings?.maxObservations ?? 10}
                                        onChange={(e) => {
                                            updatePersonaData({
                                                contextSettings: {
                                                    ...(personaData.contextSettings || DEFAULT_CONTEXT_SETTINGS),
                                                    maxObservations: parseInt(e.target.value) || 10
                                                }
                                            });
                                        }}
                                        className="w-16 px-2 py-1 bg-[var(--citadel-surface)] border border-[var(--citadel-border)] rounded text-sm"
                                    />
                                </label>
                            </div>

                            <div className="mt-4 pt-3 border-t border-[var(--citadel-border)]">
                                <p className="text-xs text-[var(--text-muted)]">
                                    💡 Enable these to combine explicit wire connections with Shell Mind's global awareness
                                </p>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                {msg.sourcedFrom && msg.sourcedFrom.length > 0 && (
                                    <p className="text-xs mt-1 opacity-60">
                                        📎 From {msg.sourcedFrom.length} source(s)
                                    </p>
                                )}
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

export default PersonaBlockView;
