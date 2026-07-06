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
import { DataWire, DEFAULT_WIRE_FILTERS } from '../schemas/wire.schema';

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

    /** Clear all blocks and wires on the active shell */
    clearCanvas: () => void;

    /** Get a block by ID */
    getBlock: (instanceId: string) => BlockInstance | undefined;

    /** Get blocks for a specific shell */
    getBlocksByShell: (shellId: string) => BlockInstance[];

    /** Set the active shell */
    setActiveShell: (shellId: string) => void;

    /** Clear all blocks and wires in a specific shell */
    clearShell: (shellId: string) => void;
}

export const useBlockStore = create<BlockState>()(
    persist(
        (set, get) => ({
            blocks: [],
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
                    blocks: state.blocks.filter(b => b.instance_id !== instanceId)
                }));
                // Single wire system: clean up any wires touching this block
                // (previously orphaned wires lingered forever).
                useWireStore.getState().removeWiresForBlock(instanceId);
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

            setActiveShell: (shellId) => {
                set({ activeShellId: shellId });
            },

            clearShell: (shellId) => {
                set(state => ({
                    blocks: state.blocks.filter(b => b.shellId !== shellId)
                }));
                // Single wire system: a shell's wires die with its blocks.
                useWireStore.getState().removeWiresByShell(shellId);
            }
        }),
        {
            name: 'omni-blocks',
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                blocks: state.blocks,
                activeShellId: state.activeShellId
            }),
            // v0 → v1: drop the legacy dual-wire `connections` field. Wires
            // live solely in wireStore (`omni-wires`) as of A1.
            migrate: (persistedState: unknown) => {
                const persisted = (persistedState || {}) as Record<string, unknown>;
                delete persisted.connections;
                return persisted;
            }
        }
    )
);

// ============================================
// SHELL STORE
// ============================================

/**
 * Convert legacy dual-wire-system BlockConnection[] (old persisted shells)
 * into DataWires owned by the given shell. Part of the A1 wire unification.
 */
function legacyConnectionsToWires(
    connections: BlockConnection[] | undefined,
    shellId: string
): DataWire[] {
    return (connections || []).map((c, i) => ({
        id: `wire_migrated_${shellId}_${i}`,
        sourceBlockId: c.sourceBlockId,
        targetBlockId: c.targetBlockId,
        sourcePort: c.sourcePort,
        targetPort: c.targetPort,
        wireType: 'push' as const,
        filters: { ...DEFAULT_WIRE_FILTERS },
        status: 'active' as const,
        shellId
    }));
}

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
                const now = Date.now();

                // A new shell starts EMPTY — it is not a copy of the current
                // canvas. (To snapshot the current canvas, use "Save Current".)
                const newShell: ShellConfig = {
                    id: `shell_${now}_${Math.random().toString(36).substr(2, 9)}`,
                    type: 'custom',  // User-created shells are 'custom' type
                    name,
                    description,
                    blocks: [],
                    wires: [],
                    persona: get().currentPersona,
                    aesthetic: get().currentAesthetic,
                    createdAt: now,
                    updatedAt: now
                };

                set(state => ({
                    shells: [...state.shells, newShell],
                    activeShellId: newShell.id
                }));

                // Switch the block store to the new (empty) shell so the canvas
                // — which follows the active shell — shows a blank workspace.
                // Existing shells' blocks are untouched (kept under their own id).
                useBlockStore.getState().setActiveShell(newShell.id);

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
                                wires: useWireStore.getState().getWiresByShell(shellId),
                                persona: state.currentPersona,
                                aesthetic: state.currentAesthetic,
                                updatedAt: Date.now()
                            }
                            : shell
                    )
                }));
            },

            deleteShell: (shellId) => {
                const blockStore = useBlockStore.getState();
                const wasActiveOnCanvas = blockStore.activeShellId === shellId;

                // Remove the shell's blocks/connections so they don't linger
                // orphaned under a dead shell id.
                blockStore.clearShell(shellId);

                // If the deleted shell was the one on the canvas, fall back to root.
                if (wasActiveOnCanvas) {
                    blockStore.setActiveShell('root');
                }

                set(state => ({
                    shells: state.shells.filter(s => s.id !== shellId),
                    activeShellId: state.activeShellId === shellId
                        ? (wasActiveOnCanvas ? 'root' : null)
                        : state.activeShellId
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
                    wires: shellWires,
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
                    activeShellId: shellId
                });

                // Restore the shell's wires into the single wire system so they
                // both render (WireRenderer) and feed personas (aggregateWireContext).
                // Legacy shells saved BlockConnection[]; convert on the way in.
                const savedWires = shell.wires ?? legacyConnectionsToWires(shell.connections, shellId);
                useWireStore.getState().replaceWiresForShell(shellId, savedWires);

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
                    // Fresh wire ids + ownership so the copy's wires can't collide
                    // with the source shell's when both are loaded.
                    wires: (source.wires ?? legacyConnectionsToWires(source.connections, newShellId))
                        .map((w, i) => ({
                            ...w,
                            id: `wire_${now}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                            shellId: newShellId
                        })),
                    connections: undefined,
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

                // Remap ref-based template connections to real DataWires (the single
                // wire system) so they render AND feed personas. Drop any that
                // reference a missing block (defensive — validateTemplate covers this).
                const wires: DataWire[] = template.connections
                    .map((c, i): DataWire | null => {
                        const sourceBlockId = refToInstanceId.get(c.sourceRef);
                        const targetBlockId = refToInstanceId.get(c.targetRef);
                        if (!sourceBlockId || !targetBlockId) return null;
                        return {
                            id: `wire_${now}_${i}_${Math.random().toString(36).substr(2, 6)}`,
                            sourceBlockId,
                            targetBlockId,
                            sourcePort: c.sourcePort,
                            targetPort: c.targetPort,
                            wireType: 'push' as const,
                            filters: { ...DEFAULT_WIRE_FILTERS },
                            status: 'active' as const,
                            shellId: newShellId
                        };
                    })
                    .filter((w): w is DataWire => w !== null);

                const shellConfig: ShellConfig = {
                    id: newShellId,
                    type: 'custom',
                    name: name || template.name,
                    description: template.description,
                    blocks,
                    wires,
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
            version: 1,
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                shells: state.shells,
                activeShellId: state.activeShellId,
                hotkeySlots: state.hotkeySlots,
                currentPersona: state.currentPersona,
                currentAesthetic: state.currentAesthetic
            }),
            // v0 → v1 (A1 wire unification): shells saved before A1 carry legacy
            // BlockConnection[] in `connections`; convert to DataWires once.
            migrate: (persistedState: unknown) => {
                const persisted = (persistedState || {}) as { shells?: ShellConfig[] } & Record<string, unknown>;
                if (Array.isArray(persisted.shells)) {
                    persisted.shells = persisted.shells.map(shell => {
                        if (shell.wires || !shell.connections) {
                            return { ...shell, wires: shell.wires ?? [], connections: undefined };
                        }
                        return {
                            ...shell,
                            wires: legacyConnectionsToWires(shell.connections, shell.id),
                            connections: undefined
                        };
                    });
                }
                return persisted;
            }
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
