'use client';

// ============================================
// PROJECT OMNI: CORE CALCULATOR BLOCK
// Aggregates all System outputs into overall metrics
// ============================================

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calculator, TrendingUp, TrendingDown, AlertTriangle, Sparkles } from 'lucide-react';
import { useCognitiveStore } from '@/core/stores';
import { SystemType } from '@/core/schemas/core.schema';
import { cn } from '@/lib/utils';

interface CoreCalculatorBlockProps {
    blockId: string;
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

export function CoreCalculatorBlock({ blockId, isSelected }: CoreCalculatorBlockProps) {
    const { systems } = useCognitiveStore();

    // Calculate aggregate metrics
    const metrics = useMemo(() => {
        if (systems.length === 0) {
            return {
                overall: 0,
                average: 0,
                weakest: null as null | typeof systems[0],
                strongest: null as null | typeof systems[0],
                criticalCount: 0,
                healthyCount: 0,
                recommendations: [] as string[]
            };
        }

        const scores = systems.map(s => s.stabilityScore);
        const average = scores.reduce((a, b) => a + b, 0) / scores.length;

        // Weighted overall (some systems might matter more)
        const overall = average; // Simple average for now

        const sorted = [...systems].sort((a, b) => a.stabilityScore - b.stabilityScore);
        const weakest = sorted[0];
        const strongest = sorted[sorted.length - 1];

        const criticalCount = systems.filter(s => s.stabilityScore < 50).length;
        const healthyCount = systems.filter(s => s.stabilityScore >= 80).length;

        // Generate recommendations
        const recommendations: string[] = [];
        if (weakest && weakest.stabilityScore < 60) {
            recommendations.push(`Focus on ${weakest.name} (${weakest.stabilityScore}%)`);
        }
        if (criticalCount > 2) {
            recommendations.push('Multiple systems need attention');
        }
        if (healthyCount === systems.length) {
            recommendations.push('All systems healthy! Maintain balance.');
        }

        return {
            overall: Math.round(overall),
            average: Math.round(average),
            weakest,
            strongest,
            criticalCount,
            healthyCount,
            recommendations
        };
    }, [systems]);

    const getStabilityColor = (score: number) => {
        if (score >= 80) return 'var(--truth-green)';
        if (score >= 60) return 'var(--truth-amber)';
        return 'var(--truth-red)';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "h-full flex flex-col rounded-lg overflow-hidden",
                "bg-gradient-to-br from-[var(--citadel-primary)]/10 to-[var(--mind-aqua-surface)]/10",
                "border border-[var(--citadel-primary)]/30",
                isSelected && "ring-2 ring-[var(--citadel-primary)]"
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--citadel-primary)]/20 bg-[var(--citadel-primary)]/5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--citadel-primary)] to-[var(--mind-aqua-surface)] flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                        Core Calculator
                    </h3>
                    <p className="text-[10px] text-[var(--text-muted)]">
                        {systems.length} Systems Connected
                    </p>
                </div>
            </div>

            {/* Overall Score */}
            <div className="px-4 py-4 border-b border-[var(--citadel-border)]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[var(--text-muted)]">Overall Stability</span>
                    <span
                        className="text-2xl font-bold"
                        style={{ color: getStabilityColor(metrics.overall) }}
                    >
                        {metrics.overall}%
                    </span>
                </div>
                {/* Radial indicator */}
                <div className="relative h-24 flex items-center justify-center">
                    <svg className="w-24 h-24 transform -rotate-90">
                        <circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke="var(--citadel-border)"
                            strokeWidth="8"
                            fill="none"
                        />
                        <motion.circle
                            cx="48"
                            cy="48"
                            r="40"
                            stroke={getStabilityColor(metrics.overall)}
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: metrics.overall / 100 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            style={{
                                strokeDasharray: `${2 * Math.PI * 40}`,
                                strokeDashoffset: 0
                            }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-lg font-bold" style={{ color: getStabilityColor(metrics.overall) }}>
                            {metrics.overall}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">CORE</span>
                    </div>
                </div>
            </div>

            {/* System Grid */}
            <div className="flex-1 px-4 py-3 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {systems.map((system) => (
                        <div
                            key={system.id}
                            className="flex flex-col items-center p-2 rounded-lg bg-[var(--citadel-surface)] border border-[var(--citadel-border)]"
                            title={`${system.name}: ${system.stabilityScore}%`}
                        >
                            <span className="text-lg mb-1">{SYSTEM_ICONS[system.id]}</span>
                            <span
                                className="text-xs font-medium"
                                style={{ color: getStabilityColor(system.stabilityScore) }}
                            >
                                {system.stabilityScore}%
                            </span>
                        </div>
                    ))}
                </div>

                {/* Insights */}
                <div className="space-y-2">
                    {metrics.weakest && metrics.weakest.stabilityScore < 70 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--truth-red)]/10 border border-[var(--truth-red)]/30">
                            <TrendingDown className="w-4 h-4 text-[var(--truth-red)]" />
                            <span className="text-xs text-[var(--truth-red)]">
                                Weakest: {metrics.weakest.name} ({metrics.weakest.stabilityScore}%)
                            </span>
                        </div>
                    )}

                    {metrics.strongest && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--truth-green)]/10 border border-[var(--truth-green)]/30">
                            <TrendingUp className="w-4 h-4 text-[var(--truth-green)]" />
                            <span className="text-xs text-[var(--truth-green)]">
                                Strongest: {metrics.strongest.name} ({metrics.strongest.stabilityScore}%)
                            </span>
                        </div>
                    )}

                    {metrics.criticalCount > 0 && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--truth-amber)]/10 border border-[var(--truth-amber)]/30">
                            <AlertTriangle className="w-4 h-4 text-[var(--truth-amber)]" />
                            <span className="text-xs text-[var(--truth-amber)]">
                                {metrics.criticalCount} system{metrics.criticalCount > 1 ? 's' : ''} need attention
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Recommendations */}
            {metrics.recommendations.length > 0 && (
                <div className="px-4 py-2 border-t border-[var(--citadel-border)] bg-[var(--citadel-void)]/50">
                    <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="w-3 h-3 text-[var(--citadel-primary)]" />
                        <span className="text-[10px] font-semibold text-[var(--citadel-primary)]">
                            RECOMMENDATION
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                        {metrics.recommendations[0]}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

export default CoreCalculatorBlock;
