'use client';

// ============================================
// DOMAIN CARD COMPONENT
// Visual card for each domain in the hierarchy
// ============================================

import { motion } from 'framer-motion';
import { ChevronRight, Plus } from 'lucide-react';
import { SystemDomain } from '@/core/schemas/domain.schema';
import { cn } from '@/lib/utils';

// ============================================
// PROPS INTERFACE
// ============================================

interface DomainCardProps {
    domain: SystemDomain;
    onClick: () => void;
    onBlockAdd?: (blockType: string) => void;
    compact?: boolean;
}

// ============================================
// DOMAIN CARD COMPONENT
// ============================================

export function DomainCard({
    domain,
    onClick,
    onBlockAdd,
    compact = false
}: DomainCardProps) {
    const hasChildren = domain.childDomainIds.length > 0;
    const hasTrackers = domain.trackers.length > 0;

    // Calculate aggregate score from trackers
    const trackerScore = hasTrackers
        ? domain.trackers.reduce((acc, t) => {
            if (t.target) {
                return acc + (t.currentValue / t.target) * 100;
            }
            return acc + t.currentValue;
        }, 0) / domain.trackers.length
        : null;

    // Get primary metric to display
    const primaryMetric = domain.metrics[0];

    return (
        <div
            className={cn(
                "domain-card",
                compact && "domain-card-compact",
                hasChildren && "domain-card-expandable"
            )}
            onClick={onClick}
            style={{
                '--domain-color': domain.color || 'var(--citadel-primary)'
            } as React.CSSProperties}
        >
            {/* Top glow accent */}
            <div className="domain-card-glow" />

            {/* Icon */}
            <div className="domain-card-icon">
                <span className="text-2xl">{domain.icon}</span>
            </div>

            {/* Info */}
            <div className="domain-card-info">
                <h4 className="domain-card-name">{domain.name}</h4>
                {!compact && (
                    <p className="domain-card-desc">{domain.description}</p>
                )}
            </div>

            {/* Metrics / Score */}
            {(primaryMetric || trackerScore !== null) && (
                <div className="domain-card-metric">
                    {primaryMetric ? (
                        <>
                            <span className="metric-value">{primaryMetric.value}</span>
                            <span className="metric-label">{primaryMetric.name}</span>
                            <div className={cn(
                                "metric-trend",
                                primaryMetric.trend === 'up' && "trend-up",
                                primaryMetric.trend === 'down' && "trend-down"
                            )}>
                                {primaryMetric.trend === 'up' ? '↑' : primaryMetric.trend === 'down' ? '↓' : '→'}
                            </div>
                        </>
                    ) : trackerScore !== null ? (
                        <>
                            <span className="metric-value">{Math.round(trackerScore)}%</span>
                            <span className="metric-label">Progress</span>
                        </>
                    ) : null}
                </div>
            )}

            {/* Tracker previews */}
            {hasTrackers && !compact && (
                <div className="domain-card-trackers">
                    {domain.trackers.slice(0, 3).map((tracker) => (
                        <div
                            key={tracker.id}
                            className="tracker-dot"
                            style={{ backgroundColor: tracker.color }}
                            title={`${tracker.name}: ${tracker.currentValue}${tracker.unit || ''}`}
                        />
                    ))}
                    {domain.trackers.length > 3 && (
                        <span className="tracker-more">+{domain.trackers.length - 3}</span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="domain-card-footer">
                {hasChildren ? (
                    <div className="domain-children-count">
                        <span>{domain.childDomainIds.length} sub-domains</span>
                        <ChevronRight className="w-4 h-4" />
                    </div>
                ) : domain.availableBlockTypes.length > 0 ? (
                    <button
                        className="domain-add-block"
                        onClick={(e) => {
                            e.stopPropagation();
                            onBlockAdd?.(domain.availableBlockTypes[0]);
                        }}
                    >
                        <Plus className="w-3 h-3" />
                        <span>Add Block</span>
                    </button>
                ) : null}
            </div>

            {/* Maslow level indicator */}
            {domain.maslowLevel && (
                <div className="domain-maslow-badge">
                    {domain.maslowLevel.replace('_', ' ')}
                </div>
            )}
        </div>
    );
}

export default DomainCard;
