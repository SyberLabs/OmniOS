// ============================================
// DOMAIN STORE
// State management for hierarchical system domains
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    SystemDomain,
    FrameworkOverlay,
    DomainTracker,
    TrackerEntry,
    DEFAULT_HEALTH_DOMAINS,
    DEFAULT_RELATIONSHIPS_DOMAINS,
    DEFAULT_CAREER_DOMAINS,
    DEFAULT_FINANCE_DOMAINS,
    MASLOW_PYRAMID
} from '../schemas/domain.schema';
import { SystemType, SystemAttribute } from '../schemas/core.schema';
import { aggregateTrackersToAttributes, toSystemAttributes, TRACKER_GRAPH_MAP } from '../services/trackerBridge.service';
import { useStabilityStore } from './stabilityStore';
import { useGraphPoolStore } from './graphPool.store';

// ============================================
// STORE STATE INTERFACE
// ============================================

interface DomainState {
    /** All domains indexed by ID */
    domains: Record<string, SystemDomain>;

    /** All frameworks indexed by ID */
    frameworks: Record<string, FrameworkOverlay>;

    /** Currently selected domain ID */
    selectedDomainId: string | null;

    /** Navigation breadcrumb (domain IDs from root to current) */
    breadcrumb: string[];

    /** Whether the domain view is in expanded mode */
    isExpanded: boolean;
}

interface DomainActions {
    // Domain navigation
    selectDomain: (domainId: string | null) => void;
    navigateToDomain: (domainId: string) => void;
    navigateUp: () => void;
    navigateToRoot: () => void;
    toggleDomainExpanded: (domainId: string) => void;

    // Domain CRUD
    addDomain: (domain: SystemDomain) => void;
    updateDomain: (domainId: string, updates: Partial<SystemDomain>) => void;
    removeDomain: (domainId: string) => void;

    // Tracker management
    updateTracker: (domainId: string, trackerId: string, value: number, note?: string) => void;
    addTrackerEntry: (domainId: string, trackerId: string, entry: TrackerEntry) => void;

    // Framework management
    setFrameworkActive: (frameworkId: string, isActive: boolean) => void;
    updateFrameworkLevel: (frameworkId: string, levelId: string, fulfillment: number) => void;

    // Queries
    getDomainsBySystem: (systemId: SystemType) => SystemDomain[];
    getPrimaryDomains: (systemId: SystemType) => SystemDomain[];
    getChildDomains: (parentDomainId: string) => SystemDomain[];
    getActiveFramework: (systemId: SystemType) => FrameworkOverlay | null;
    getAllTrackers: (systemId?: SystemType) => DomainTracker[];

    // Stability Integration
    syncTrackersToStability: (systemId: SystemType) => void;

    // Initialization
    initializeHealthDomains: () => void;
    initializeRelationshipsDomains: () => void;
    initializeCareerDomains: () => void;
    initializeFinanceDomains: () => void;
    reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: DomainState = {
    domains: {},
    frameworks: {},
    selectedDomainId: null,
    breadcrumb: [],
    isExpanded: false
};

// ============================================
// ZUSTAND STORE
// ============================================

export const useDomainStore = create<DomainState & DomainActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ========================================
            // DOMAIN NAVIGATION
            // ========================================

            selectDomain: (domainId) => {
                set({ selectedDomainId: domainId });
            },

            navigateToDomain: (domainId) => {
                const { domains, breadcrumb } = get();
                const domain = domains[domainId];
                if (!domain) return;

                // Build breadcrumb path
                const newBreadcrumb: string[] = [];
                let current: SystemDomain | undefined = domain;

                while (current) {
                    newBreadcrumb.unshift(current.id);
                    current = current.parentDomainId ? domains[current.parentDomainId] : undefined;
                }

                set({
                    selectedDomainId: domainId,
                    breadcrumb: newBreadcrumb
                });
            },

            navigateUp: () => {
                const { breadcrumb, domains } = get();
                if (breadcrumb.length <= 1) {
                    set({ selectedDomainId: null, breadcrumb: [] });
                    return;
                }

                const parentId = breadcrumb[breadcrumb.length - 2];
                set({
                    selectedDomainId: parentId,
                    breadcrumb: breadcrumb.slice(0, -1)
                });
            },

            navigateToRoot: () => {
                set({ selectedDomainId: null, breadcrumb: [] });
            },

