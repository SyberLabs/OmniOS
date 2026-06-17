// ============================================
// GRAPH POOL EDITOR
// Visual editor for System Shell Graph Pools
// ============================================

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Plus, Minus, Link2, Unlink, Settings, Layers,
    Circle, ArrowRight, Sliders, Eye, EyeOff,
    ChevronRight, ChevronDown, Trash2, Edit3
} from 'lucide-react';
import { useGraphPoolStore } from '@/core/stores/graphPool.store';
import { SystemType } from '@/core/schemas/core.schema';
import { Graph, GraphNode, GraphEdge, CrossEdge, PoolVariable } from '@/core/schemas/graphPool.schema';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface GraphPoolEditorProps {
    systemId: SystemType;
    onClose: () => void;
}

type EditorTab = 'graphs' | 'variables' | 'cross-edges';

// ============================================
// SUB-COMPONENTS
// ============================================

const NodeCard: React.FC<{
    node: GraphNode;
    isSelected: boolean;
    onClick: () => void;
    onEdit: () => void;
}> = ({ node, isSelected, onClick, onEdit }) => {
    const getNodeColor = (type: string) => {
        switch (type) {
            case 'metric': return 'bg-blue-500/20 border-blue-500/50';
            case 'computed': return 'bg-purple-500/20 border-purple-500/50';
            case 'tracker': return 'bg-green-500/20 border-green-500/50';
            case 'entity': return 'bg-amber-500/20 border-amber-500/50';
            case 'goal': return 'bg-rose-500/20 border-rose-500/50';
            default: return 'bg-gray-500/20 border-gray-500/50';
        }
    };

    return (
        <motion.div
            className={cn(
                'p-3 rounded-lg border cursor-pointer transition-all',
                getNodeColor(node.type),
                isSelected && 'ring-2 ring-white/50'
            )}
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{node.icon || '◉'}</span>
                    <div>
                        <div className="text-sm font-medium">{node.label}</div>
                        <div className="text-xs text-white/50">{node.type}</div>
                    </div>
                </div>
                {node.value !== undefined && (
                    <div className="text-right">
                        <div className="text-lg font-bold">{node.value}</div>
                        {node.unit && <div className="text-xs text-white/50">{node.unit}</div>}
                    </div>
                )}
            </div>
            {node.target && (
                <div className="mt-2">
                    <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-white/60 rounded-full transition-all"
                            style={{ width: `${Math.min(100, ((node.value || 0) / node.target) * 100)}%` }}
                        />
                    </div>
                    <div className="text-xs text-white/40 mt-1">Target: {node.target}{node.unit}</div>
                </div>
            )}
        </motion.div>
    );
};

const EdgeRow: React.FC<{
    edge: GraphEdge | CrossEdge;
    sourceLabel: string;
    targetLabel: string;
    onWeightChange: (weight: number) => void;
    onDelete: () => void;
}> = ({ edge, sourceLabel, targetLabel, onWeightChange, onDelete }) => {
    const relationColor = edge.relation === 'decreases' ? 'text-red-400' : 'text-green-400';

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex-1 flex items-center gap-2 text-sm">
                <span className="text-white/70">{sourceLabel}</span>
                <ArrowRight className={cn('w-4 h-4', relationColor)} />
                <span className="text-white/70">{targetLabel}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={cn('text-xs', relationColor)}>{edge.relation}</span>
                <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.05"
                    value={edge.weight}
                    onChange={(e) => onWeightChange(parseFloat(e.target.value))}
                    className="w-20 h-1 accent-purple-500"
                />
                <span className="text-xs text-white/50 w-12 text-right">
                    {edge.weight.toFixed(2)}
                </span>
                <button
                    onClick={onDelete}
                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                >
                    <Trash2 className="w-3 h-3 text-red-400/70" />
                </button>
            </div>
        </div>
    );
};

const VariableSlider: React.FC<{
    variable: PoolVariable;
    onValueChange: (value: number) => void;
}> = ({ variable, onValueChange }) => {
    return (
        <div className="p-3 rounded-lg bg-white/5">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{variable.name}</span>
                <span className="text-sm text-purple-400 font-mono">
                    {variable.value.toFixed(2)}
                </span>
            </div>
            <input
                type="range"
                min={variable.min ?? 0}
                max={variable.max ?? 1}
                step={variable.step ?? 0.05}
                value={variable.value}
                onChange={(e) => onValueChange(parseFloat(e.target.value))}
                className="w-full h-2 accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
                <span>{variable.min ?? 0}</span>
                <span>{variable.max ?? 1}</span>
            </div>
            {variable.description && (
                <p className="text-xs text-white/40 mt-2">{variable.description}</p>
            )}
        </div>
    );
};

