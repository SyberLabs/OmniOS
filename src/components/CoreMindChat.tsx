'use client';

// ============================================
// CORE MIND CHAT COMPONENT
// Chat interface for Project-specific AI
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Send,
    X,
    Loader2,
    Trash2,
    Folder,
    Link2,
    Sparkles
} from 'lucide-react';
import { Project, SystemType } from '@/core/schemas/core.schema';
import { getCoreMindEngine, CoreMindMessage } from '@/core/services/coreMind.engine';
import { cn } from '@/lib/utils';

// ============================================
// CORE MIND CHAT PANEL
// ============================================

interface CoreMindChatProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
}

export function CoreMindChat({
    project,
    isOpen,
    onClose
}: CoreMindChatProps) {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<CoreMindMessage[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamingContent, setStreamingContent] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load messages from engine
    useEffect(() => {
        if (isOpen) {
            const engine = getCoreMindEngine();
            setMessages(engine.getMessages(project.id));
            inputRef.current?.focus();
        }
    }, [isOpen, project.id]);

    // Scroll to bottom on new messages - use scrollTop to avoid page shift
    useEffect(() => {
        const container = messagesEndRef.current?.parentElement;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }, [messages, streamingContent]);

    const handleSend = useCallback(async () => {
        if (!input.trim() || isStreaming) return;

        const userMessage = input.trim();
        setInput('');
        setIsStreaming(true);
        setStreamingContent('');

        // Add user message immediately
        const userMsg: CoreMindMessage = {
            id: `temp_user_${Date.now()}`,
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            const engine = getCoreMindEngine();

            // Stream response
            let fullResponse = '';
            for await (const chunk of engine.chatStream(project.id, userMessage)) {
                fullResponse += chunk;
                setStreamingContent(fullResponse);
            }

            // Get updated messages from engine
            setMessages(engine.getMessages(project.id));
            setStreamingContent('');

        } catch (error) {
            console.error('Core Mind chat error:', error);
        } finally {
            setIsStreaming(false);
        }
    }, [input, isStreaming, project.id]);

    const handleClear = useCallback(() => {
        const engine = getCoreMindEngine();
        engine.clearMessages(project.id);
        setMessages([]);
    }, [project.id]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-4 right-4 w-[420px] h-[520px] bg-[var(--citadel-surface)] border border-[var(--citadel-border)] rounded-2xl shadow-2xl flex flex-col z-[2100] overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--citadel-border)] bg-[var(--citadel-elevated)]">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{project.icon}</span>
                    <div>
                        <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            {project.name}
                            <Folder className="w-4 h-4 text-[var(--citadel-primary)]" />
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                            <span>Core Mind</span>
                            {project.linkedSystems.length > 0 && (
                                <>
                                    <Link2 className="w-3 h-3" />
                                    <span>{project.linkedSystems.length} linked</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleClear}
                        className="p-2 rounded-lg hover:bg-[var(--citadel-surface)] transition-colors"
                        title="Clear conversation"
                    >
                        <Trash2 className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="p-2 rounded-lg hover:bg-[var(--citadel-surface)] transition-colors"
                    >
                        <X className="w-4 h-4 text-[var(--text-muted)]" />
                    </button>
                </div>
            </div>

            {/* Linked Systems Indicator */}
            {project.linkedSystems.length > 0 && (
                <div className="px-4 py-2 bg-[var(--citadel-primary)]/10 border-b border-[var(--citadel-border)] text-xs text-[var(--text-secondary)]">
                    <span className="font-medium">Context from:</span>{' '}
                    {project.linkedSystems.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(', ')}
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && !streamingContent && (
                    <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-muted)]">
                        <Sparkles className="w-12 h-12 mb-4 opacity-30" />
                        <p className="text-sm">Chat with the {project.name} Core Mind.</p>
                        <p className="text-xs mt-2 opacity-60">
                            {project.linkedSystems.length > 0
                                ? `Has access to ${project.linkedSystems.join(', ')} context.`
                                : 'Link Systems to give the AI more context.'}
                        </p>
                    </div>
                )}

                {messages.map(msg => (
                    <MessageBubble key={msg.id} message={msg} />
                ))}

                {streamingContent && (
                    <MessageBubble
                        message={{
                            id: 'streaming',
                            role: 'assistant',
                            content: streamingContent,
                            timestamp: Date.now()
                        }}
                        isStreaming
                    />
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[var(--citadel-border)]">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={`Ask about ${project.name}...`}
                        disabled={isStreaming}
                        className="flex-1 px-4 py-2 bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--citadel-primary)] disabled:opacity-50"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isStreaming}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            input.trim() && !isStreaming
                                ? "bg-[var(--citadel-primary)] text-white hover:bg-[var(--citadel-primary-glow)]"
                                : "bg-[var(--citadel-elevated)] text-[var(--text-muted)]"
                        )}
                    >
                        {isStreaming ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

// ============================================
// MESSAGE BUBBLE
// ============================================

interface MessageBubbleProps {
    message: CoreMindMessage;
    isStreaming?: boolean;
}

function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div className={cn(
            "flex",
            isUser ? "justify-end" : "justify-start"
        )}>
            <div className={cn(
                "max-w-[80%] px-4 py-2 rounded-2xl text-sm",
                isUser
                    ? "bg-[var(--citadel-primary)] text-white rounded-br-sm"
                    : "bg-[var(--citadel-elevated)] text-[var(--text-primary)] rounded-bl-sm"
            )}>
                <p className="whitespace-pre-wrap">{message.content}</p>
                {isStreaming && (
                    <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                )}
            </div>
        </div>
    );
}

export default CoreMindChat;
