// ============================================
// PROJECT OMNI: METACULUS BLOCK VIEW
// UI component for displaying forecast questions
// ============================================

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Target,
    ExternalLink,
    RefreshCw,
    Clock,
    Users,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import type { OmniItem } from '@/core/gateway';
import type { ConnectionStatus } from '@/core/schemas/block.schema';
import { cn } from '@/lib/utils';
import { PortBadge } from './PortBadge';

interface MetaculusViewProps {
    questions: OmniItem[];
    status: ConnectionStatus;
    lastUpdated: number | null;
    onRefresh: () => void;
}

export function MetaculusView({ questions, status, lastUpdated, onRefresh }: MetaculusViewProps) {
    const isLoading = status === 'connecting' && questions.length === 0;
    const isError = status === 'error';

    return (
        <div className="flex flex-col h-full bg-[var(--citadel-surface)]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--citadel-border)] flex-shrink-0">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md bg-[var(--truth-green)]/10 text-[var(--truth-green)]">
                        <Target className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-[var(--text-primary)]">Metaculus</h3>
                        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                            <span className={cn(
                                "flex items-center gap-1",
                                status === 'connected' ? "text-[var(--truth-green)]" : "text-[var(--text-muted)]"
                            )}>
                                <span className={cn("w-1.5 h-1.5 rounded-full",
                                    status === 'connected' ? "bg-[var(--truth-green)]" : "bg-[var(--text-muted)]"
                                )} />
                                {status === 'connected' ? 'Live' : status}
                            </span>
                            {lastUpdated && <span>• Updated {new Date(lastUpdated).toLocaleTimeString()}</span>}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={onRefresh}
                        className={cn(
                            "p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--citadel-border)]/50 transition-colors",
                            status === 'connecting' && "animate-spin"
                        )}
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <PortBadge
                        port={{
                            id: 'forecasts',
                            direction: 'output',
                            dataType: 'json',
                            label: 'Forecasts'
                        }}
                        connectionCount={1}
                    />
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--text-muted)]">
                        <RefreshCw className="w-8 h-8 animate-spin mb-2 opacity-50" />
                        <span className="text-xs">Fetching forecasts...</span>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-10 text-[var(--truth-red)]">
                        <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">Connection failed</span>
                        <button
                            onClick={onRefresh}
                            className="mt-2 px-3 py-1 bg-[var(--truth-red)]/10 rounded-full text-xs hover:bg-[var(--truth-red)]/20 transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : questions.length === 0 ? (
                    <div className="text-center py-10 text-[var(--text-muted)] text-xs">
                        No questions available
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {questions.map((question) => (
                            <ForecastCard key={question.id} question={question} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-3 py-2 border-t border-[var(--citadel-border)] bg-[var(--citadel-bg)]/50 flex-shrink-0">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                    <span>{questions.length} active questions</span>
                    <a
                        href="https://www.metaculus.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--citadel-primary)] transition-colors"
                    >
                        metaculus.com
                    </a>
                </div>
            </div>
        </div>
    );
}

function ForecastCard({ question }: { question: OmniItem }) {
    const probability = question.metadata?.probability ?? 0.5;
    const probabilityPercent = Math.round(probability * 100);
    const forecasters = question.metadata?.forecasters || 0;

    // Color scale from red (0%) to green (100%)
    // Using HSL to keep it in the 'Truth' theme (green/blue) but varying lightness/saturation
    // Actually, for truth markets:
    // High prob -> Green
    // Low prob -> Red/Orange
    // Mid -> Yellow

    let colorClass = "text-[var(--text-muted)]";
    let bgClass = "bg-[var(--text-muted)]/20";
    let barColor = "bg-[var(--text-muted)]";

    if (probability > 0.66) {
        colorClass = "text-[var(--truth-green)]";
        bgClass = "bg-[var(--truth-green)]/10";
        barColor = "bg-[var(--truth-green)]";
    } else if (probability < 0.33) {
        colorClass = "text-[var(--truth-red)]";
        bgClass = "bg-[var(--truth-red)]/10";
        barColor = "bg-[var(--truth-red)]";
    } else {
        colorClass = "text-[var(--truth-amber)]";
        bgClass = "bg-[var(--truth-amber)]/10";
        barColor = "bg-[var(--truth-amber)]";
    }

    return (
        <motion.a
            href={question.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="block p-3 rounded-lg border border-[var(--citadel-border)] bg-[var(--citadel-bg)] hover:bg-[var(--citadel-elevated)] hover:border-[var(--citadel-primary)]/30 transition-all group"
        >
            <h4 className="text-xs font-medium text-[var(--text-primary)] leading-tight mb-2 group-hover:text-[var(--citadel-primary)] transition-colors">
                {question.title}
            </h4>

            <div className="space-y-2">
                {/* Probability Bar */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-[var(--citadel-surface)] rounded-full overflow-hidden">
                        <div
                            className={cn("h-full rounded-full transition-all duration-500", barColor)}
                            style={{ width: `${probabilityPercent}%` }}
                        />
                    </div>
                    <span className={cn("text-xs font-bold w-8 text-right", colorClass)}>
                        {probabilityPercent}%
                    </span>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{forecasters}</span>
                    </div>
                    {question.metadata?.closeTime && (
                        <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(question.metadata.closeTime).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.a>
    );
}