const GraphCard: React.FC<{
    graph: Graph;
    isSelected: boolean;
    isExpanded: boolean;
    onSelect: () => void;
    onToggleExpand: () => void;
    systemId: SystemType;
}> = ({ graph, isSelected, isExpanded, onSelect, onToggleExpand, systemId }) => {
    const { selectNode, selectedNodeId, updateEdge, removeEdge } = useGraphPoolStore();

    const handleEdgeWeightChange = useCallback((edgeId: string, weight: number) => {
        updateEdge(systemId, graph.id, edgeId, { weight });
    }, [systemId, graph.id, updateEdge]);

    const handleRemoveEdge = useCallback((edgeId: string) => {
        removeEdge(systemId, graph.id, edgeId);
    }, [systemId, graph.id, removeEdge]);

    return (
        <div className={cn(
            'rounded-xl border transition-all overflow-hidden',
            isSelected ? 'border-purple-500/50 bg-purple-500/10' : 'border-white/10 bg-white/5'
        )}>
            {/* Graph Header */}
            <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={onSelect}
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{graph.icon}</span>
                    <div>
                        <h3 className="font-semibold">{graph.name}</h3>
                        <p className="text-xs text-white/50">
                            {graph.nodes.length} nodes · {graph.edges.length} edges
                        </p>
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/10"
                    >
                        {/* Nodes */}
                        <div className="p-4">
                            <h4 className="text-xs font-medium text-white/50 uppercase mb-3">Nodes</h4>
                            <div className="grid grid-cols-2 gap-2">
                                {graph.nodes.map(node => (
                                    <NodeCard
                                        key={node.id}
                                        node={node}
                                        isSelected={selectedNodeId === node.id}
                                        onClick={() => selectNode(node.id)}
                                        onEdit={() => { }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Edges */}
                        {graph.edges.length > 0 && (
                            <div className="p-4 border-t border-white/10">
                                <h4 className="text-xs font-medium text-white/50 uppercase mb-3">Internal Edges</h4>
                                <div className="space-y-2">
                                    {graph.edges.map(edge => {
                                        const sourceNode = graph.nodes.find(n => n.id === edge.source);
                                        const targetNode = graph.nodes.find(n => n.id === edge.target);
                                        return (
                                            <EdgeRow
                                                key={edge.id}
                                                edge={edge}
                                                sourceLabel={sourceNode?.label || edge.source}
                                                targetLabel={targetNode?.label || edge.target}
                                                onWeightChange={(w) => handleEdgeWeightChange(edge.id, w)}
                                                onDelete={() => handleRemoveEdge(edge.id)}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Subscribed Blocks */}
                        {graph.subscribedBlockTypes.length > 0 && (
                            <div className="p-4 border-t border-white/10">
                                <h4 className="text-xs font-medium text-white/50 uppercase mb-2">Subscribed Blocks</h4>
                                <div className="flex flex-wrap gap-1">
                                    {graph.subscribedBlockTypes.map(blockType => (
                                        <span
                                            key={blockType}
                                            className="px-2 py-1 text-xs bg-blue-500/20 text-blue-300 rounded"
                                        >
                                            {blockType.split('.').pop()}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const GraphPoolEditor: React.FC<GraphPoolEditorProps> = ({ systemId, onClose }) => {
    const [activeTab, setActiveTab] = useState<EditorTab>('graphs');
    const [expandedGraphs, setExpandedGraphs] = useState<Set<string>>(new Set());

    const {
        pools,
        selectedGraphId,
        selectGraph,
        setVariable,
        updateCrossEdge,
        removeCrossEdge,
        propagateChanges
    } = useGraphPoolStore();

    const pool = pools[systemId];

    const toggleGraphExpanded = useCallback((graphId: string) => {
        setExpandedGraphs(prev => {
            const next = new Set(prev);
            if (next.has(graphId)) {
                next.delete(graphId);
            } else {
                next.add(graphId);
            }
            return next;
        });
    }, []);

    const handleVariableChange = useCallback((variableId: string, value: number) => {
        setVariable(systemId, variableId, value);
    }, [systemId, setVariable]);

    const handleCrossEdgeWeight = useCallback((edgeId: string, weight: number) => {
        updateCrossEdge(systemId, edgeId, { weight });
        propagateChanges(systemId);
    }, [systemId, updateCrossEdge, propagateChanges]);

    const handleRemoveCrossEdge = useCallback((edgeId: string) => {
        removeCrossEdge(systemId, edgeId);
    }, [systemId, removeCrossEdge]);

    // Get node labels for cross-edges
    const getNodeLabel = useCallback((graphId: string, nodeId: string) => {
        const graph = pool?.graphs.find(g => g.id === graphId);
        const node = graph?.nodes.find(n => n.id === nodeId);
        return node?.label || nodeId;
    }, [pool]);

    if (!pool) {
        return (
            <div className="flex items-center justify-center h-full text-white/50">
                No graph pool found for {systemId}
            </div>
        );
    }

    return (
        <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="w-full max-w-4xl max-h-[85vh] bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden flex flex-col"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-purple-400" />
                        <div>
                            <h2 className="text-lg font-semibold">{pool.name}</h2>
                            <p className="text-xs text-white/50">
                                {pool.graphs.length} graphs · {pool.crossEdges.length} cross-edges · {pool.variables.length} variables
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 py-2 border-b border-white/10 flex gap-4">
                    {(['graphs', 'cross-edges', 'variables'] as EditorTab[]).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                'px-3 py-2 text-sm rounded-lg transition-colors',
                                activeTab === tab
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'text-white/50 hover:text-white/80'
                            )}
                        >
                            {tab === 'graphs' && <Layers className="w-4 h-4 inline mr-2" />}
                            {tab === 'cross-edges' && <Link2 className="w-4 h-4 inline mr-2" />}
                            {tab === 'variables' && <Sliders className="w-4 h-4 inline mr-2" />}
                            {tab.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Graphs Tab */}
                    {activeTab === 'graphs' && (
                        <div className="space-y-4">
                            {pool.graphs.map(graph => (
                                <GraphCard
                                    key={graph.id}
                                    graph={graph}
                                    isSelected={selectedGraphId === graph.id}
                                    isExpanded={expandedGraphs.has(graph.id)}
                                    onSelect={() => selectGraph(graph.id)}
                                    onToggleExpand={() => toggleGraphExpanded(graph.id)}
                                    systemId={systemId}
                                />
                            ))}
                        </div>
                    )}

                    {/* Cross-Edges Tab */}
                    {activeTab === 'cross-edges' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-white/70">
                                    Cross-Graph Connections
                                </h3>
                                <button className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-1">
                                    <Plus className="w-3 h-3" />
                                    Add Connection
                                </button>
                            </div>

                            {pool.crossEdges.length === 0 ? (
                                <div className="text-center text-white/40 py-8">
                                    No cross-graph connections defined
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {pool.crossEdges.map(edge => (
                                        <div
                                            key={edge.id}
                                            className="p-3 rounded-lg bg-white/5 border border-white/10"
                                        >
                                            <div className="flex items-center gap-2 text-sm mb-2">
                                                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                                                    {edge.sourceGraphId.split('.').pop()}
                                                </span>
                                                <span className="text-white/70">{getNodeLabel(edge.sourceGraphId, edge.sourceNodeId)}</span>
                                                <ArrowRight className={cn(
                                                    'w-4 h-4',
                                                    edge.relation === 'decreases' ? 'text-red-400' : 'text-green-400'
                                                )} />
                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                                                    {edge.targetGraphId.split('.').pop()}
                                                </span>
                                                <span className="text-white/70">{getNodeLabel(edge.targetGraphId, edge.targetNodeId)}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-white/40">{edge.relation}</span>
                                                <input
                                                    type="range"
                                                    min="-1"
                                                    max="1"
                                                    step="0.05"
                                                    value={edge.weight}
                                                    onChange={(e) => handleCrossEdgeWeight(edge.id, parseFloat(e.target.value))}
                                                    className="flex-1 h-1 accent-purple-500"
                                                />
                                                <span className="text-xs text-white/50 w-12 text-right font-mono">
                                                    {edge.weight.toFixed(2)}
                                                </span>
                                                <button
                                                    onClick={() => handleRemoveCrossEdge(edge.id)}
                                                    className="p-1 hover:bg-red-500/20 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3 text-red-400/70" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Variables Tab */}
                    {activeTab === 'variables' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-white/70">
                                    Pool Variables (Weight Controls)
                                </h3>
                                <button className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors flex items-center gap-1">
                                    <Plus className="w-3 h-3" />
                                    Add Variable
                                </button>
                            </div>

                            {pool.variables.length === 0 ? (
                                <div className="text-center text-white/40 py-8">
                                    No variables defined
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    {pool.variables.filter(v => v.isUserEditable).map(variable => (
                                        <VariableSlider
                                            key={variable.id}
                                            variable={variable}
                                            onValueChange={(v) => handleVariableChange(variable.id, v)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
                    <div className="text-xs text-white/40">
                        Last updated: {new Date(pool.updatedAt).toLocaleString()}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => propagateChanges(systemId)}
                            className="px-4 py-2 text-sm bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                        >
                            Recalculate
                        </button>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GraphPoolEditor;
