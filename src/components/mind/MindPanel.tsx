'use client';

// ============================================
// PROJECT OMNI: MIND PANEL
// Unified Mind Interface - Shell | Systems | Projects
// ============================================

import { useState, useCallback, useEffect } from 'react';
import { useMindStore, useCognitiveStore, useBlockStore } from '@/core/stores';
import { blockRegistry } from '@/core/registry/BlockRegistry';
import { getMindEngine } from '@/core/services';
import { LLMProvider, LLM_DEFAULTS, PersonaConfig, ContextPool, ContextEntry } from '@/core/schemas/mind.schema';
import { SystemType, Project } from '@/core/schemas/core.schema';
import { SystemMindChat } from '@/components/SystemMindChat';
import { CoreMindChat } from '@/components/CoreMindChat';
import { MemoryConfirmModal } from './MemoryConfirmModal';
import { ThinkResultModal } from './ThinkResultModal';
import { ContextCaptureModal } from './ContextCaptureModal';
import { DomainNavigator } from '@/components/domains/DomainNavigator';
import { GraphPoolEditor } from '@/components/graph/GraphPoolEditor';
import { useGraphPoolStore } from '@/core/stores/graphPool.store';
import './MindPanel.css';
import '@/components/domains/Domain.css';

// ============================================
// SYSTEM ICONS HELPER
// ============================================

const SYSTEM_ICONS: Record<SystemType, string> = {
    health: '🏥',
    career: '💼',
    finance: '💰',
    mind: '🧠',
    relationships: '💞',
    environment: '🏠',
    time: '⏳'
};

interface MindPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MindPanel({ isOpen, onClose }: MindPanelProps) {
    // Mind Type state (Shell, Systems, Projects)
    const [mindType, setMindType] = useState<'shell' | 'systems' | 'projects'>('shell');

    // Shell-specific state
    const [activeTab, setActiveTab] = useState<'personas' | 'context' | 'graph' | 'settings'>('personas');
    const [thinkResult, setThinkResult] = useState<string | null>(null);
    const [isThinking, setIsThinking] = useState(false);

    // Tool state
    const [activeTool, setActiveTool] = useState<'cursor' | 'highlighter'>('cursor');
    const [selectionModalOpen, setSelectionModalOpen] = useState(false);
    const [selectedText, setSelectedText] = useState('');

    // System/Project chat state
    const [selectedSystemId, setSelectedSystemId] = useState<SystemType | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Domain view state
    const [showDomainView, setShowDomainView] = useState(false);

    // Graph Pool Editor state
    const [showGraphPoolEditor, setShowGraphPoolEditor] = useState(false);

    const {
        status,
        llmConfig,
        personas,
        activePersonaId,
        contextPools,
        graph,
        setActivePersona,
        setProvider,
        clearPool,
        clearEphemeralContext
    } = useMindStore();

    const { systems, projects, initializeSystems } = useCognitiveStore();
    const { addBlock } = useBlockStore();
    const { initializePools } = useGraphPoolStore();

    // Ensure systems and graph pools are initialized
    useEffect(() => {
        if (systems.length === 0) {
            initializeSystems();
        }
        initializePools();
    }, [systems.length, initializeSystems, initializePools]);

    const activePersona = personas.find(p => p.id === activePersonaId);

    // Handle adding a block from domain navigation
    const handleBlockAdd = useCallback((blockType: string) => {
        const schema = blockRegistry.get(blockType);
        if (schema) {
            // Add block to canvas with random offset for visual stacking
            const offset = Math.random() * 50;
            addBlock(schema, { x: 350 + offset, y: 120 + offset });
            console.log(`Added block: ${schema.display_name}`);
        } else {
            console.warn(`Block schema not found for: ${blockType}`);
        }
    }, [addBlock]);

    // Trigger Shell Mind to think
    const handleThink = useCallback(async () => {
        if (isThinking) return;

        setIsThinking(true);
        setThinkResult(null);

        try {
            const engine = getMindEngine();
            const result = await engine.think();

            if (result.success) {
                setThinkResult(result.response || 'Analysis complete.');
            } else {
                setThinkResult(`Error: ${result.error}`);
            }
        } catch (error) {
            setThinkResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsThinking(false);
        }
    }, [isThinking]);

