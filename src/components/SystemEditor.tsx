'use client';

// ============================================
// SYSTEM EDITOR COMPONENT
// Edit attributes, view stability breakdown
// ============================================

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    ChevronDown,
    ChevronUp,
    AlertTriangle,
    AlertCircle,
    Info,
    TrendingUp,
    TrendingDown,
    Minus,
    Settings,
    Play,
    Pause,
    RotateCcw,
    Loader2,
    MessageCircle
} from 'lucide-react';
import { LifeSystem, SystemAttribute, SystemType } from '@/core/schemas/core.schema';
import {
    SystemModel,
    StabilityResult,
    AttributeEffect,
    StabilityRule,
    computeStability
} from '@/core/schemas/stability.schema';
import { useStabilityStore } from '@/core/stores';
import { useCognitiveStore } from '@/core/stores';
import { SystemMindChat } from './SystemMindChat';
import { cn } from '@/lib/utils';

// ============================================
// SYSTEM EDITOR PANEL
// ============================================

interface SystemEditorProps {
    systemId: SystemType;
    isOpen: boolean;
    onClose: () => void;
}

export function SystemEditor({ systemId, isOpen, onClose }: SystemEditorProps) {
    const { models, initializeModels, computeSystemStability, updateEffect, toggleRule } = useStabilityStore();
    const { systems, updateSystemAttribute, updateSystemStability } = useCognitiveStore();

    // Get LIVE system from store (not stale prop)
    const system = systems.find(s => s.id === systemId);

    const [expandedSection, setExpandedSection] = useState<'attributes' | 'effects' | 'rules' | null>('attributes');
    const [isComputing, setIsComputing] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Initialize models if needed
    useEffect(() => {
        if (Object.keys(models).length === 0) {
            initializeModels();
        }
    }, [models, initializeModels]);

    const model = models[systemId];

    // Compute stability whenever attributes change
    const stabilityResult = useMemo(() => {
        if (!model || !system) return { score: 50, breakdown: [], triggeredRules: [], alerts: [] };
        return computeStability(system.attributes, model);
    }, [system?.attributes, model]);

    // Track last synced score to prevent infinite loops
    const lastSyncedScore = useRef<number | null>(null);

    // Update system stability when computed - but only if score actually changed
    useEffect(() => {
        if (!system) return;

        const roundedScore = Math.round(stabilityResult.score);

        // Skip if score hasn't changed (prevents infinite loop)
        if (lastSyncedScore.current === roundedScore) {
            if (isComputing) setIsComputing(false);
            return;
        }

        lastSyncedScore.current = roundedScore;

        const state = stabilityResult.score >= 80 ? 'stable'
            : stabilityResult.score >= 60 ? 'balanced'
                : stabilityResult.score >= 40 ? 'flux'
                    : stabilityResult.score >= 20 ? 'unstable'
                        : 'critical';
        updateSystemStability(systemId, roundedScore, state);

        // Clear computing state after update
        if (isComputing) {
            const timer = setTimeout(() => setIsComputing(false), 300);
            return () => clearTimeout(timer);
        }
    }, [stabilityResult.score, systemId, updateSystemStability, isComputing, system]);

    const handleAttributeChange = (attrId: string, value: number) => {
        setIsComputing(true);
        updateSystemAttribute(systemId, attrId, value);
    };

    if (!isOpen || !system) return null;

    return (
        <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            className="fixed right-0 top-0 bottom-0 w-96 bg-[var(--citadel-surface)] border-l border-[var(--citadel-border)] shadow-2xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--citadel-border)]">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{system.icon}</span>
                    <div>
                        <h2 className="font-semibold text-[var(--text-primary)]">{system.name}</h2>
                        <p className="text-xs text-[var(--text-muted)]">{system.description}</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[var(--citadel-elevated)] transition-colors"
                >
                    <X className="w-5 h-5 text-[var(--text-muted)]" />
                </button>
            </div>

            {/* Stability Score */}
            <div className="p-4 border-b border-[var(--citadel-border)]">
                <StabilityGauge score={stabilityResult.score} model={model} isComputing={isComputing} />
            </div>

            {/* Alerts */}
            {stabilityResult.alerts.length > 0 && (
                <div className="p-4 border-b border-[var(--citadel-border)] space-y-2">
                    {stabilityResult.alerts.map((alert, i) => (
                        <AlertBadge key={i} message={alert.message} severity={alert.severity} />
                    ))}
                </div>
            )}

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
                {/* Attributes Section */}
                <CollapsibleSection
                    title="Attributes"
                    icon="📊"
                    isExpanded={expandedSection === 'attributes'}
                    onToggle={() => setExpandedSection(expandedSection === 'attributes' ? null : 'attributes')}
                >
                    <div className="space-y-4">
                        {system.attributes.map(attr => (
                            <AttributeSlider
                                key={attr.id}
                                attribute={attr}
                                onChange={(value) => handleAttributeChange(attr.id, value)}
                            />
                        ))}
                    </div>
                </CollapsibleSection>

                {/* Effects Breakdown Section */}
                <CollapsibleSection
                    title="Effects Breakdown"
                    icon="⚡"
                    isExpanded={expandedSection === 'effects'}
                    onToggle={() => setExpandedSection(expandedSection === 'effects' ? null : 'effects')}
                >
                    <div className="space-y-3">
                        {stabilityResult.breakdown.map(effect => (
                            <EffectRow key={effect.effectId} effect={effect} />
                        ))}
                        {stabilityResult.breakdown.length === 0 && (
                            <p className="text-sm text-[var(--text-muted)]">No effects computed yet</p>
                        )}
                    </div>
                </CollapsibleSection>

                {/* Rules Section */}
                <CollapsibleSection
                    title="Active Rules"
                    icon="📜"
                    isExpanded={expandedSection === 'rules'}
                    onToggle={() => setExpandedSection(expandedSection === 'rules' ? null : 'rules')}
                >
                    <div className="space-y-3">
                        {model?.rules.map(rule => (
                            <RuleRow
                                key={rule.id}
                                rule={rule}
                                isTriggered={stabilityResult.triggeredRules.some(r => r.ruleId === rule.id)}
                                onToggle={() => toggleRule(system.id, rule.id)}
                            />
                        ))}
                        {(!model?.rules || model.rules.length === 0) && (
                            <p className="text-sm text-[var(--text-muted)]">No rules configured</p>
                        )}
                    </div>
                </CollapsibleSection>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--citadel-border)] space-y-2">
                <button
                    onClick={() => setIsChatOpen(true)}
                    className="w-full px-3 py-2.5 text-sm bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] text-[var(--text-primary)] rounded-lg hover:border-[var(--citadel-primary)] transition-colors flex items-center justify-center gap-2"
                >
                    <MessageCircle className="w-4 h-4" />
                    Chat with {system.name} Mind
                </button>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            // Reset attributes to defaults
                            system.attributes.forEach(attr => {
                                handleAttributeChange(attr.id, 50);
                            });
                        }}
                        className="flex-1 px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--citadel-elevated)] rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    <button
                        onClick={onClose}
                        className="flex-1 px-3 py-2 text-sm bg-[var(--citadel-primary)] text-white rounded-lg hover:bg-[var(--citadel-primary-glow)] transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>

            {/* System Mind Chat */}
            <AnimatePresence>
                <SystemMindChat
                    systemId={systemId}
                    systemName={system.name}
                    systemIcon={system.icon}
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                />
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================
// STABILITY GAUGE
// ============================================

