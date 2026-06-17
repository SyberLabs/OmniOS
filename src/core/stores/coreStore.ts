// ============================================
// PROJECT OMNI: COGNITIVE CORE STORE
// Zustand store for Systems + Projects
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    LifeSystem,
    Project,
    AIInstance,
    ContextPool,
    SystemType,
    SystemInfluence,
    ProjectState,
    DEFAULT_SYSTEMS,
    ContextNode,
    ContextEdge,
    AIMemoryEntry,
    StabilityState,
    SystemShell,
    SystemVariable,
    VariableRelationship,
    ExposedOutput
} from '../schemas/core.schema';
import { BUILTIN_PERSONAS } from '../schemas/mind.schema';

// ============================================
// STORE STATE
// ============================================

interface CognitiveState {
    // Systems
    systems: LifeSystem[];
    systemInfluences: SystemInfluence[];
    systemShells: Record<SystemType, SystemShell>;

    // Projects
    projects: Project[];

    // Context & AI
    contextPools: ContextPool[];
    aiInstances: AIInstance[];

    // Active context
    activeContextType: 'system' | 'project' | null;
    activeContextId: string | null;
    activeSystemShellId: SystemType | null;

    // System actions
    initializeSystems: () => void;
    updateSystemStability: (systemId: SystemType, score: number, state: StabilityState) => void;
    updateSystemAttribute: (systemId: SystemType, attributeId: string, value: number) => void;
    addSystemRule: (systemId: SystemType, rule: Omit<LifeSystem['rules'][0], 'id'>) => void;

    // Project actions
    createProject: (name: string, icon: string, linkedSystems?: SystemType[]) => Project;
    updateProject: (projectId: string, updates: Partial<Pick<Project, 'name' | 'description' | 'icon' | 'linkedSystems' | 'state'>>) => void;
    deleteProject: (projectId: string) => void;
    linkSystemToProject: (projectId: string, systemId: SystemType) => void;
    unlinkSystemFromProject: (projectId: string, systemId: SystemType) => void;

    // Context actions
    setActiveContext: (type: 'system' | 'project', id: string) => void;
    clearActiveContext: () => void;

    // System Shell actions
    activateSystemShell: (systemId: SystemType) => void;
    deactivateSystemShell: () => void;
    addSystemVariable: (systemId: SystemType, variable: Omit<SystemVariable, 'id' | 'createdAt' | 'updatedAt'>) => string;
    updateSystemVariable: (systemId: SystemType, variableId: string, value: unknown) => void;
    addVariableRelationship: (systemId: SystemType, relationship: Omit<VariableRelationship, 'id' | 'createdAt'>) => string;
    addExposedOutput: (systemId: SystemType, output: Omit<ExposedOutput, 'id' | 'updatedAt'>) => string;
    getSystemShell: (systemId: SystemType) => SystemShell | undefined;
    getActiveAIInstance: () => AIInstance | undefined;

    // Context pool actions
    addContextNode: (poolId: string, node: Omit<ContextNode, 'id' | 'createdAt'>) => void;
    addContextEdge: (poolId: string, edge: Omit<ContextEdge, 'id' | 'createdAt'>) => void;

    // AI memory actions
    addMemoryEntry: (instanceId: string, entry: Omit<AIMemoryEntry, 'id' | 'timestamp'>) => void;