            toggleDomainExpanded: (domainId) => {
                const { domains } = get();
                const domain = domains[domainId];
                if (!domain) return;

                set({
                    domains: {
                        ...domains,
                        [domainId]: { ...domain, isExpanded: !domain.isExpanded }
                    }
                });
            },

            // ========================================
            // DOMAIN CRUD
            // ========================================

            addDomain: (domain) => {
                set((state) => ({
                    domains: { ...state.domains, [domain.id]: domain }
                }));
            },

            updateDomain: (domainId, updates) => {
                const { domains } = get();
                const domain = domains[domainId];
                if (!domain) return;

                set({
                    domains: {
                        ...domains,
                        [domainId]: { ...domain, ...updates, updatedAt: Date.now() }
                    }
                });
            },

            removeDomain: (domainId) => {
                const { domains } = get();
                const { [domainId]: removed, ...rest } = domains;
                set({ domains: rest });
            },

            // ========================================
            // TRACKER MANAGEMENT
            // ========================================

            updateTracker: (domainId, trackerId, value, note) => {
                const { domains } = get();
                const domain = domains[domainId];
                if (!domain) return;

                const updatedTrackers = domain.trackers.map((tracker) => {
                    if (tracker.id !== trackerId) return tracker;

                    const entry: TrackerEntry = {
                        id: `entry_${Date.now()}`,
                        timestamp: Date.now(),
                        value,
                        note,
                        source: tracker.source
                    };

                    return {
                        ...tracker,
                        currentValue: value,
                        lastUpdated: Date.now(),
                        history: [entry, ...tracker.history].slice(0, tracker.historyLimit)
                    };
                });
                set({
                    domains: {
                        ...domains,
                        [domainId]: { ...domain, trackers: updatedTrackers, updatedAt: Date.now() }
                    }
                });

                // --- INTEGRATION: Sync to Graph Pool ---
                const systemId = domain.systemId;
                const graphPoolStore = useGraphPoolStore.getState();
                const mappings = TRACKER_GRAPH_MAP.filter(m => m.trackerId === trackerId && m.systemId === systemId);
                
                for (const mapping of mappings) {
                    graphPoolStore.updateNodeValue(systemId, mapping.graphId, mapping.nodeId, value);
                }

                // --- INTEGRATION: Auto-sync to Stability ---
                get().syncTrackersToStability(systemId);
            },

            addTrackerEntry: (domainId, trackerId, entry) => {
                const { domains } = get();
                const domain = domains[domainId];
                if (!domain) return;

                const updatedTrackers = domain.trackers.map((tracker) => {
                    if (tracker.id !== trackerId) return tracker;
                    return {
                        ...tracker,
                        currentValue: entry.value,
                        lastUpdated: Date.now(),
                        history: [entry, ...tracker.history].slice(0, tracker.historyLimit)
                    };
                });
                set({
                    domains: {
                        ...domains,
                        [domainId]: { ...domain, trackers: updatedTrackers, updatedAt: Date.now() }
                    }
                });

                // --- INTEGRATION: Sync to Graph Pool ---
                const systemId = domain.systemId;
                const graphPoolStore = useGraphPoolStore.getState();
                const mappings = TRACKER_GRAPH_MAP.filter(m => m.trackerId === trackerId && m.systemId === systemId);
                
                for (const mapping of mappings) {
                    graphPoolStore.updateNodeValue(systemId, mapping.graphId, mapping.nodeId, entry.value);
                }

                // --- INTEGRATION: Auto-sync to Stability ---
                get().syncTrackersToStability(systemId);
            },

            // ========================================
            // FRAMEWORK MANAGEMENT
            // ========================================

            setFrameworkActive: (frameworkId, isActive) => {
                const { frameworks } = get();
                const framework = frameworks[frameworkId];
                if (!framework) return;

                set({
                    frameworks: {
                        ...frameworks,
                        [frameworkId]: { ...framework, isActive }
                    }
                });
            },

            updateFrameworkLevel: (frameworkId, levelId, fulfillment) => {
                const { frameworks } = get();
                const framework = frameworks[frameworkId];
                if (!framework) return;

                const updatedLevels = framework.levels.map((level) =>
                    level.id === levelId ? { ...level, fulfillment } : level
                );

                set({
                    frameworks: {
                        ...frameworks,
                        [frameworkId]: { ...framework, levels: updatedLevels }
                    }
                });
            },

