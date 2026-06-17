'use client';

// ============================================
// DOMAIN NAVIGATOR COMPONENT
// Hierarchical navigation for system domains
// ============================================

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronRight,
    ChevronLeft,
    Home,
    Layers,
    Plus
} from 'lucide-react';
import { useDomainStore } from '@/core/stores/domain.store';
import { SystemType } from '@/core/schemas/core.schema';
import { SystemDomain } from '@/core/schemas/domain.schema';
import { cn } from '@/lib/utils';
import { DomainCard } from './DomainCard';
import { MaslowPyramid } from './MaslowPyramid';

// ============================================
// PROPS INTERFACE
// ============================================

interface DomainNavigatorProps {
    systemId: SystemType;
    systemName: string;
    systemIcon: string;
    onBlockAdd?: (blockType: string) => void;
}

// ============================================
// DOMAIN NAVIGATOR COMPONENT
// ============================================

export function DomainNavigator({
    systemId,
    systemName,
    systemIcon,
    onBlockAdd
}: DomainNavigatorProps) {
    const {
        domains,
        frameworks,
        selectedDomainId,
        breadcrumb,
        navigateToDomain,
        navigateUp,
        navigateToRoot,
        getPrimaryDomains,
        getChildDomains,
        initializeHealthDomains,
        initializeRelationshipsDomains,
        initializeCareerDomains,
        initializeFinanceDomains
    } = useDomainStore();

    // Initialize domains on mount
    useEffect(() => {
        if (systemId === 'health' && Object.keys(domains).filter(id => id.startsWith('health')).length === 0) {
            initializeHealthDomains();
        } else if (systemId === 'relationships' && Object.keys(domains).filter(id => id.startsWith('relationships')).length === 0) {
            initializeRelationshipsDomains();
        } else if (systemId === 'career' && Object.keys(domains).filter(id => id.startsWith('career')).length === 0) {
            initializeCareerDomains();
        } else if (systemId === 'finance' && Object.keys(domains).filter(id => id.startsWith('finance')).length === 0) {
            initializeFinanceDomains();
        }
    }, [systemId, domains, initializeHealthDomains, initializeRelationshipsDomains, initializeCareerDomains, initializeFinanceDomains]);

    // Get current view domains
    const currentDomains = selectedDomainId
        ? getChildDomains(selectedDomainId)
        : getPrimaryDomains(systemId);

    const selectedDomain = selectedDomainId ? domains[selectedDomainId] : null;
    const activeFramework = frameworks['maslow_pyramid'];

    // Handle domain click
    const handleDomainClick = (domain: SystemDomain) => {
        if (domain.childDomainIds.length > 0) {
            navigateToDomain(domain.id);
        } else {
            // Leaf domain - could open detail view or block palette
            navigateToDomain(domain.id);
        }
    };

    return (
        <div className="domain-navigator">
            {/* Header with Breadcrumb */}
            <div className="domain-nav-header">
                <div className="domain-breadcrumb">
                    <button
                        className="domain-breadcrumb-item domain-breadcrumb-root"
                        onClick={navigateToRoot}
                    >
                        <span className="text-lg">{systemIcon}</span>
                        <span>{systemName}</span>
                    </button>

                    {breadcrumb.map((domainId, index) => {
                        const domain = domains[domainId];
                        if (!domain) return null;

                        const isLast = index === breadcrumb.length - 1;

                        return (
                            <div key={domainId} className="domain-breadcrumb-segment">
                                <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                                <button
                                    className={cn(
                                        "domain-breadcrumb-item",
                                        isLast && "domain-breadcrumb-current"
                                    )}
                                    onClick={() => !isLast && navigateToDomain(domainId)}
                                    disabled={isLast}
                                >
                                    <span>{domain.icon}</span>
                                    <span>{domain.name}</span>
                                </button>
                            </div>
                        );
                    })}
                </div>

                {breadcrumb.length > 0 && (
                    <button
                        className="domain-nav-back"
                        onClick={navigateUp}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Back</span>
                    </button>
                )}
            </div>

            {/* Main Content Area */}
            <div className="domain-nav-content">
                {/* Maslow's Pyramid (when at root) */}
                {!selectedDomainId && activeFramework?.isActive && systemId === 'health' && (
                    <MaslowPyramid framework={activeFramework} />
                )}

                {/* Domain Grid */}
                <div className="domain-grid">
                    <AnimatePresence mode="wait">
                        {currentDomains.map((domain, index) => (
                            <motion.div
                                key={domain.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{
                                    duration: 0.2,
                                    delay: index * 0.03,
                                    ease: [0.25, 0.1, 0.25, 1]
                                }}
                                layout
                            >
                                <DomainCard
                                    domain={domain}
                                    onClick={() => handleDomainClick(domain)}
                                    onBlockAdd={onBlockAdd}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Selected Domain Detail */}
                {selectedDomain && selectedDomain.childDomainIds.length === 0 && (
                    <div className="domain-detail">
                        <div className="domain-detail-header">
                            <span className="text-2xl">{selectedDomain.icon}</span>
                            <div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                                    {selectedDomain.name}
                                </h3>
                                <p className="text-sm text-[var(--text-muted)]">
                                    {selectedDomain.description}
                                </p>
                            </div>
                        </div>

                        {/* Trackers */}
                        {selectedDomain.trackers.length > 0 && (
                            <div className="domain-trackers">
                                <h4 className="domain-section-title">
                                    <Layers className="w-4 h-4" />
                                    Trackers
                                </h4>
                                <div className="tracker-grid">
                                    {selectedDomain.trackers.map((tracker) => (
                                        <div key={tracker.id} className="tracker-card">
                                            <div className="tracker-header">
                                                <span className="text-lg">{tracker.icon}</span>
                                                <span className="tracker-name">{tracker.name}</span>
                                            </div>
                                            <div className="tracker-value">
                                                <span className="tracker-current">
                                                    {tracker.currentValue}
                                                </span>
                                                {tracker.target && (
                                                    <span className="tracker-target">
                                                        / {tracker.target} {tracker.unit}
                                                    </span>
                                                )}
                                            </div>
                                            {tracker.target && (
                                                <div className="tracker-progress">
                                                    <div
                                                        className="tracker-progress-fill"
                                                        style={{
                                                            width: `${Math.min(100, (tracker.currentValue / tracker.target) * 100)}%`,
                                                            backgroundColor: tracker.color
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Available Blocks */}
                        {selectedDomain.availableBlockTypes.length > 0 && (
                            <div className="domain-blocks">
                                <h4 className="domain-section-title">
                                    <Plus className="w-4 h-4" />
                                    Add Blocks
                                </h4>
                                <div className="block-type-grid">
                                    {selectedDomain.availableBlockTypes.map((blockType) => (
                                        <button
                                            key={blockType}
                                            className="block-type-btn"
                                            onClick={() => onBlockAdd?.(blockType)}
                                        >
                                            <Plus className="w-4 h-4" />
                                            <span>{blockType.split('.').pop()?.replace(/_/g, ' ')}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {currentDomains.length === 0 && !selectedDomain && (
                    <div className="domain-empty">
                        <Layers className="w-12 h-12 opacity-30" />
                        <p>No domains configured for {systemName}</p>
                        <p className="text-xs opacity-60">
                            Domain structure coming soon
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DomainNavigator;