    // Getters
    getSystem: (systemId: SystemType) => LifeSystem | undefined;
    getProject: (projectId: string) => Project | undefined;
    getContextPool: (poolId: string) => ContextPool | undefined;
    getAIInstance: (instanceId: string) => AIInstance | undefined;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function createContextPool(ownerType: 'system' | 'project', ownerId: string, name: string): ContextPool {
    return {
        id: `pool_${generateId()}`,
        name,
        ownerType,
        ownerId,
        nodes: [],
        edges: [],
        updatedAt: Date.now()
    };
}

function createAIInstance(
    contextType: 'system' | 'project',
    contextId: string,
    name: string,
    personaIndex: number = 0
): AIInstance {
    const persona = BUILTIN_PERSONAS[personaIndex % BUILTIN_PERSONAS.length];

    return {
        id: `ai_${generateId()}`,
        name: `${name} AI`,
        persona: {
            ...persona,
            createdAt: Date.now(),
            updatedAt: Date.now()
        },
        contextType,
        contextId,
        memory: [],
        memoryLimit: 100,
        lastInteraction: Date.now(),
        isIsolated: contextType === 'system'  // Systems are context-isolated
    };
}

// ============================================
// STORE
// ============================================

export const useCognitiveStore = create<CognitiveState>()(
    persist(
        (set, get) => ({
            systems: [],
            systemInfluences: [],
            systemShells: {} as Record<SystemType, SystemShell>,
            projects: [],
            contextPools: [],
            aiInstances: [],
            activeContextType: null,
            activeContextId: null,
            activeSystemShellId: null,

            // Initialize the 7 fundamental systems
            initializeSystems: () => {
                const { systems, systemShells } = get();
                const hasSystemShells = Object.keys(systemShells).length > 0;

                // Skip if fully initialized
                if (systems.length > 0 && hasSystemShells) {
                    console.log('[coreStore] Already initialized');
                    return;
                }

                console.log('[coreStore] Initializing systems... (systems:', systems.length, ', shells:', Object.keys(systemShells).length, ')');

                const newSystems: LifeSystem[] = [];
                const newContextPools: ContextPool[] = [];
                const newAIInstances: AIInstance[] = [];
                const newSystemShells: Record<SystemType, SystemShell> = {} as Record<SystemType, SystemShell>;

                DEFAULT_SYSTEMS.forEach((systemDef, index) => {
                    const contextPool = createContextPool('system', systemDef.id, `${systemDef.name} Context`);
                    const aiInstance = createAIInstance('system', systemDef.id, systemDef.name, index);

                    newSystems.push({
                        ...systemDef,
                        contextPoolId: contextPool.id,
                        aiInstanceId: aiInstance.id,
                        lastActivity: Date.now()
                    });
                    newContextPools.push(contextPool);
                    newAIInstances.push(aiInstance);

                    // Create default SystemShell for each system
                    const now = Date.now();
                    newSystemShells[systemDef.id as SystemType] = {
                        systemId: systemDef.id as SystemType,
                        persona: aiInstance.persona,
                        variables: systemDef.attributes.map(attr => ({
                            id: attr.id,
                            name: attr.name,
                            type: 'number' as const,
                            value: attr.value,
                            defaultValue: attr.value,
                            unit: attr.unit,
                            min: 0,
                            max: 100,
                            source: 'manual' as const,
                            description: `${attr.name} tracking`,
                            createdAt: now,
                            updatedAt: now
                        })),
                        relationships: [],
                        blockInstanceIds: [],
                        exposedOutputs: [
                            {
                                id: `${systemDef.id}_stability`,
                                name: 'Stability',
                                type: 'number',
                                sourceType: 'computed',
                                sourceId: 'system_stability',
                                value: systemDef.stabilityScore,
                                updatedAt: now
                            }
                        ],
                        isActivated: false,
                        createdAt: now,
                        updatedAt: now
                    };
                });

                // Default system influences
                const defaultInfluences: SystemInfluence[] = [
                    { sourceSystemId: 'health', targetSystemId: 'mind', influenceType: 'positive', strength: 0.7 },
                    { sourceSystemId: 'health', targetSystemId: 'career', influenceType: 'positive', strength: 0.5 },
                    { sourceSystemId: 'time', targetSystemId: 'career', influenceType: 'bidirectional', strength: 0.8 },
                    { sourceSystemId: 'time', targetSystemId: 'relationships', influenceType: 'bidirectional', strength: 0.6 },
                    { sourceSystemId: 'finance', targetSystemId: 'environment', influenceType: 'positive', strength: 0.5 },
                    { sourceSystemId: 'mind', targetSystemId: 'career', influenceType: 'positive', strength: 0.7 },
                    { sourceSystemId: 'relationships', targetSystemId: 'health', influenceType: 'positive', strength: 0.4 }
                ];

                set({
                    systems: newSystems,
                    systemInfluences: defaultInfluences,
                    systemShells: newSystemShells,
                    contextPools: newContextPools,
                    aiInstances: newAIInstances
                });
            },

            updateSystemStability: (systemId, score, state) => {
                set(s => ({
                    systems: s.systems.map(sys =>
                        sys.id === systemId
                            ? { ...sys, stabilityScore: score, stability: state, lastActivity: Date.now() }
                            : sys
                    )
                }));
            },

            updateSystemAttribute: (systemId, attributeId, value) => {
                set(s => ({
                    systems: s.systems.map(sys =>
                        sys.id === systemId
                            ? {
                                ...sys,
                                attributes: sys.attributes.map(attr =>
                                    attr.id === attributeId
                                        ? { ...attr, value, lastUpdated: Date.now() }
                                        : attr
                                ),
                                lastActivity: Date.now()
                            }
                            : sys
                    )
                }));
            },

            addSystemRule: (systemId, rule) => {
                set(s => ({
                    systems: s.systems.map(sys =>
                        sys.id === systemId
                            ? {
                                ...sys,
                                rules: [...sys.rules, { ...rule, id: generateId() }]
                            }
                            : sys
                    )
                }));
            },

            createProject: (name, icon, linkedSystems = []) => {
                const contextPool = createContextPool('project', '', name);
                const aiInstance = createAIInstance('project', '', name, 1); // Strategist persona

                const project: Project = {
                    id: generateId(),
                    name,
                    icon,
                    state: 'draft',
                    linkedSystems,
                    contextPoolId: contextPool.id,
                    aiInstanceId: aiInstance.id,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    metadata: {}
                };

                // Update pool and instance with project ID
                contextPool.ownerId = project.id;
                aiInstance.contextId = project.id;

                set(s => ({
                    projects: [...s.projects, project],
                    contextPools: [...s.contextPools, contextPool],
                    aiInstances: [...s.aiInstances, aiInstance]
                }));

                return project;
            },

            updateProject: (projectId, updates) => {
                set(s => ({
                    projects: s.projects.map(p =>
                        p.id === projectId
                            ? { ...p, ...updates, updatedAt: Date.now() }
                            : p
                    )
                }));
            },

            deleteProject: (projectId) => {
                const project = get().projects.find(p => p.id === projectId);
                if (!project) return;

                set(s => ({
                    projects: s.projects.filter(p => p.id !== projectId),
                    contextPools: s.contextPools.filter(cp => cp.id !== project.contextPoolId),
                    aiInstances: s.aiInstances.filter(ai => ai.id !== project.aiInstanceId)
                }));
            },

            linkSystemToProject: (projectId, systemId) => {
                set(s => ({
                    projects: s.projects.map(p =>
                        p.id === projectId && !p.linkedSystems.includes(systemId)
                            ? { ...p, linkedSystems: [...p.linkedSystems, systemId], updatedAt: Date.now() }
                            : p
                    )
                }));
            },

            unlinkSystemFromProject: (projectId, systemId) => {
                set(s => ({
                    projects: s.projects.map(p =>
                        p.id === projectId
                            ? { ...p, linkedSystems: p.linkedSystems.filter(s => s !== systemId), updatedAt: Date.now() }
                            : p
                    )
                }));
            },

            setActiveContext: (type, id) => {
                set({ activeContextType: type, activeContextId: id });
            },

            clearActiveContext: () => {
                set({ activeContextType: null, activeContextId: null });
            },

            // System Shell Actions
            activateSystemShell: (systemId) => {
                const shell = get().systemShells[systemId];
                if (shell) {
                    set(s => ({
                        activeSystemShellId: systemId,
                        systemShells: {
                            ...s.systemShells,
                            [systemId]: { ...shell, isActivated: true, updatedAt: Date.now() }
                        }
                    }));
                }
            },

            deactivateSystemShell: () => {
                set({ activeSystemShellId: null });
            },

            addSystemVariable: (systemId, variable) => {
                const id = generateId();
                const now = Date.now();
                set(s => {
                    const shell = s.systemShells[systemId];
                    if (!shell) return s;
                    return {
                        systemShells: {
                            ...s.systemShells,
                            [systemId]: {
                                ...shell,
                                variables: [...shell.variables, { ...variable, id, createdAt: now, updatedAt: now }],
                                updatedAt: now
                            }
                        }
                    };
                });
                return id;
            },

            updateSystemVariable: (systemId, variableId, value) => {
                const now = Date.now();
                set(s => {
                    const shell = s.systemShells[systemId];
                    if (!shell) return s;
                    return {
                        systemShells: {
                            ...s.systemShells,
                            [systemId]: {
                                ...shell,
                                variables: shell.variables.map(v =>
                                    v.id === variableId ? { ...v, value, updatedAt: now } : v
                                ),
                                updatedAt: now
                            }
                        }
                    };
                });
            },

            addVariableRelationship: (systemId, relationship) => {
                const id = generateId();
                const now = Date.now();
                set(s => {
                    const shell = s.systemShells[systemId];
                    if (!shell) return s;
                    return {
                        systemShells: {
                            ...s.systemShells,
                            [systemId]: {
                                ...shell,
                                relationships: [...shell.relationships, { ...relationship, id, createdAt: now }],
                                updatedAt: now
                            }
                        }
                    };
                });
                return id;
            },

            addExposedOutput: (systemId, output) => {
                const id = generateId();
                const now = Date.now();
                set(s => {
                    const shell = s.systemShells[systemId];
                    if (!shell) return s;
                    return {
                        systemShells: {
                            ...s.systemShells,
                            [systemId]: {
                                ...shell,
                                exposedOutputs: [...shell.exposedOutputs, { ...output, id, updatedAt: now }],
                                updatedAt: now
                            }
                        }
                    };
                });
                return id;
            },

            getSystemShell: (systemId) => {
                return get().systemShells[systemId];
            },

            getActiveAIInstance: () => {
                const { activeContextType, activeContextId, systems, projects, aiInstances } = get();
                if (!activeContextType || !activeContextId) return undefined;

                let aiInstanceId: string | undefined;
                if (activeContextType === 'system') {
                    aiInstanceId = systems.find(s => s.id === activeContextId)?.aiInstanceId;
                } else {
                    aiInstanceId = projects.find(p => p.id === activeContextId)?.aiInstanceId;
                }

                return aiInstances.find(ai => ai.id === aiInstanceId);
            },

            addContextNode: (poolId, node) => {
                const newNode: ContextNode = {
                    ...node,
                    id: generateId(),
                    createdAt: Date.now()
                };

                set(s => ({
                    contextPools: s.contextPools.map(cp =>
                        cp.id === poolId
                            ? { ...cp, nodes: [...cp.nodes, newNode], updatedAt: Date.now() }
                            : cp
                    )
                }));
            },

            addContextEdge: (poolId, edge) => {
                const newEdge: ContextEdge = {
                    ...edge,
                    id: generateId(),
                    createdAt: Date.now()
                };

                set(s => ({
                    contextPools: s.contextPools.map(cp =>
                        cp.id === poolId
                            ? { ...cp, edges: [...cp.edges, newEdge], updatedAt: Date.now() }
                            : cp
                    )
                }));
            },

            addMemoryEntry: (instanceId, entry) => {
                const newEntry: AIMemoryEntry = {
                    ...entry,
                    id: generateId(),
                    timestamp: Date.now()
                };

                set(s => ({
                    aiInstances: s.aiInstances.map(ai => {
                        if (ai.id !== instanceId) return ai;

                        const newMemory = [...ai.memory, newEntry];
                        // Trim to memory limit
                        const trimmed = newMemory.length > ai.memoryLimit
                            ? newMemory.slice(-ai.memoryLimit)
                            : newMemory;

                        return { ...ai, memory: trimmed, lastInteraction: Date.now() };
                    })
                }));
            },

            getSystem: (systemId) => get().systems.find(s => s.id === systemId),
            getProject: (projectId) => get().projects.find(p => p.id === projectId),
            getContextPool: (poolId) => get().contextPools.find(cp => cp.id === poolId),
            getAIInstance: (instanceId) => get().aiInstances.find(ai => ai.id === instanceId)
        }),
        {
            name: 'omni-cognitive-core',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                systems: state.systems,
                systemInfluences: state.systemInfluences,
                systemShells: state.systemShells,
                projects: state.projects,
                contextPools: state.contextPools,
                aiInstances: state.aiInstances
            })
        }
    )
);

export default useCognitiveStore;
