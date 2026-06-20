// ============================================
// PROJECT OMNI: ZUSTAND STORES
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    BlockInstance,
    ConnectionStatus,
    BlockConnection,
    OmniBlockSchema
} from '../schemas/block.schema';
import {
    ShellConfig,
    OmniSettings,
    PersonaType,
    AestheticTheme
} from '../schemas/shell.schema';

// Re-export Mind store
export { useMindStore } from './mindStore';
import { useGraphPoolStore } from './graphPool.store';

// Re-export Cognitive Core store
export { useCognitiveStore } from './coreStore';

// Re-export Stability store
export { useStabilityStore } from './stabilityStore';

// Re-export Tool store
export { useToolStore } from './toolStore';
export type { ToolType, SelectionData } from './toolStore';

// Re-export Graph Pool store
export { useGraphPoolStore } from './graphPool.store';

// Import Wire store for shell save/load
import { useWireStore } from './wireStore';

// Import Block Registry for shell load/recreation
import { blockRegistry } from '../registry/BlockRegistry';

// Import shell templates for the Shell Store
import type { ShellTemplate } from '../shells/templates';

// ============================================
// BLOCK STORE
// ============================================

interface BlockState {
    /** Active block instances on the canvas */
    blocks: BlockInstance[];

    /** Connections between blocks */
    connections: BlockConnection[];

    /** Currently active shell ID */
    activeShellId: string;

    /** Add a new block to the canvas */
    addBlock: (schema: OmniBlockSchema, position: { x: number; y: number }, shellId?: string) => string;

    /** Remove a block from the canvas */
    removeBlock: (instanceId: string) => void;

    /** Update block position */
    updatePosition: (instanceId: string, position: { x: number; y: number }) => void;

    /** Update block dimensions */
    updateDimensions: (instanceId: string, dimensions: { width: number; height: number }) => void;

    /** Update block data */
    updateData: (instanceId: string, data: unknown) => void;

    /** Update block status */
    updateStatus: (instanceId: string, status: ConnectionStatus, error?: string) => void;

    /** Add a connection between blocks */
    addConnection: (connection: Omit<BlockConnection, 'id'>) => void;

    /** Remove a connection */
    removeConnection: (connectionId: string) => void;

    /** Clear all blocks and connections */
    clearCanvas: () => void;

    /** Get a block by ID */
    getBlock: (instanceId: string) => BlockInstance | undefined;

    /** Get blocks for a specific shell */
    getBlocksByShell: (shellId: string) => BlockInstance[];

    /** Get connections for a specific shell */
    getConnectionsByShell: (shellId: string) => BlockConnection[];

    /** Set the active shell */
    setActiveShell: (shellId: string) => void;

    /** Clear all blocks and connections in a specific shell */
    clearShell: (shellId: string) => void;
}