interface StabilityGaugeProps {
    score: number;
    model?: SystemModel;
    isComputing?: boolean;
}

function StabilityGauge({ score, model, isComputing = false }: StabilityGaugeProps) {
    const getColor = (s: number) => {
        if (s >= 80) return 'var(--truth-green)';
        if (s >= 60) return 'var(--truth-amber)';
        if (s >= 40) return 'var(--citadel-primary)';
        return 'var(--truth-red)';
    };

    const getLabel = (s: number) => {
        if (s >= 80) return 'Stable';
        if (s >= 60) return 'Balanced';
        if (s >= 40) return 'In Flux';
        if (s >= 20) return 'Unstable';
        return 'Critical';
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-secondary)]">System Stability</span>
                    {isComputing && (
                        <Loader2 className="w-4 h-4 animate-spin text-[var(--citadel-primary)]" />
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <motion.span
                        className="text-2xl font-bold"
                        style={{ color: getColor(score) }}
                        animate={{ opacity: isComputing ? 0.5 : 1 }}
                    >
                        {Math.round(score)}
                    </motion.span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        backgroundColor: `color-mix(in srgb, ${getColor(score)} 20%, transparent)`,
                        color: getColor(score)
                    }}>
                        {getLabel(score)}
                    </span>
                </div>
            </div>

            <div className="h-3 bg-[var(--citadel-border)] rounded-full overflow-hidden relative">
                {/* Base marker */}
                {model && (
                    <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white/30"
                        style={{ left: `${model.baseStability}%` }}
                    />
                )}
                {/* Score bar */}
                <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ type: 'spring', stiffness: 100 }}
                    style={{ backgroundColor: getColor(score) }}
                />
            </div>

            <div className="flex justify-between text-xs text-[var(--text-muted)]">
                <span>0</span>
                <span>Base: {model?.baseStability || 50}</span>
                <span>100</span>
            </div>
        </div>
    );
}

// ============================================
// ALERT BADGE
// ============================================

interface AlertBadgeProps {
    message: string;
    severity: 'info' | 'warning' | 'critical';
}