            // ========================================
            // QUERIES
            // ========================================

            getDomainsBySystem: (systemId) => {
                const { domains } = get();
                return Object.values(domains).filter((d) => d.systemId === systemId);
            },

            getPrimaryDomains: (systemId) => {
                const { domains } = get();
                return Object.values(domains).filter(
                    (d) => d.systemId === systemId && d.level === 'primary'
                );
            },

            getChildDomains: (parentDomainId) => {
                const { domains } = get();
                return Object.values(domains).filter((d) => d.parentDomainId === parentDomainId);
            },

            getActiveFramework: (systemId) => {
                const { frameworks, domains } = get();
                // Find framework linked to this system's domains
                const systemDomains = Object.values(domains).filter((d) => d.systemId === systemId);
                for (const domain of systemDomains) {
                    // Check if any framework is active
                    for (const fw of Object.values(frameworks)) {
                        if (fw.isActive) return fw;
                    }
                }
                return null;
            },

            getAllTrackers: (systemId) => {
                const { domains } = get();
                const trackers: DomainTracker[] = [];

                for (const domain of Object.values(domains)) {
                    if (systemId && domain.systemId !== systemId) continue;
                    trackers.push(...domain.trackers);
                }

                return trackers;
            },

            // ========================================
            // STABILITY INTEGRATION
            // ========================================

            syncTrackersToStability: (systemId) => {
                const trackers = get().getAllTrackers(systemId);

                if (trackers.length === 0) return;

                // Aggregate trackers to attributes
                const aggregated = aggregateTrackersToAttributes(trackers, systemId);
                const attributes = toSystemAttributes(aggregated);

                if (attributes.length === 0) return;

                // Compute stability using the stability store
                const stabilityStore = useStabilityStore.getState();
                const result = stabilityStore.computeSystemStability(systemId, attributes);

                console.log(`[TrackerBridge] ${systemId} stability computed:`, result.score);
                console.log(`[TrackerBridge] Breakdown:`, aggregated.map(a => ({
                    attr: a.attributeId,
                    value: a.value,
                    sources: a.contributors.map(c => c.trackerName)
                })));
            },

            // ========================================
            // INITIALIZATION
            // ========================================

            initializeHealthDomains: () => {
                const now = Date.now();
                const domainsRecord: Record<string, SystemDomain> = {};

                // Add all default health domains
                for (const domain of DEFAULT_HEALTH_DOMAINS) {
                    domainsRecord[domain.id] = {
                        ...domain,
                        createdAt: now,
                        updatedAt: now
                    };
                }

                set({
                    domains: { ...get().domains, ...domainsRecord },
                    frameworks: {
                        ...get().frameworks,
                        [MASLOW_PYRAMID.id]: MASLOW_PYRAMID
                    }
                });
            },

            initializeRelationshipsDomains: () => {
                const now = Date.now();
                const domainsRecord: Record<string, SystemDomain> = {};

                // Add all default relationships domains
                for (const domain of DEFAULT_RELATIONSHIPS_DOMAINS) {
                    domainsRecord[domain.id] = {
                        ...domain,
                        createdAt: now,
                        updatedAt: now
                    };
                }

                set({
                    domains: { ...get().domains, ...domainsRecord }
                });
            },

            initializeCareerDomains: () => {
                const now = Date.now();
                const domainsRecord: Record<string, SystemDomain> = {};

                // Add all default career domains
                for (const domain of DEFAULT_CAREER_DOMAINS) {
                    domainsRecord[domain.id] = {
                        ...domain,
                        createdAt: now,
                        updatedAt: now
                    };
                }

                set({
                    domains: { ...get().domains, ...domainsRecord }
                });
            },

            initializeFinanceDomains: () => {
                const now = Date.now();
                const domainsRecord: Record<string, SystemDomain> = {};

                // Add all default finance domains
                for (const domain of DEFAULT_FINANCE_DOMAINS) {
                    domainsRecord[domain.id] = {
                        ...domain,
                        createdAt: now,
                        updatedAt: now
                    };
                }

                set({
                    domains: { ...get().domains, ...domainsRecord }
                });
            },

            reset: () => {
                set(initialState);
            }
        }),
        {
            name: 'omni-domain-store',
            version: 1
        }
    )
);

export default useDomainStore;
