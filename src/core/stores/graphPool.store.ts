// ============================================
// PROJECT OMNI: GRAPH POOL STORE
// State management for Graph Pools
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    GraphPool,
    Graph,
    GraphNode,
    GraphEdge,
    CrossEdge,
    PoolVariable,
    DEFAULT_GRAPH_POOLS
} from '../schemas/graphPool.schema';
import { SystemType, SystemAttribute } from '../schemas/core.schema';
import { useStabilityStore } from './stabilityStore';
import { useDomainStore } from './domain.store';

// ============================================
// STORE STATE INTERFACE
// ============================================

interface GraphPoolState {
    /** All graph pools indexed by system ID */
    pools: Record<SystemType, GraphPool>;

    /** Currently selected pool */
    selectedPoolId: SystemType | null;

    /** Currently selected graph within pool */
    selectedGraphId: string | null;

    /** Currently selected node */
    selectedNodeId: string | null;

    /** Edit mode */
    editMode: 'view' | 'nodes' | 'edges' | 'variables';
}

interface GraphPoolActions {
    // Pool Management
    initializePools: () => void;
    getPool: (systemId: SystemType) => GraphPool | undefined;
    selectPool: (systemId: SystemType | null) => void;

    // Graph Management
    selectGraph: (graphId: string | null) => void;
    addGraph: (systemId: SystemType, graph: Graph) => void;
    updateGraph: (systemId: SystemType, graphId: string, updates: Partial<Graph>) => void;
    removeGraph: (systemId: SystemType, graphId: string) => void;

    // Node Management
    selectNode: (nodeId: string | null) => void;
    addNode: (systemId: SystemType, graphId: string, node: GraphNode) => void;
    updateNode: (systemId: SystemType, graphId: string, nodeId: string, updates: Partial<GraphNode>) => void;
    updateNodeValue: (systemId: SystemType, graphId: string, nodeId: string, value: number) => void;
    removeNode: (systemId: SystemType, graphId: string, nodeId: string) => void;

    // Edge Management
    addEdge: (systemId: SystemType, graphId: string, edge: GraphEdge) => void;
    updateEdge: (systemId: SystemType, graphId: string, edgeId: string, updates: Partial<GraphEdge>) => void;
    removeEdge: (systemId: SystemType, graphId: string, edgeId: string) => void;

    // Cross-Edge Management
    addCrossEdge: (systemId: SystemType, crossEdge: CrossEdge) => void;
    updateCrossEdge: (systemId: SystemType, crossEdgeId: string, updates: Partial<CrossEdge>) => void;
    removeCrossEdge: (systemId: SystemType, crossEdgeId: string) => void;

    // Variable Management
    getVariable: (systemId: SystemType, variableId: string) => PoolVariable | undefined;
    setVariable: (systemId: SystemType, variableId: string, value: number) => void;
    addVariable: (systemId: SystemType, variable: PoolVariable) => void;
    removeVariable: (systemId: SystemType, variableId: string) => void;

    // Computation
    computeNodeValue: (systemId: SystemType, graphId: string, nodeId: string) => number;
    propagateChanges: (systemId: SystemType) => void;

    // Queries
    getNodesConnectedTo: (systemId: SystemType, nodeId: string) => { node: GraphNode; edge: GraphEdge | CrossEdge }[];
    getBlockSubscribedGraphs: (systemId: SystemType, blockType: string) => Graph[];

    // Edit Mode
    setEditMode: (mode: 'view' | 'nodes' | 'edges' | 'variables') => void;

    // computation
    syncToExternal: (systemId: SystemType) => void;