function AlertBadge({ message, severity }: AlertBadgeProps) {
    const config = {
        info: { icon: Info, bg: 'var(--mind-aqua-surface)', text: 'var(--mind-aqua-deep)' },
        warning: { icon: AlertTriangle, bg: 'var(--truth-amber)', text: '#000' },
        critical: { icon: AlertCircle, bg: 'var(--truth-red)', text: '#fff' }
    };

    const { icon: Icon, bg, text } = config[severity];

    return (
        <div
            className="flex items-start gap-2 p-3 rounded-lg text-sm"
            style={{ backgroundColor: `color-mix(in srgb, ${bg} 20%, transparent)` }}
        >
            <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: bg }} />
            <span style={{ color: text === '#000' || text === '#fff' ? 'var(--text-primary)' : text }}>
                {message}
            </span>
        </div>
    );
}

// ============================================
// COLLAPSIBLE SECTION
// ============================================

interface CollapsibleSectionProps {
    title: string;
    icon: string;
    isExpanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}

function CollapsibleSection({ title, icon, isExpanded, onToggle, children }: CollapsibleSectionProps) {
    return (
        <div className="border-b border-[var(--citadel-border)]">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-[var(--citadel-elevated)]/50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <span>{icon}</span>
                    <span className="font-medium text-[var(--text-primary)]">{title}</span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                )}
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-4 pt-0">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// ATTRIBUTE SLIDER
// ============================================

interface AttributeSliderProps {
    attribute: SystemAttribute;
    onChange: (value: number) => void;
}

function AttributeSlider({ attribute, onChange }: AttributeSliderProps) {
    const [localValue, setLocalValue] = useState(attribute.value);

    useEffect(() => {
        setLocalValue(attribute.value);
    }, [attribute.value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = Number(e.target.value);
        setLocalValue(value);
    };

    const handleCommit = () => {
        onChange(localValue);
    };

    const TrendIcon = attribute.trend === 'up' ? TrendingUp
        : attribute.trend === 'down' ? TrendingDown
            : Minus;

    const trendColor = attribute.trend === 'up' ? 'var(--truth-green)'
        : attribute.trend === 'down' ? 'var(--truth-red)'
            : 'var(--text-muted)';

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-primary)]">{attribute.name}</span>
                    <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
                </div>
                <span className="text-sm font-mono text-[var(--text-muted)]">
                    {localValue}{attribute.unit || '%'}
                </span>
            </div>

            <input
                type="range"
                min="0"
                max="100"
                value={localValue}
                onChange={handleChange}
                onMouseUp={handleCommit}
                onTouchEnd={handleCommit}
                className="w-full h-2 bg-[var(--citadel-border)] rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[var(--citadel-primary)]
                    [&::-webkit-slider-thumb]:cursor-pointer
                    [&::-webkit-slider-thumb]:shadow-md"
            />
        </div>
    );
}

// ============================================
// EFFECT ROW
// ============================================

interface EffectRowProps {
    effect: {
        effectId: string;
        attributeId: string;
        attributeValue: number;
        contribution: number;
        description?: string;
    };
}

function EffectRow({ effect }: EffectRowProps) {
    const isPositive = effect.contribution >= 0;

    return (
        <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--citadel-elevated)]/50">
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-primary)]">
                        {effect.attributeId.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                        ({effect.attributeValue})
                    </span>
                </div>
                {effect.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{effect.description}</p>
                )}
            </div>
            <span
                className="text-sm font-mono px-2 py-0.5 rounded"
                style={{
                    color: isPositive ? 'var(--truth-green)' : 'var(--truth-red)',
                    backgroundColor: isPositive
                        ? 'rgba(34, 197, 94, 0.1)'
                        : 'rgba(239, 68, 68, 0.1)'
                }}
            >
                {isPositive ? '+' : ''}{effect.contribution.toFixed(1)}
            </span>
        </div>
    );
}

// ============================================
// RULE ROW
// ============================================

interface RuleRowProps {
    rule: StabilityRule;
    isTriggered: boolean;
    onToggle: () => void;
}

function RuleRow({ rule, isTriggered, onToggle }: RuleRowProps) {
    return (
        <div className={cn(
            "p-3 rounded-lg border transition-all",
            isTriggered
                ? "border-[var(--truth-amber)] bg-[var(--truth-amber)]/10"
                : rule.isActive
                    ? "border-[var(--citadel-border)] bg-[var(--citadel-elevated)]/50"
                    : "border-[var(--citadel-border)] bg-transparent opacity-50"
        )}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                            {rule.name}
                        </span>
                        {isTriggered && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--truth-amber)] text-black">
                                ACTIVE
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1 font-mono">
                        {rule.condition}
                    </p>
                </div>
                <button
                    onClick={onToggle}
                    className="p-1.5 rounded-md hover:bg-[var(--citadel-elevated)] transition-colors"
                >
                    {rule.isActive ? (
                        <Pause className="w-4 h-4 text-[var(--text-muted)]" />
                    ) : (
                        <Play className="w-4 h-4 text-[var(--text-muted)]" />
                    )}
                </button>
            </div>
        </div>
    );
}

export default SystemEditor;