export const useBlockStore = create<BlockState>()(
    persist(
        (set, get) => ({
            blocks: [],
            connections: [],
            activeShellId: 'root',

            addBlock: (schema, position, shellId) => {
                const instanceId = `${schema.block_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Persona blocks need more height for chat interface
                const isPersonaBlock = schema.block_id.startsWith('persona_');
                const defaultHeight = isPersonaBlock ? 400 : 240;

                const newBlock: BlockInstance = {
                    instance_id: instanceId,
                    schema,
                    status: 'disconnected',
                    last_updated: null,
                    data: null,
                    position,
                    dimensions: { width: 320, height: defaultHeight },
                    shellId: shellId || get().activeShellId  // Use active shell when not specified
                };

                set(state => ({
                    blocks: [...state.blocks, newBlock]
                }));

                return instanceId;
            },

            removeBlock: (instanceId) => {
                set(state => ({
                    blocks: state.blocks.filter(b => b.instance_id !== instanceId),
                    connections: state.connections.filter(
                        c => c.sourceBlockId !== instanceId && c.targetBlockId !== instanceId
                    )
                }));
            },

            updatePosition: (instanceId, position) => {
                set(state => ({
                    blocks: state.blocks.map(b =>
                        b.instance_id === instanceId ? { ...b, position } : b
                    )
                }));
            },

            updateDimensions: (instanceId, dimensions) => {
                set(state => ({
                    blocks: state.blocks.map(b =>
                        b.instance_id === instanceId ? { ...b, dimensions } : b
                    )
                }));
            },

            updateData: (instanceId, data) => {
                const block = get().blocks.find(b => b.instance_id === instanceId);

                set(state => ({
                    blocks: state.blocks.map(b =>
                        b.instance_id === instanceId
                            ? { ...b, data, last_updated: Date.now() }
                            : b
                    )
                }));

                // --- INTEGRATION: Sync to Graph Pool ---
                if (block?.schema.subscribedGraphId && block?.schema.systemId && data && typeof data === 'object') {
                    const graphPoolStore = useGraphPoolStore.getState();
                    const mapping = block.schema.graphNodeMapping;
                    
                    if (mapping) {
                        // Use explicit mapping
                        Object.entries(mapping).forEach(([dataKey, nodeId]) => {
                            const val = (data as any)[dataKey];
                            if (typeof val === 'number') {
                                graphPoolStore.updateNodeValue(block.schema.systemId as any, block.schema.subscribedGraphId!, nodeId, val);
                            }
                        });
                    } else {
                        // Fallback to 'value' or block_id-based guessing (deprecated but keeps compat)
                        const val = (data as any).value;
                        if (typeof val === 'number') {
                            const nodeId = block.schema.block_id.split('.').pop() || '';
                            graphPoolStore.updateNodeValue(block.schema.systemId as any, block.schema.subscribedGraphId, nodeId, val);
                        }
                    }
                }
            },

            updateStatus: (instanceId, status, error) => {
                set(state => ({
                    blocks: state.blocks.map(b =>
                        b.instance_id === instanceId ? { ...b, status, error } : b
                    )
                }));
            },

            addConnection: (connection) => {
                const id = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                set(state => ({
                    connections: [...state.connections, { ...connection, id }]
                }));
            },

            removeConnection: (connectionId) => {
                set(state => ({
                    connections: state.connections.filter(c => c.id !== connectionId)
                }));
            },

            clearCanvas: () => {
                // Clear only the active shell
                const activeShellId = get().activeShellId;
                get().clearShell(activeShellId);
            },

            getBlock: (instanceId) => {
                return get().blocks.find(b => b.instance_id === instanceId);
            },

            getBlocksByShell: (shellId) => {
                return get().blocks.filter(b => b.shellId === shellId);
            },

            getConnectionsByShell: (shellId) => {
                const shellBlocks = get().blocks.filter(b => b.shellId === shellId);
                const shellBlockIds = new Set(shellBlocks.map(b => b.instance_id));

                return get().connections.filter(c =>
                    shellBlockIds.has(c.sourceBlockId) && shellBlockIds.has(c.targetBlockId)
                );
            },

            setActiveShell: (shellId) => {
                set({ activeShellId: shellId });
            },

            clearShell: (shellId) => {
                set(state => ({
                    blocks: state.blocks.filter(b => b.shellId !== shellId),
                    connections: state.connections.filter(c => {
                        const sourceBlock = state.blocks.find(b => b.instance_id === c.sourceBlockId);
                        const targetBlock = state.blocks.find(b => b.instance_id === c.targetBlockId);
                        return sourceBlock?.shellId !== shellId && targetBlock?.shellId !== shellId;
                    })
                }));
            }
        }),
        {
            name: 'omni-blocks',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                blocks: state.blocks,
                connections: state.connections,
                activeShellId: state.activeShellId
            })
        }
    )
);

// ============================================
// SHELL STORE
// ============================================

interface ShellState {
    /** Available shell configurations */
    shells: ShellConfig[];

    /** Currently active shell ID */
    activeShellId: string | null;

    /** Hotkey slot assignments (1-9 → shellId) */
    hotkeySlots: Record<number, string>;

    /** Current persona */
    currentPersona: PersonaType;

    /** Current aesthetic */
    currentAesthetic: AestheticTheme;

    /** Create a new shell */
    createShell: (name: string, description?: string) => ShellConfig;

    /** Save ANY shell with metadata (universal save) */
    saveShell: (shellId: string, metadata?: Partial<ShellConfig>) => ShellConfig;

    /** Save current canvas state to a shell */
    saveToShell: (shellId: string) => void;

    /** Load a shell configuration with block recreation */
    loadShell: (shellId: string) => boolean;

    /** Duplicate a shell (for templates) */
    duplicateShell: (sourceShellId: string, name?: string) => ShellConfig | null;

    /** Instantiate a built-in shell template into a fresh, activated shell. */
    instantiateTemplate: (template: ShellTemplate, name?: string) => string | null;

    /** Assign shell to hotkey slot (1-9) */
    assignHotkey: (shellId: string, slot: number) => boolean;

    /** Delete a shell */
    deleteShell: (shellId: string) => void;

    /** Update shell name/description */
    updateShell: (shellId: string, updates: Partial<Pick<ShellConfig, 'name' | 'description'>>) => void;

    /** Set current persona */
    setPersona: (persona: PersonaType) => void;

    /** Set current aesthetic */
    setAesthetic: (aesthetic: AestheticTheme) => void;

    /** Get active shell */
    getActiveShell: () => ShellConfig | undefined;
}

export const useShellStore = create<ShellState>()(
    persist(
        (set, get) => ({
            shells: [],
            activeShellId: null,
            hotkeySlots: {},
            currentPersona: 'analyst',
            currentAesthetic: 'command',

            createShell: (name, description) => {
                const blockStore = useBlockStore.getState();
                const now = Date.now();

                const newShell: ShellConfig = {
                    id: `shell_${now}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'custom',  // User-created shells are 'custom' type
                    name,
                    description,
                    blocks: blockStore.blocks.map(b => ({
                        blockId: b.schema.block_id,
                        instanceId: b.instance_id,
                        position: b.position,
                        dimensions: b.dimensions
                    })),
                    connections: blockStore.connections,
                    persona: get().currentPersona,
                    aesthetic: get().currentAesthetic,
                    createdAt: now,
                    updatedAt: now
                };

                set(state => ({
                    shells: [...state.shells, newShell],
                    activeShellId: newShell.id
                }));

                return newShell;
            },

            saveToShell: (shellId) => {
                const blockStore = useBlockStore.getState();

                set(state => ({
                    shells: state.shells.map(shell =>
                        shell.id === shellId
                            ? {
                                ...shell,
                                blocks: blockStore.blocks.map(b => ({
                                    blockId: b.schema.block_id,
                                    instanceId: b.instance_id,
                                    position: b.position,
                                    dimensions: b.dimensions
                                })),
                                connections: blockStore.connections,
                                persona: state.currentPersona,
                                aesthetic: state.currentAesthetic,
                                updatedAt: Date.now()
                            }
                            : shell
                    )
                }));
            },

            deleteShell: (shellId) => {
                set(state => ({
                    shells: state.shells.filter(s => s.id !== shellId),
                    activeShellId: state.activeShellId === shellId ? null : state.activeShellId
                }));
            },

            updateShell: (shellId, updates) => {
                set(state => ({
                    shells: state.shells.map(shell =>
                        shell.id === shellId
                            ? { ...shell, ...updates, updatedAt: Date.now() }
                            : shell
                    )
                }));
            },

            setPersona: (persona) => set({ currentPersona: persona }),

            setAesthetic: (aesthetic) => set({ currentAesthetic: aesthetic }),

            getActiveShell: () => {
                const state = get();
                return state.shells.find(s => s.id === state.activeShellId);
            },

            // NEW Phase 4 methods

            saveShell: (shellId, metadata) => {
                const blockStore = useBlockStore.getState();
                const wireStore = useWireStore.getState();

                // Get shell-specific blocks and wires
                const shellBlocks = blockStore.getBlocksByShell(shellId);
                const shellWires = wireStore.getWiresByShell(shellId);
                const shellConnections = blockStore.getConnectionsByShell(shellId);

                const now = Date.now();
                const shellConfig: ShellConfig = {
                    id: shellId,
                    type: metadata?.type || 'custom',
                    name: metadata?.name || `Shell ${now}`,
                    description: metadata?.description,
                    systemType: metadata?.systemType,
                    blocks: shellBlocks.map(b => ({
                        blockId: b.schema.block_id,
                        instanceId: b.instance_id,
                        position: b.position,
                        dimensions: b.dimensions,
                        config: { data: b.data }
                    })),
                    connections: shellConnections,
                    persona: metadata?.persona || get().currentPersona,
                    aesthetic: metadata?.aesthetic || get().currentAesthetic,
                    hotkeySlot: metadata?.hotkeySlot,
                    isTemplate: metadata?.isTemplate,
                    templateTags: metadata?.templateTags,
                    createdAt: metadata?.createdAt || now,
                    updatedAt: now,
                    lastAccessedAt: now
                };

                set(state => ({
                    shells: [...state.shells.filter(s => s.id !== shellId), shellConfig]
                }));

                return shellConfig;
            },

            loadShell: (shellId) => {
                const shell = get().shells.find(s => s.id === shellId);
                if (!shell) return false;

                const blockStore = useBlockStore.getState();

                // Clear existing blocks in target shell (if any)
                blockStore.clearShell(shellId);

                // Build new blocks array from saved shell state
                const recreatedBlocks: BlockInstance[] = [];
                shell.blocks.forEach(savedBlock => {
                    // Get the block schema from registry
                    const schema = blockRegistry.get(savedBlock.blockId);
                    if (!schema) {
                        console.warn(`Block schema not found for ${savedBlock.blockId}, skipping`);
                        return;
                    }

                    // Create block instance with saved state
                    recreatedBlocks.push({
                        instance_id: savedBlock.instanceId,
                        schema,
                        status: 'disconnected',
                        last_updated: null,
                        data: savedBlock.config?.data || null,
                        position: savedBlock.position,
                        dimensions: savedBlock.dimensions,
                        shellId: shellId
                    });
                });

                // Add recreated blocks to the block store using proper Zustand mutation
                const currentBlocks = blockStore.blocks.filter(b => b.shellId !== shellId);
                useBlockStore.setState({
                    blocks: [...currentBlocks, ...recreatedBlocks],
                    connections: [...blockStore.connections, ...shell.connections],
                    activeShellId: shellId
                });

                // Update shell store metadata
                set(state => ({
                    shells: state.shells.map(s =>
                        s.id === shellId ? { ...s, lastAccessedAt: Date.now() } : s
                    ),
                    activeShellId: shellId,
                    currentPersona: shell.persona,
                    currentAesthetic: shell.aesthetic
                }));

                return true;
            },

            duplicateShell: (sourceShellId, name) => {
                const source = get().shells.find(s => s.id === sourceShellId);
                if (!source) return null;

                const newShellId = `shell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const now = Date.now();

                const newShell: ShellConfig = {
                    ...source,
                    id: newShellId,
                    name: name || `${source.name} (Copy)`,
                    type: 'custom',
                    isTemplate: false,
                    hotkeySlot: undefined,
                    createdAt: now,
                    updatedAt: now,
                    lastAccessedAt: now
                };

                set(state => ({
                    shells: [...state.shells, newShell]
                }));

                return newShell;
            },

            instantiateTemplate: (template, name) => {
                const now = Date.now();
                const newShellId = `shell_${now}_${Math.random().toString(36).substr(2, 9)}`;

                // Remap each template block's local `ref` to a fresh unique instance id.
                const refToInstanceId = new Map<string, string>();
                const blocks = template.blocks.map((tb, i) => {
                    const instanceId = `${tb.blockId}_${now}_${i}_${Math.random().toString(36).substr(2, 6)}`;
                    refToInstanceId.set(tb.ref, instanceId);
                    const isPersona = tb.blockId.startsWith('persona_');
                    return {
                        blockId: tb.blockId,
                        instanceId,
                        position: tb.position,
                        dimensions: tb.dimensions ?? { width: 320, height: isPersona ? 400 : 240 }
                    };
                });

                // Remap ref-based connections to real instance ids; drop any that
                // reference a missing block (defensive — validateTemplate covers this).
                const connections: BlockConnection[] = template.connections
                    .map((c, i) => {
                        const sourceBlockId = refToInstanceId.get(c.sourceRef);
                        const targetBlockId = refToInstanceId.get(c.targetRef);
                        if (!sourceBlockId || !targetBlockId) return null;
                        return {
                            id: `conn_${now}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                            sourceBlockId,
                            sourcePort: c.sourcePort,
                            targetBlockId,
                            targetPort: c.targetPort
                        };
                    })
                    .filter((c): c is BlockConnection => c !== null);

                const shellConfig: ShellConfig = {
                    id: newShellId,
                    type: 'custom',
                    name: name || template.name,
                    description: template.description,
                    blocks,
                    connections,
                    persona: template.persona,
                    aesthetic: template.aesthetic,
                    isTemplate: false,
                    templateTags: template.tags,
                    createdAt: now,
                    updatedAt: now,
                    lastAccessedAt: now
                };

                // Register the new shell, then reuse loadShell's tested block-recreation
                // path to populate + activate the canvas.
                set(state => ({ shells: [...state.shells, shellConfig] }));
                const ok = get().loadShell(newShellId);
                return ok ? newShellId : null;
            },

            assignHotkey: (shellId, slot) => {
                if (slot < 1 || slot > 9) return false;

                set(state => ({
                    hotkeySlots: { ...state.hotkeySlots, [slot]: shellId },
                    shells: state.shells.map(s =>
                        s.id === shellId ? { ...s, hotkeySlot: slot } : s
                    )
                }));

                return true;
            }
        }),
        {
            name: 'omni-shells',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                shells: state.shells,
                activeShellId: state.activeShellId,
                hotkeySlots: state.hotkeySlots,
                currentPersona: state.currentPersona,
                currentAesthetic: state.currentAesthetic
            })
        }
    )
);

