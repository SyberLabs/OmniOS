'use client';

// ============================================
// PROJECT OMNI: SYSTEM PROXY BLOCK
// Read-only mirror of a System's outputs
// ============================================

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ExternalLink, Zap, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useCognitiveStore } from '@/core/stores';
import { SystemType } from '@/core/schemas/core.schema';
import { cn } from '@/lib/utils';

interface SystemProxyBlockProps {
    blockId: string;
    systemId: SystemType;
    isSelected?: boolean;
}

// System icons mapping
const SYSTEM_ICONS: Record<SystemType, string> = {
    health: '🏥',
    career: '💼',
    finance: '💰',
    mind: '🧠',
    relationships: '💞',
    environment: '🏠',
    time: '⏳'
};

export function SystemProxyBlock({ blockId, systemId, isSelected }: SystemProxyBlockProps) {
    const router = useRouter();
    const { systems, systemShells, getSystemShell } = useCognitiveStore();

    const system = systems.find(s => s.id === systemId);
    const shell = systemShells[systemId];

    if (!system) {
        return (
            <div className="p-4 text-center text-[var(--text-muted)]">
                System not found: {systemId}
            </div>
        );
    }

    const getStabilityColor = (score: number) => {
        if (score >= 80) return 'var(--truth-green)';
        if (score >= 60) return 'var(--truth-amber)';
        return 'var(--truth-red)';
    };

    const getTrend = (score: number) => {
        // In a real implementation, this would compare to previous values
        if (score >= 70) return 'up';
        if (score >= 50) return 'stable';
        return 'down';
    };

    const trend = getTrend(system.stabilityScore);

    const handleOpenShell = () => {
        router.push(`/garden/system/${systemId}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "h-full flex flex-col rounded-lg overflow-hidden",
                "bg-gradient-to-br from-[var(--citadel-surface)] to-[var(--citadel-elevated)]",
                "border border-[var(--citadel-border)]",
                isSelected && "ring-2 ring-[var(--citadel-primary)]"
            )}
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--citadel-border)]">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{SYSTEM_ICONS[systemId]}</span>
                    <div>
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                            {system.name}
                        </h3>
                        <p className="text-[10px] text-[var(--text-muted)]">
                            System Proxy
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleOpenShell}
                    className="p-2 rounded-lg hover:bg-[var(--citadel-surface)] transition-colors group"
                    title="Open System Shell"
                >
                    <ExternalLink className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--citadel-primary)]" />
                </button>
            </div>

            {/* Stability Score */}
            <div className="px-4 py-3 border-b border-[var(--citadel-border)]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-muted)]">Stability</span>
                    <div className="flex items-center gap-1">
                        {trend === 'up' && <TrendingUp className="w-3 h-3 text-[var(--truth-green)]" />}
                        {trend === 'down' && <TrendingDown className="w-3 h-3 text-[var(--truth-red)]" />}
                        {trend === 'stable' && <Minus className="w-3 h-3 text-[var(--text-muted)]" />}
                        <span
                            className="text-lg font-bold"
                            style={{ color: getStabilityColor(system.stabilityScore) }}
                        >
                            {system.stabilityScore}%
                        </span>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-[var(--citadel-void)] rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${system.stabilityScore}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: getStabilityColor(system.stabilityScore) }}
                    />
                </div>
            </div>

            {/* Exposed Outputs */}
            <div className="flex-1 px-4 py-3 overflow-y-auto">
                <div className="flex items-center gap-1 mb-2">
                    <Zap className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                        Exposed Outputs
                    </span>
                </div>

                {shell?.exposedOutputs && shell.exposedOutputs.length > 0 ? (
                    <div className="space-y-2">
                        {shell.exposedOutputs.map((output) => (
                            <div
                                key={output.id}
                                className="flex items-center justify-between p-2 rounded-lg bg-[var(--citadel-void)] border border-[var(--citadel-border)]"
                            >
                                <span className="text-xs text-[var(--text-muted)]">
                                    {output.name}
                                </span>
                                <span className="text-sm font-mono font-medium text-[var(--truth-green)]">
                                    {typeof output.value === 'number'
                                        ? output.value.toFixed(1)
                                        : String(output.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4">
                        <p className="text-xs text-[var(--text-muted)]">
                            No outputs exposed yet
                        </p>
                        <button
                            onClick={handleOpenShell}
                            className="mt-2 text-xs text-[var(--citadel-primary)] hover:underline"
                        >
                            Configure in Shell →
                        </button>
                    </div>
                )}
            </div>

            {/* Footer - Output Port Indicator */}
            <div className="px-4 py-2 border-t border-[var(--citadel-border)] bg-[var(--citadel-void)]/50">
                <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] text-[var(--text-muted)]">→ stability_score</span>
                    <div className="w-3 h-3 rounded-full bg-[var(--truth-green)] border-2 border-[var(--citadel-surface)]" />
                </div>
            </div>
        </motion.div>
    );
}

export default SystemProxyBlock;