    // Highlighter Listener
    const handleMouseUp = () => {
        if (activeTool !== 'highlighter') return;

        const selection = window.getSelection();
        const text = selection?.toString().trim();

        if (text && text.length > 0) {
            setSelectedText(text);
            setSelectionModalOpen(true);
            // selection?.removeAllRanges(); // Optional: clear selection
        }
    };

    if (!isOpen) return null;

    return (
        <div className="mind-panel-overlay" onClick={onClose} onMouseUp={handleMouseUp}>
            <div className={`mind-panel ${activeTool === 'highlighter' ? 'cursor-text' : ''}`} onClick={e => e.stopPropagation()}>
                {/* Glossy highlight overlay */}
                <div className="mind-panel-highlight" />

                {/* Floating bubbles background */}
                <div className="mind-bubbles">
                    <div className="bubble bubble-1" />
                    <div className="bubble bubble-2" />
                    <div className="bubble bubble-3" />
                    <div className="bubble bubble-4" />
                    <div className="bubble bubble-5" />
                </div>

                {/* Header */}
                <header className="mind-panel-header">
                    <div className="mind-title">
                        <span className="mind-icon">🧠</span>
                        <div>
                            <h2>The Mind</h2>
                            <span className="mind-subtitle">Cognitive Substrate v2.0</span>
                        </div>
                    </div>

                    {/* Tool Strip */}
                    <div className="flex bg-black/20 rounded-lg p-1 gap-1 border border-white/5 mx-4">
                        <button
                            className={`p-1.5 rounded text-sm transition-colors ${activeTool === 'cursor' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white'}`}
                            onClick={() => setActiveTool('cursor')}
                            title="Cursor Mode"
                        >
                            🖱️
                        </button>
                        <button
                            className={`p-1.5 rounded text-sm transition-colors ${activeTool === 'highlighter' ? 'bg-[var(--cyan-glow)]/20 text-[var(--cyan-glow)]' : 'text-white/50 hover:text-white'}`}
                            onClick={() => setActiveTool('highlighter')}
                            title="Context Highlighter"
                        >
                            🖊️
                        </button>
                    </div>

                    <div className="mind-status">
                        <span className={`status-dot status-${status}`} />
                        <span className="status-text">{status}</span>
                    </div>
                    <button className="mind-close" onClick={onClose}>✕</button>
                </header>

                {/* Mind Type Selector */}
                <div className="mind-type-selector">
                    {[
                        { id: 'shell', icon: '🐚', label: 'Shell Mind' },
                        { id: 'systems', icon: '⚙️', label: 'System Minds' },
                        { id: 'projects', icon: '📁', label: 'Core Minds' }
                    ].map(type => (
                        <button
                            key={type.id}
                            className={`mind-type-btn ${mindType === type.id ? 'active' : ''}`}
                            onClick={() => setMindType(type.id as typeof mindType)}
                        >
                            <span className="type-icon">{type.icon}</span>
                            <span className="type-label">{type.label}</span>
                        </button>
                    ))}
                </div>

                {/* Shell Mind Content */}
                {mindType === 'shell' && (
                    <>
                        {/* Navigation Tabs */}
                        <nav className="mind-tabs">
                            {[
                                { id: 'personas', icon: '👤', label: 'Personas' },
                                { id: 'context', icon: '💭', label: 'Context' },
                                { id: 'graph', icon: '🔗', label: 'Graph' },
                                { id: 'settings', icon: '⚙️', label: 'Settings' }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    className={`mind-tab ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                                >
                                    <span className="tab-icon">{tab.icon}</span>
                                    <span className="tab-label">{tab.label}</span>
                                </button>
                            ))}
                        </nav>

                        {/* Content */}
                        <main className="mind-content">
                            {activeTab === 'personas' && (
                                <PersonasView
                                    personas={personas}
                                    activePersonaId={activePersonaId}
                                    onSelect={setActivePersona}
                                />
                            )}
                            {activeTab === 'context' && (
                                <ContextPoolsView
                                    pools={contextPools}
                                    onClear={clearPool}
                                    onClearAll={clearEphemeralContext}
                                />
                            )}
                            {activeTab === 'graph' && (
                                <GraphView graph={graph} />
                            )}
                            {activeTab === 'settings' && (
                                <SettingsView
                                    llmConfig={llmConfig}
                                    onProviderChange={setProvider}
                                />
                            )}
                        </main>

                        {/* Think Result Modal - appears as centered glassmorphic popup */}
                        <ThinkResultModal
                            isOpen={!!thinkResult}
                            onClose={() => setThinkResult(null)}
                            response={thinkResult || ''}
                            personaName={activePersona?.name || 'The Mind'}
                            personaEmoji={activePersona?.avatar || '🧠'}
                        />

                        {/* Footer with Think Button */}
                        <footer className="mind-footer">
                            {activePersona && (
                                <div className="active-persona-badge">
                                    <span className="persona-avatar">{activePersona.avatar}</span>
                                    <span className="persona-name">{activePersona.name}</span>
                                    <span className="persona-status">Active</span>
                                </div>
                            )}

                            <button
                                className={`think-button ${isThinking ? 'thinking' : ''}`}
                                onClick={handleThink}
                                disabled={isThinking}
                            >
                                {isThinking ? (
                                    <>
                                        <span className="think-spinner">⏳</span>
                                        <span>Thinking...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="think-icon">✨</span>
                                        <span>Think</span>
                                    </>
                                )}
                            </button>
                        </footer>
                    </>
                )}

                {/* System Minds Content */}
                {mindType === 'systems' && (
                    <main className="mind-content">
                        {/* System selector + Domain toggle */}
                        <div className="systems-header">
                            <div className="systems-mind-grid">
                                {systems.map(system => (
                                    <button
                                        key={system.id}
                                        className={`system-mind-card ${selectedSystemId === system.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setSelectedSystemId(system.id);
                                            // Show domains view for Health system
                                            if (system.id === 'health') {
                                                setShowDomainView(true);
                                            }
                                        }}
                                    >
                                        <span className="system-mind-icon">{system.icon}</span>
                                        <div className="system-mind-info">
                                            <span className="system-mind-name">{system.name}</span>
                                            <span className="system-mind-stability">
                                                {system.stabilityScore}% {system.stability}
                                            </span>
                                            <div className="system-mind-bar">
                                                <div
                                                    className="system-mind-fill"
                                                    style={{ width: `${system.stabilityScore}%` }}
                                                />
                                            </div>
                                        </div>
                                        {/* Show domains indicator for Health */}
                                        {system.domainIds && system.domainIds.length > 0 && (
                                            <div className="system-domains-badge">
                                                {system.domainIds.filter(id => !id.includes('.')).length ||
                                                    Math.floor(system.domainIds.length / 4)} domains
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Domain Navigator for selected system */}
                        {selectedSystemId && showDomainView && selectedSystemId === 'health' && (
                            <div className="system-domain-view" onClick={e => e.stopPropagation()}>
                                <div className="domain-view-header">
                                    <button
                                        className="domain-view-back"
                                        onClick={(e) => { e.stopPropagation(); setShowDomainView(false); }}
                                    >
                                        ← Back to Systems
                                    </button>
                                    <button
                                        className="domain-view-chat"
                                        onClick={(e) => { e.stopPropagation(); setShowDomainView(false); }}
                                    >
                                        💬 Open Chat
                                    </button>
                                    <button
                                        className="domain-view-graph-pool"
                                        onClick={(e) => { e.stopPropagation(); setShowGraphPoolEditor(true); }}
                                        title="Edit Graph Pool"
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            borderRadius: '0.5rem',
                                            color: 'rgba(139, 92, 246, 1)',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⚙️ Graph Pool
                                    </button>
                                </div>
                                <DomainNavigator
                                    systemId={selectedSystemId}
                                    systemName={systems.find(s => s.id === selectedSystemId)?.name || ''}
                                    systemIcon={systems.find(s => s.id === selectedSystemId)?.icon || ''}
                                    onBlockAdd={handleBlockAdd}
                                />

                                {/* Graph Pool Editor Modal */}
                                {showGraphPoolEditor && selectedSystemId && (
                                    <GraphPoolEditor
                                        systemId={selectedSystemId}
                                        onClose={() => setShowGraphPoolEditor(false)}
                                    />
                                )}
                            </div>
                        )}

                        {/* Hint when system selected but not in domain view */}
                        {selectedSystemId && !showDomainView && (
                            <div className="system-mind-hint">
                                <p>💡 Chat opens in floating panel</p>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    {selectedSystemId === 'health' && (
                                        <button
                                            className="domain-explore-btn"
                                            onClick={() => setShowDomainView(true)}
                                        >
                                            🔍 Explore Domains
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowGraphPoolEditor(true)}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            border: '1px solid rgba(139, 92, 246, 0.3)',
                                            borderRadius: '0.5rem',
                                            color: 'rgba(139, 92, 246, 1)',
                                            fontSize: '0.875rem',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        ⚙️ Edit Graph Pool
                                    </button>
                                </div>

                                {/* Graph Pool Editor Modal - accessible from any system */}
                                {showGraphPoolEditor && (
                                    <GraphPoolEditor
                                        systemId={selectedSystemId}
                                        onClose={() => setShowGraphPoolEditor(false)}
                                    />
                                )}
                            </div>
                        )}
                    </main>
                )}

                {/* Core Minds (Projects) Content */}
                {mindType === 'projects' && (
                    <main className="mind-content">
                        {projects.length === 0 ? (
                            <div className="no-projects">
                                <span className="no-projects-icon">📁</span>
                                <p>No projects yet</p>
                                <p className="no-projects-hint">Create a project in the Garden to get started</p>
                            </div>
                        ) : (
                            <div className="projects-mind-list">
                                {projects.map(project => (
                                    <button
                                        key={project.id}
                                        className={`project-mind-card ${selectedProject?.id === project.id ? 'active' : ''}`}
                                        onClick={() => setSelectedProject(project)}
                                    >
                                        <span className="project-mind-icon">{project.icon}</span>
                                        <div className="project-mind-info">
                                            <span className="project-mind-name">{project.name}</span>
                                            <span className="project-mind-state">{project.state}</span>
                                        </div>
                                        {project.linkedSystems.length > 0 && (
                                            <div className="project-linked-systems">
                                                {project.linkedSystems.slice(0, 3).map(sysId => (
                                                    <span key={sysId} className="linked-system-icon">
                                                        {SYSTEM_ICONS[sysId]}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </main>
                )}

                {/* Context Capture Modal */}
                <ContextCaptureModal
                    isOpen={selectionModalOpen}
                    onClose={() => setSelectionModalOpen(false)}
                    selectedText={selectedText}
                />
            </div>

            {/* System Mind Chat (floating) */}
            {selectedSystemId && (
                <SystemMindChat
                    systemId={selectedSystemId}
                    systemName={systems.find(s => s.id === selectedSystemId)?.name || ''}
                    systemIcon={systems.find(s => s.id === selectedSystemId)?.icon || ''}
                    isOpen={true}
                    onClose={() => setSelectedSystemId(null)}
                />
            )}

            {/* Core Mind Chat (floating) */}
            {selectedProject && (
                <CoreMindChat
                    project={selectedProject}
                    isOpen={true}
                    onClose={() => setSelectedProject(null)}
                />
            )}
        </div>
    );
}

// ============================================
// PERSONAS VIEW
// ============================================

interface PersonasViewProps {
    personas: PersonaConfig[];
    activePersonaId: string;
    onSelect: (id: string) => void;
}

function PersonasView({ personas, activePersonaId, onSelect }: PersonasViewProps) {
    return (
        <div className="personas-grid">
            {personas.map(persona => (
                <button
                    key={persona.id}
                    className={`persona-card ${persona.id === activePersonaId ? 'active' : ''}`}
                    onClick={() => onSelect(persona.id)}
                >
                    <div className="persona-card-highlight" />
                    <div className="persona-avatar-large">{persona.avatar}</div>
                    <h3 className="persona-name">{persona.name}</h3>
                    <p className="persona-description">{persona.description}</p>

                    {/* Trait bars */}
                    <div className="persona-traits">
                        {persona.traits.slice(0, 4).map(trait => (
                            <div key={trait.id} className="trait-row">
                                <span className="trait-name">{trait.name}</span>
                                <div className="trait-bar">
                                    <div
                                        className="trait-fill"
                                        style={{ width: `${trait.value * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    {persona.id === activePersonaId && (
                        <div className="persona-active-badge">✓ Active</div>
                    )}
                </button>
            ))}
        </div>
    );
}

// ============================================
// CONTEXT POOLS VIEW
// ============================================

interface ContextPoolsViewProps {
    pools: ContextPool[];
    onClear: (poolId: string) => void;
    onClearAll: () => void;
}

function ContextPoolsView({ pools, onClear, onClearAll }: ContextPoolsViewProps) {
    const [expandedPool, setExpandedPool] = useState<string | null>(null);
    const unpinBlock = useMindStore(state => state.unpinBlock);
    const clearFocus = useMindStore(state => state.clearFocus);
    const pushContext = useMindStore(state => state.pushContext);

    // Modal state for memory confirmation
    const [memoryModalOpen, setMemoryModalOpen] = useState(false);
    const [pendingSuggestion, setPendingSuggestion] = useState<ContextEntry | null>(null);
    const [isCrystallizing, setIsCrystallizing] = useState(false);

    const handleCrystallizeAndSave = async (entry: ContextEntry) => {
        setIsCrystallizing(true);
        try {
            const engine = getMindEngine();
            // Summarize the content to avoid "slop"
            const summary = await engine.summarizeContext(entry.content);

            setPendingSuggestion({
                ...entry,
                content: summary,
                metadata: { ...entry.metadata, source: 'manual_crystallization' }
            });
            setMemoryModalOpen(true);
        } catch (error) {
            console.error("Crystallization failed:", error);
            // Fallback to raw content if summarization fails
            setPendingSuggestion(entry);
            setMemoryModalOpen(true);
        } finally {
            setIsCrystallizing(false);
        }
    };

    const handleConfirmMemory = (content: string) => {
        pushContext('memory', {
            type: 'memory',
            content: content,
            importance: 1.0,
            metadata: { savedAt: Date.now(), source: pendingSuggestion?.metadata?.source || 'user_saved' }
        });
        setPendingSuggestion(null);
    };

    // Separate focus pool from others
    const focusPool = pools.find(p => p.id === 'focus');
    const otherPools = pools.filter(p => p.id !== 'focus');

    // Group observations by type
    const observationsPool = pools.find(p => p.id === 'observations');

    return (
        <div className="context-pools">
            {/* Header Actions */}
            <div className="flex justify-between items-center mb-4 px-2">
                <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider">Context Memory</h3>
                <button
                    onClick={onClearAll}
                    className="text-xs px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 transition-colors flex items-center gap-1"
                    title="Clear Observations, Predictions, Directives"
                >
                    <span>🗑️</span> Clear Context
                </button>
            </div>

            {/* Focused Blocks Section - Always visible at top */}
            {focusPool && (
                <div className="focus-section">
                    <div className="focus-header">
                        <span className="focus-icon">📍</span>
                        <span className="focus-title">Focused Blocks</span>
                        <span className="focus-count">{focusPool.entries.length}/5</span>
                        {focusPool.entries.length > 0 && (
                            <button
                                className="focus-clear-btn"
                                onClick={() => clearFocus()}
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    {focusPool.entries.length === 0 ? (
                        <div className="focus-empty">
                            <p>No blocks pinned</p>
                            <p className="focus-hint">Click 📌 on any block to focus it for deep analysis</p>
                        </div>
                    ) : (
                        <div className="focus-blocks">
                            {focusPool.entries.map(entry => (
                                <div key={entry.id} className="focus-block-item">
                                    <div className="focus-block-header">
                                        <span className="focus-block-type">
                                            {(entry.metadata?.blockType as string) || 'block'}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                className="focus-action-btn"
                                                onClick={() => handleCrystallizeAndSave(entry)}
                                                disabled={isCrystallizing}
                                                title="Crystallize to Memory"
                                            >
                                                {isCrystallizing ? '⏳' : '🧠'}
                                            </button>
                                            <button
                                                className="focus-unpin-btn"
                                                onClick={() => entry.sourceBlockId && unpinBlock(entry.sourceBlockId)}
                                                title="Unpin"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                    <p className="focus-block-content">
                                        {entry.content.slice(0, 200)}...
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Awareness Status */}
            {observationsPool && (
                <div className="awareness-section">
                    <div className="awareness-header">
                        <span className="awareness-icon">👁️</span>
                        <span className="awareness-title">Awareness</span>
                        <span className="awareness-status">
                            {observationsPool.entries.length} observations tracked
                        </span>
                    </div>
                </div>
            )}

            {/* Other Context Pools */}
            <div className="pools-divider" />

            {otherPools.map(pool => (
                <div
                    key={pool.id}
                    className={`context-pool ${expandedPool === pool.id ? 'expanded' : ''}`}
                >
                    <button
                        className="pool-header"
                        onClick={() => setExpandedPool(expandedPool === pool.id ? null : pool.id)}
                    >
                        <span className="pool-icon">{pool.icon}</span>
                        <div className="pool-info">
                            <span className="pool-name">{pool.name}</span>
                            <span className="pool-count">{pool.entries.length} entries</span>
                        </div>
                        <div className="pool-capacity">
                            <div
                                className="pool-capacity-fill"
                                style={{ width: `${(pool.entries.length / pool.maxEntries) * 100}%` }}
                            />
                        </div>
                        <span className="pool-expand-icon">
                            {expandedPool === pool.id ? '▼' : '▶'}
                        </span>
                    </button>

                    {expandedPool === pool.id && (
                        <div className="pool-entries">
                            {pool.entries.length === 0 ? (
                                <div className="pool-empty">No entries yet</div>
                            ) : (
                                pool.entries.slice(-5).reverse().map(entry => (
                                    <div key={entry.id} className="pool-entry">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <span className="entry-type">
                                                    {Boolean(entry.metadata?.isMemorySuggestion) ? '🧠 Suggestion' : entry.type}
                                                </span>
                                                <p className="entry-content">{entry.content}</p>
                                                <span className="entry-time">
                                                    {new Date(entry.timestamp).toLocaleTimeString()}
                                                </span>
                                            </div>

                                            {/* Allow saving suggestions to memory */}
                                            {!!entry.metadata?.isMemorySuggestion && (
                                                <button
                                                    className="p-1 hover:bg-[var(--truth-amber)]/20 text-[var(--truth-amber)] rounded"
                                                    onClick={() => handleCrystallizeAndSave(entry)}
                                                    disabled={isCrystallizing}
                                                    title="Save to Memory"
                                                >
                                                    <span className="sr-only">Save</span>
                                                    {isCrystallizing ? '⏳' : '🧠'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            {pool.id !== 'memory' && !pool.isSystem && (
                                <button
                                    className="pool-clear-btn"
                                    onClick={() => onClear(pool.id)}
                                >
                                    Clear Pool
                                </button>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* Memory Confirmation Modal */}
            <MemoryConfirmModal
                isOpen={memoryModalOpen}
                onClose={() => {
                    setMemoryModalOpen(false);
                    setPendingSuggestion(null);
                }}
                onConfirm={handleConfirmMemory}
                suggestion={pendingSuggestion?.content || ''}
                source={pendingSuggestion?.metadata?.source as string}
            />
        </div>
    );
}

// ============================================
// GRAPH VIEW
// ============================================

interface GraphViewProps {
    graph: { nodes: unknown[]; edges: unknown[]; lastUpdated: number };
}

function GraphView({ graph }: GraphViewProps) {
    return (
        <div className="graph-view">
            <div className="graph-stats">
                <div className="graph-stat">
                    <span className="stat-value">{graph.nodes.length}</span>
                    <span className="stat-label">Nodes</span>
                </div>
                <div className="graph-stat">
                    <span className="stat-value">{graph.edges.length}</span>
                    <span className="stat-label">Edges</span>
                </div>
                <div className="graph-stat">
                    <span className="stat-value">
                        {graph.lastUpdated ? new Date(graph.lastUpdated).toLocaleTimeString() : '—'}
                    </span>
                    <span className="stat-label">Last Update</span>
                </div>
            </div>

            <div className="graph-canvas">
                {graph.nodes.length === 0 ? (
                    <div className="graph-empty">
                        <span className="graph-empty-icon">🌊</span>
                        <p>Knowledge graph is empty</p>
                        <p className="graph-empty-hint">Add blocks to the Shell to populate the graph</p>
                    </div>
                ) : (
                    <div className="graph-placeholder">
                        <span className="graph-icon">🔮</span>
                        <p>Graph visualization coming soon</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================
// SETTINGS VIEW
// ============================================

interface SettingsViewProps {
    llmConfig: { provider: LLMProvider; model: string; temperature: number };
    onProviderChange: (provider: LLMProvider, apiKey?: string) => void;
}

function SettingsView({ llmConfig, onProviderChange }: SettingsViewProps) {
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const providers: { id: LLMProvider; name: string; icon: string; needsKey: boolean; keyUrl?: string }[] = [
        { id: 'local', name: 'Local (Ollama)', icon: '🏠', needsKey: false },
        { id: 'openai', name: 'OpenAI', icon: '🤖', needsKey: true, keyUrl: 'https://platform.openai.com/api-keys' },
        { id: 'anthropic', name: 'Anthropic', icon: '🧠', needsKey: true, keyUrl: 'https://console.anthropic.com/settings/keys' },
        { id: 'google', name: 'Google Gemini', icon: '🔮', needsKey: true, keyUrl: 'https://aistudio.google.com/app/apikey' },
        { id: 'deepseek', name: 'DeepSeek', icon: '🔍', needsKey: true, keyUrl: 'https://platform.deepseek.com/api_keys' }
    ];

    const currentProvider = providers.find(p => p.id === llmConfig.provider);
    const needsApiKey = currentProvider?.needsKey ?? false;

    const handleSaveKey = () => {
        if (apiKey.trim()) {
            onProviderChange(llmConfig.provider, apiKey.trim());
            setSavedMessage('✓ API Key saved!');
            setTimeout(() => setSavedMessage(null), 2000);
            // Don't clear the key display, just indicate it's saved
        }
    };

    const handleProviderSelect = (providerId: LLMProvider) => {
        setApiKey(''); // Clear key when switching providers
        setSavedMessage(null);
        onProviderChange(providerId);
    };

    return (
        <div className="settings-view">
            <section className="settings-section">
                <h3 className="settings-title">LLM Provider</h3>
                <div className="provider-grid">
                    {providers.map(provider => (
                        <button
                            key={provider.id}
                            className={`provider-card ${llmConfig.provider === provider.id ? 'active' : ''}`}
                            onClick={() => handleProviderSelect(provider.id)}
                        >
                            <span className="provider-icon">{provider.icon}</span>
                            <span className="provider-name">{provider.name}</span>
                            {llmConfig.provider === provider.id && (
                                <span className="provider-check">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            </section>

            {/* API Key Input - only for providers that need it */}
            {needsApiKey && (
                <section className="settings-section">
                    <h3 className="settings-title">API Key</h3>
                    <div className="api-key-section">
                        <div className="api-key-input-row">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                placeholder={`Enter ${currentProvider?.name} API key...`}
                                className="api-key-input"
                            />
                            <button
                                onClick={() => setShowKey(!showKey)}
                                className="btn-ghost api-key-toggle"
                                title={showKey ? 'Hide key' : 'Show key'}
                            >
                                {showKey ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        <div className="api-key-actions">
                            <button
                                onClick={handleSaveKey}
                                disabled={!apiKey.trim()}
                                className="btn-primary api-key-save"
                            >
                                Save Key
                            </button>
                            {currentProvider?.keyUrl && (
                                <a
                                    href={currentProvider.keyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-ghost api-key-get"
                                >
                                    Get API Key →
                                </a>
                            )}
                        </div>
                        {savedMessage && (
                            <div className="api-key-saved">{savedMessage}</div>
                        )}
                    </div>
                </section>
            )}

            <section className="settings-section">
                <h3 className="settings-title">Current Configuration</h3>
                <div className="config-display">
                    <div className="config-row">
                        <span className="config-label">Provider</span>
                        <span className="config-value">{currentProvider?.name}</span>
                    </div>
                    <div className="config-row">
                        <span className="config-label">Model</span>
                        <span className="config-value">{llmConfig.model}</span>
                    </div>
                    <div className="config-row">
                        <span className="config-label">Temperature</span>
                        <span className="config-value">{llmConfig.temperature}</span>
                    </div>
                </div>
            </section>
        </div>
    );
}

export default MindPanel;