// ============================================
// SETTINGS STORE
// ============================================

interface SettingsState extends OmniSettings {
    /** Update a setting */
    updateSetting: <K extends keyof OmniSettings>(key: K, value: OmniSettings[K]) => void;

    /** Update an API key */
    updateApiKey: (key: keyof OmniSettings['apiKeys'], value: string) => void;

    /** Toggle mock data mode */
    toggleMockData: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            useMockData: true, // Default to mock mode
            // NewsAPI/Polymarket keys now live server-side (process.env); these
            // client-side fields are retained only for legacy/other providers and
            // default to undefined so no placeholder secrets are persisted.
            apiKeys: {
                polymarket: undefined,
                newsapi: undefined,
                tradingview: undefined,
                flightaware: undefined,
                marinetraffic: undefined,
                gdelt: undefined
            },
            activeShellId: null,
            gridSnapping: true,
            gridSize: 20,
            autoWiring: true,
            showConnections: true,

            updateSetting: (key, value) => set({ [key]: value }),

            updateApiKey: (key, value) => set(state => ({
                apiKeys: { ...state.apiKeys, [key]: value }
            })),

            toggleMockData: () => set(state => ({ useMockData: !state.useMockData }))
        }),
        {
            name: 'omni-settings',
            storage: createJSONStorage(() => localStorage)
        }
    )
);

// ============================================
// UI STORE (for command palette, modals, etc.)
// ============================================

interface UIState {
    /** Command palette open state */
    commandPaletteOpen: boolean;

    /** Currently dragging block type (for DnD from Armory) */
    draggingBlockId: string | null;

    /** Selected block instance ID */
    selectedBlockId: string | null;

    /** Open command palette */
    openCommandPalette: () => void;

    /** Close command palette */
    closeCommandPalette: () => void;

    /** Toggle command palette */
    toggleCommandPalette: () => void;

    /** Set dragging block */
    setDraggingBlock: (blockId: string | null) => void;

    /** Set selected block */
    setSelectedBlock: (instanceId: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
    commandPaletteOpen: false,
    draggingBlockId: null,
    selectedBlockId: null,

    openCommandPalette: () => set({ commandPaletteOpen: true }),
    closeCommandPalette: () => set({ commandPaletteOpen: false }),
    toggleCommandPalette: () => set(state => ({ commandPaletteOpen: !state.commandPaletteOpen })),
    setDraggingBlock: (blockId) => set({ draggingBlockId: blockId }),
    setSelectedBlock: (instanceId) => set({ selectedBlockId: instanceId })
}));