    // Utilities
    reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: GraphPoolState = {
    pools: {} as Record<SystemType, GraphPool>,
    selectedPoolId: null,
    selectedGraphId: null,
    selectedNodeId: null,
    editMode: 'view'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function findGraph(pool: GraphPool, graphId: string): Graph | undefined {
    return pool.graphs.find(g => g.id === graphId);
}

function findNode(graph: Graph, nodeId: string): GraphNode | undefined {
    return graph.nodes.find(n => n.id === nodeId);
}

function findEdge(graph: Graph, edgeId: string): GraphEdge | undefined {
    return graph.edges.find(e => e.id === edgeId);
}

// ============================================
// ZUSTAND STORE
// ============================================

export const useGraphPoolStore = create<GraphPoolState & GraphPoolActions>()(
    persist(
        (set, get) => ({
            ...initialState,

            // ========================================
            // POOL MANAGEMENT
            // ========================================

            initializePools: () => {
                const { pools } = get();
                if (Object.keys(pools).length > 0) return;

                set({ pools: { ...DEFAULT_GRAPH_POOLS } });
            },

            getPool: (systemId) => {
                return get().pools[systemId];
            },

            selectPool: (systemId) => {
                set({ selectedPoolId: systemId, selectedGraphId: null, selectedNodeId: null });
            },

            // ========================================
            // GRAPH MANAGEMENT
            // ========================================

            selectGraph: (graphId) => {
                set({ selectedGraphId: graphId, selectedNodeId: null });
            },

            addGraph: (systemId, graph) => {
                set(state => ({
                    pools: {
                        ...state.pools,
                        [systemId]: {
                            ...state.pools[systemId],
                            graphs: [...state.pools[systemId].graphs, graph],
                            updatedAt: Date.now()
                        }
                    }
                }));
            },

            updateGraph: (systemId, graphId, updates) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.map(g =>
                                    g.id === graphId ? { ...g, ...updates, updatedAt: Date.now() } : g
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            removeGraph: (systemId, graphId) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.filter(g => g.id !== graphId),
                                // Also remove any cross-edges pointing to/from this graph
                                crossEdges: pool.crossEdges.filter(e =>
                                    e.sourceGraphId !== graphId && e.targetGraphId !== graphId
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            // ========================================
            // NODE MANAGEMENT
            // ========================================

            selectNode: (nodeId) => {
                set({ selectedNodeId: nodeId });
            },

            addNode: (systemId, graphId, node) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.map(g =>
                                    g.id === graphId
                                        ? { ...g, nodes: [...g.nodes, node], updatedAt: Date.now() }
                                        : g
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            updateNode: (systemId, graphId, nodeId, updates) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.map(g =>
                                    g.id === graphId
                                        ? {
                                            ...g,
                                            nodes: g.nodes.map(n =>
                                                n.id === nodeId
                                                    ? { ...n, ...updates, lastUpdated: Date.now() }
                                                    : n
                                            ),
                                            updatedAt: Date.now()
                                        }
                                        : g
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            updateNodeValue: (systemId, graphId, nodeId, value) => {
                get().updateNode(systemId, graphId, nodeId, { value });
                // Trigger propagation after value update
                get().propagateChanges(systemId);
            },

            removeNode: (systemId, graphId, nodeId) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.map(g =>
                                    g.id === graphId
                                        ? {
                                            ...g,
                                            nodes: g.nodes.filter(n => n.id !== nodeId),
                                            // Also remove edges connected to this node
                                            edges: g.edges.filter(e =>
                                                e.source !== nodeId && e.target !== nodeId
                                            ),
                                            updatedAt: Date.now()
                                        }
                                        : g
                                ),
                                // Remove cross-edges to/from this node
                                crossEdges: pool.crossEdges.filter(e =>
                                    e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            // ========================================
            // EDGE MANAGEMENT
            // ========================================

            addEdge: (systemId, graphId, edge) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.map(g =>
                                    g.id === graphId
                                        ? { ...g, edges: [...g.edges, edge], updatedAt: Date.now() }
                                        : g
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            updateEdge: (systemId, graphId, edgeId, updates) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.map(g =>
                                    g.id === graphId
                                        ? {
                                            ...g,
                                            edges: g.edges.map(e =>
                                                e.id === edgeId ? { ...e, ...updates } : e
                                            ),
                                            updatedAt: Date.now()
                                        }
                                        : g
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            removeEdge: (systemId, graphId, edgeId) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                graphs: pool.graphs.map(g =>
                                    g.id === graphId
                                        ? {
                                            ...g,
                                            edges: g.edges.filter(e => e.id !== edgeId),
                                            updatedAt: Date.now()
                                        }
                                        : g
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            // ========================================
            // CROSS-EDGE MANAGEMENT
            // ========================================

            addCrossEdge: (systemId, crossEdge) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                crossEdges: [...pool.crossEdges, crossEdge],
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            updateCrossEdge: (systemId, crossEdgeId, updates) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                crossEdges: pool.crossEdges.map(e =>
                                    e.id === crossEdgeId ? { ...e, ...updates } : e
                                ),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            removeCrossEdge: (systemId, crossEdgeId) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                crossEdges: pool.crossEdges.filter(e => e.id !== crossEdgeId),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            // ========================================
            // VARIABLE MANAGEMENT
            // ========================================

            getVariable: (systemId, variableId) => {
                const pool = get().pools[systemId];
                if (!pool) return undefined;
                return pool.variables.find(v => v.id === variableId);
            },

            setVariable: (systemId, variableId, value) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    const variable = pool.variables.find(v => v.id === variableId);
                    if (!variable) return state;

                    // Clamp value to min/max
                    const clampedValue = Math.max(
                        variable.min ?? -Infinity,
                        Math.min(variable.max ?? Infinity, value)
                    );

                    const updatedVariables = pool.variables.map(v =>
                        v.id === variableId ? { ...v, value: clampedValue } : v
                    );

                    // Apply binding
                    let updatedPool = { ...pool, variables: updatedVariables, updatedAt: Date.now() };

                    if (variable.bindingType === 'edge_weight') {
                        // Update the bound edge's weight
                        updatedPool = {
                            ...updatedPool,
                            crossEdges: updatedPool.crossEdges.map(e =>
                                e.id === variable.targetId ? { ...e, weight: clampedValue } : e
                            ),
                            graphs: updatedPool.graphs.map(g => ({
                                ...g,
                                edges: g.edges.map(e =>
                                    e.id === variable.targetId ? { ...e, weight: clampedValue } : e
                                )
                            }))
                        };
                    } else if (variable.bindingType === 'node_property' && variable.targetGraphId) {
                        // Update the bound node's property
                        updatedPool = {
                            ...updatedPool,
                            graphs: updatedPool.graphs.map(g =>
                                g.id === variable.targetGraphId
                                    ? {
                                        ...g,
                                        nodes: g.nodes.map(n =>
                                            n.id === variable.targetId
                                                ? { ...n, [variable.targetProperty || 'target']: clampedValue }
                                                : n
                                        )
                                    }
                                    : g
                            )
                        };
                    }

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: updatedPool
                        }
                    };
                });

                // Propagate changes after variable update
                get().propagateChanges(systemId);
            },

            addVariable: (systemId, variable) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                variables: [...pool.variables, variable],
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            removeVariable: (systemId, variableId) => {
                set(state => {
                    const pool = state.pools[systemId];
                    if (!pool) return state;

                    return {
                        pools: {
                            ...state.pools,
                            [systemId]: {
                                ...pool,
                                variables: pool.variables.filter(v => v.id !== variableId),
                                updatedAt: Date.now()
                            }
                        }
                    };
                });
            },

            // ========================================
            // COMPUTATION
            // ========================================

            computeNodeValue: (systemId, graphId, nodeId) => {
                const pool = get().pools[systemId];
                if (!pool) return 0;

                const graph = findGraph(pool, graphId);
                if (!graph) return 0;

                const node = findNode(graph, nodeId);
                if (!node || node.type !== 'computed') return node?.value ?? 0;

                // Find all edges pointing TO this node
                const incomingEdges = graph.edges.filter(e => e.target === nodeId);
                const incomingCrossEdges = pool.crossEdges.filter(
                    e => e.targetGraphId === graphId && e.targetNodeId === nodeId
                );

                let totalWeight = 0;
                let weightedSum = 0;

                // Sum contributions from internal edges
                for (const edge of incomingEdges) {
                    const sourceNode = findNode(graph, edge.source);
                    if (sourceNode && sourceNode.value !== undefined) {
                        const contribution = edge.relation === 'decreases'
                            ? -sourceNode.value * Math.abs(edge.weight)
                            : sourceNode.value * edge.weight;
                        weightedSum += contribution;
                        totalWeight += Math.abs(edge.weight);
                    }
                }

                // Sum contributions from cross edges
                for (const crossEdge of incomingCrossEdges) {
                    // Find source pool (might be another system)
                    const sourcePool = crossEdge.sourceSystemId 
                        ? get().pools[crossEdge.sourceSystemId]
                        : pool;
                    
                    if (sourcePool) {
                        const sourceGraph = findGraph(sourcePool, crossEdge.sourceGraphId);
                        if (sourceGraph) {
                            const sourceNode = findNode(sourceGraph, crossEdge.sourceNodeId);
                            if (sourceNode && sourceNode.value !== undefined) {
                                const contribution = crossEdge.relation === 'decreases'
                                    ? -sourceNode.value * Math.abs(crossEdge.weight)
                                    : sourceNode.value * crossEdge.weight;
                                weightedSum += contribution;
                                totalWeight += Math.abs(crossEdge.weight);
                            }
                        }
                    }
                }

                // Normalize to 0-100 range
                const result = totalWeight > 0
                    ? Math.max(0, Math.min(100, 50 + weightedSum / totalWeight))
                    : 50;

                return Math.round(result);
            },

            propagateChanges: (systemId) => {
                const pool = get().pools[systemId];
                if (!pool) return;

                // Recompute all computed nodes
                // (Simple implementation - a proper one would use topological sort)
                for (const graph of pool.graphs) {
                    for (const node of graph.nodes) {
                        if (node.type === 'computed') {
                            const newValue = get().computeNodeValue(systemId, graph.id, node.id);
                            if (newValue !== node.value) {
                                get().updateNode(systemId, graph.id, node.id, { value: newValue });
                            }
                        }
                    }
                }

                console.log(`[GraphPool] Propagated changes for ${systemId}`);

                // Sync to stability and domain stores
                get().syncToExternal(systemId);
            },

            syncToExternal: (systemId) => {
                if (systemId !== 'health') return;
                
                const pool = get().pools[systemId];
                if (!pool) return;
                
                const coreGraph = pool.graphs.find(g => g.id === 'health.core');
                if (!coreGraph) return;
                
                const energyNode = coreGraph.nodes.find(n => n.id === 'energy');
                const vitalityNode = coreGraph.nodes.find(n => n.id === 'vitality');
                const stabilityNode = coreGraph.nodes.find(n => n.id === 'health_stability');
                
                // 1. Sync to Stability Store
                const stabilityStore = useStabilityStore.getState();
                const attributes: SystemAttribute[] = [];
                
                if (energyNode) {
                    attributes.push({ 
                        id: 'energy', 
                        name: 'Energy', 
                        value: energyNode.value ?? 0, 
                        trend: 'stable', 
                        lastUpdated: Date.now() 
                    });
                }
                
                if (vitalityNode) {
                    attributes.push({ 
                        id: 'vitality', 
                        name: 'Vitality', 
                        value: vitalityNode.value ?? 0, 
                        trend: 'stable', 
                        lastUpdated: Date.now() 
                    });
                }
                
                if (attributes.length > 0) {
                    stabilityStore.computeSystemStability(systemId, attributes);
                }
                
                // 2. Sync to Domain Store (Maslow)
                const domainStore = useDomainStore.getState();
                const healthFramework = domainStore.getActiveFramework('health');
                
                if (healthFramework && stabilityNode) {
                    // Map Core stability to Physiological/Safety fulfillment
                    // Physiological is first, so we use stability node + some energy bonus
                    const physiValue = Math.min(100, Math.round((stabilityNode.value || 0) * 0.8 + (energyNode?.value || 0) * 0.2));
                    domainStore.updateFrameworkLevel(healthFramework.id, 'physiological', physiValue);
                    
                    // Safety is second, correlates highly with structural stability
                    domainStore.updateFrameworkLevel(healthFramework.id, 'safety', stabilityNode.value || 0);
                }
            },

            // ========================================
            // QUERIES
            // ========================================

            getNodesConnectedTo: (systemId, nodeId) => {
                const pool = get().pools[systemId];
                if (!pool) return [];

                const results: { node: GraphNode; edge: GraphEdge | CrossEdge }[] = [];

                // Find in internal edges
                for (const graph of pool.graphs) {
                    const node = findNode(graph, nodeId);
                    if (!node) continue;

                    for (const edge of graph.edges) {
                        if (edge.source === nodeId) {
                            const targetNode = findNode(graph, edge.target);
                            if (targetNode) results.push({ node: targetNode, edge });
                        } else if (edge.target === nodeId) {
                            const sourceNode = findNode(graph, edge.source);
                            if (sourceNode) results.push({ node: sourceNode, edge });
                        }
                    }
                }

                // Find in cross edges
                for (const crossEdge of pool.crossEdges) {
                    if (crossEdge.sourceNodeId === nodeId) {
                        const targetGraph = findGraph(pool, crossEdge.targetGraphId);
                        if (targetGraph) {
                            const targetNode = findNode(targetGraph, crossEdge.targetNodeId);
                            if (targetNode) results.push({ node: targetNode, edge: crossEdge });
                        }
                    } else if (crossEdge.targetNodeId === nodeId) {
                        const sourceGraph = findGraph(pool, crossEdge.sourceGraphId);
                        if (sourceGraph) {
                            const sourceNode = findNode(sourceGraph, crossEdge.sourceNodeId);
                            if (sourceNode) results.push({ node: sourceNode, edge: crossEdge });
                        }
                    }
                }

                return results;
            },

            getBlockSubscribedGraphs: (systemId, blockType) => {
                const pool = get().pools[systemId];
                if (!pool) return [];

                return pool.graphs.filter(g =>
                    g.subscribedBlockTypes.includes(blockType)
                );
            },

            // ========================================
            // EDIT MODE
            // ========================================

            setEditMode: (mode) => {
                set({ editMode: mode });
            },

            // ========================================
            // UTILITIES
            // ========================================

            reset: () => {
                set(initialState);
            }
        }),
        {
            name: 'omni-graph-pools',
            storage: createJSONStorage(() => localStorage),
            version: 1,
            partialize: (state) => ({
                pools: state.pools
            })
        }
    )
);

export default useGraphPoolStore;
