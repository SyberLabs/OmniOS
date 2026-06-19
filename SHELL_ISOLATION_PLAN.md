# Shell Persistence & Context Isolation - Implementation Plan

**Date:** January 12, 2026
**Status:** 🔄 Planning Phase
**Goal:** Full shell-to-shell independence with save/load/hotswap capabilities

---

## Overview

Implement **universal shell isolation** where each shell (System Shells, Custom Shells, Templates) is a completely independent workspace with its own blocks, wires, and memory context.

**Key Principle:** Any shell can be saved, loaded, duplicated, and hotswapped without affecting other shells.

**Core Features:**
1. ✅ Shell-scoped block storage (not just system shells)
2. ✅ Canvas filtering by active shell
3. ✅ Shell persistence (save/load/hotswap/duplicate)
4. ✅ Hotkey navigation (Cmd+1-9 for quick access)
5. ✅ Mind-Shell context isolation (per shell)
6. ✅ Custom shell creation (beyond 7 system shells)
7. ✅ Shell templates and marketplace-ready

---

## Current Architecture Analysis

### ✅ Already Implemented

**System Shell Structure:**
- 7 Life Systems defined (`SystemType` enum)
- `SystemShell` interface with `contextId` field
- `CognitiveStore` managing system shells
- Context pools for isolated observations/inferences
- Dedicated AI instances per system (`aiInstanceId`)
- Garden constellation view with navigation
- Dynamic routing: `/garden/system/[id]`

**Persistence Layer:**
- ShellStore with localStorage (`omni-shells`)
- CognitiveStore with localStorage (`omni-cognitive-core`)
- WireStore with localStorage (`omni-wires`)
- Mind context pools persisted

**UI Components:**
- SystemShellPage with dedicated canvas
- System info header, variables sidebar
- Exposed outputs panel
- Canvas already exists in system shell pages

### ❌ Gaps to Fill

1. **Block Schema** - No `contextId` field on `BlockInstance`
2. **Block Store** - Not persisted, no context filtering
3. **Canvas Component** - Renders all blocks globally, no filtering
4. **Wire Context** - Wires need `contextId` for isolation
5. **Hotkeys** - No Cmd+1-5 navigation implemented
6. **Shell Sync** - System shell blocks not linked to ShellConfig

---

## Implementation Roadmap

### Phase 1: Schema Updates (Foundation)

**Files to Modify:**
1. `src/core/schemas/block.schema.ts`
2. `src/core/schemas/wire.schema.ts`
3. `src/core/schemas/shell.schema.ts`

**Changes:**

#### 1.1 Enhanced Shell Schema

```typescript
// src/core/schemas/shell.schema.ts

export type ShellType =
    | 'root'           // Default home shell
    | 'system'         // One of the 7 life system shells
    | 'custom'         // User-created shell
    | 'template';      // Reusable template

export interface ShellConfig {
    /** Unique shell identifier */
    id: string;

    /** Shell type for categorization */
    type: ShellType;

    /** Display name */
    name: string;
    description?: string;

    /** For system shells: which system */
    systemType?: SystemType;  // 'health', 'career', etc.

    /** Active blocks with their positions */
    blocks: ShellBlockState[];

    /** Wired connections between blocks */
    connections: BlockConnection[];

    /** Active AI persona */
    persona: PersonaType;

    /** Visual aesthetic */
    aesthetic: AestheticTheme;

    /** Hotkey slot (1-9) for quick access */
    hotkeySlot?: number;

    /** Template metadata */
    isTemplate?: boolean;
    templateTags?: string[];

    createdAt: number;
    updatedAt: number;
    lastAccessedAt: number;
}
```

#### 1.2 Add shellId to BlockInstance

```typescript
// src/core/schemas/block.schema.ts

export interface BlockInstance {
    instance_id: string;
    schema: OmniBlockSchema;
    status: ConnectionStatus;
    last_updated: number | null;
    data: unknown;
    error?: string;
    position: { x: number; y: number };
    dimensions: { width: number; height: number };

    // NEW: Shell isolation (shellId is the primary isolation key)
    shellId: string;  // REQUIRED: ID of the shell this block belongs to
}
```

#### 1.3 Add shellId to DataWire

```typescript
// src/core/schemas/wire.schema.ts

export interface DataWire {
    id: string;
    sourceBlockId: string;
    targetBlockId: string;
    filters: WireFilters;
    status: WireStatus;
    createdAt: number;
    lastTransfer: number | null;

    // NEW: Shell isolation (shellId replaces contextId for consistency)
    shellId: string;  // REQUIRED: Wires belong to the same shell as their blocks
}
```

**Why:**
- Foundation for all shell filtering
- Enables per-shell block isolation
- Links blocks to ANY shell (system, custom, template)
- Prevents cross-shell wiring
- Consistent naming (shellId everywhere, not mixed contextId/shellId)

---

### Phase 2: Block Store Updates (Core Logic)

**File:** `src/core/stores/index.ts`

**Changes:**

#### 2.1 Update BlockState Interface

```typescript
interface BlockState {
    blocks: BlockInstance[];
    connections: BlockConnection[];

    // NEW: Active shell tracking
    activeShellId: string;  // "root", "system:health", "custom_xyz", etc.

    // UPDATED: Methods now accept shellId
    addBlock: (schema: OmniBlockSchema, position: Position, shellId?: string) => string;

    // NEW: Shell filtering methods
    getBlocksByShell: (shellId: string) => BlockInstance[];
    getConnectionsByShell: (shellId: string) => BlockConnection[];
    setActiveShell: (shellId: string) => void;
    clearShell: (shellId: string) => void;

    // Existing methods...
    removeBlock: (instanceId: string) => void;
    updatePosition: (instanceId: string, position: Position) => void;
    updateDimensions: (instanceId: string, dimensions: Dimensions) => void;
    updateData: (instanceId: string, data: unknown) => void;
    updateStatus: (instanceId: string, status: ConnectionStatus, error?: string) => void;
    addConnection: (sourceId: string, targetId: string) => string;
    removeConnection: (connectionId: string) => void;
    clearCanvas: () => void;  // Only clears active shell
}
```

#### 2.2 Add Persistence Middleware

```typescript
export const useBlockStore = create<BlockState>()(
    persist(
        (set, get) => ({
            blocks: [],
            connections: [],
            activeShellId: 'root',  // Default to root shell

            // NEW: Shell filtering
            getBlocksByShell: (shellId) => {
                return get().blocks.filter(b => b.shellId === shellId);
            },

            getConnectionsByShell: (shellId) => {
                const shellBlocks = get().getBlocksByShell(shellId);
                const shellBlockIds = new Set(shellBlocks.map(b => b.instance_id));

                return get().connections.filter(conn =>
                    shellBlockIds.has(conn.sourceId) &&
                    shellBlockIds.has(conn.targetId)
                );
            },

            setActiveShell: (shellId) => set({ activeShellId: shellId }),

            // UPDATED: addBlock with shellId
            addBlock: (schema, position, shellId) => {
                const instanceId = `${schema.block_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newBlock: BlockInstance = {
                    instance_id: instanceId,
                    schema,
                    status: 'idle',
                    last_updated: null,
                    data: null,
                    position,
                    dimensions: { width: 400, height: 300 },
                    shellId: shellId || get().activeShellId  // Use active shell
                };

                set(state => ({
                    blocks: [...state.blocks, newBlock]
                }));

                return instanceId;
            },

            // NEW: Clear only blocks in specific shell
            clearShell: (shellId) => {
                set(state => ({
                    blocks: state.blocks.filter(b => b.shellId !== shellId),
                    connections: state.connections.filter(conn => {
                        const sourceBlock = state.blocks.find(b => b.instance_id === conn.sourceId);
                        const targetBlock = state.blocks.find(b => b.instance_id === conn.targetId);
                        return sourceBlock?.shellId !== shellId &&
                               targetBlock?.shellId !== shellId;
                    })
                }));
            },

            // UPDATED: clearCanvas clears only active shell
            clearCanvas: () => {
                const activeShell = get().activeShellId;
                get().clearShell(activeShell);
            },

            // ... existing methods remain the same
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
```

#### 2.3 Update Wire Store with Shell Support

```typescript
// src/core/stores/wireStore.ts

export const useWireStore = create<WireState>()(
    persist(
        (set, get) => ({
            wires: [],

            // UPDATED: Add shellId to wires
            addWire: (sourceBlockId, targetBlockId, filters, shellId) => {
                const wireId = `wire_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newWire: DataWire = {
                    id: wireId,
                    sourceBlockId,
                    targetBlockId,
                    filters: filters || {},
                    status: 'active',
                    createdAt: Date.now(),
                    lastTransfer: null,
                    shellId: shellId || useBlockStore.getState().activeShellId
                };

                set(state => ({ wires: [...state.wires, newWire] }));
                return wireId;
            },

            // NEW: Shell filtering
            getWiresByShell: (shellId) => {
                return get().wires.filter(w => w.shellId === shellId);
            },

            // ... existing methods
        }),
        {
            name: 'omni-wires',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ wires: state.wires })
        }
    )
);
```

**Why:**
- Enables shell-aware block CRUD operations
- Automatic shell assignment on block creation
- Filtered queries for canvas rendering
- Persistence with localStorage
- Prevents accidental cross-shell operations
- Works for ANY shell type (system, custom, template)

---

### Phase 3: Canvas Shell Filtering (UI Layer)

**File:** `src/canvas/Canvas.tsx`

**Changes:**

#### 3.1 Accept shellId Prop

```typescript
interface CanvasProps {
    hideEmptyState?: boolean;
    shellId?: string;  // NEW: Filter blocks by shell
}

export function Canvas({ hideEmptyState = false, shellId }: CanvasProps) {
    const {
        blocks,
        updatePosition,
        removeBlock,
        getBlocksByShell,
        getConnectionsByShell,
        activeShellId,
        setActiveShell
    } = useBlockStore();

    // NEW: Use shellId or fallback to active shell
    const currentShell = shellId || activeShellId;

    // NEW: Filter blocks and connections by shell
    const shellBlocks = useMemo(
        () => getBlocksByShell(currentShell),
        [blocks, currentShell]
    );

    const shellConnections = useMemo(
        () => getConnectionsByShell(currentShell),
        [connections, shellBlocks, currentShell]
    );

    // Set active shell when canvas mounts
    useEffect(() => {
        if (shellId) {
            setActiveShell(shellId);
        }
    }, [shellId, setActiveShell]);

    // ... rest of component uses shellBlocks instead of blocks

    return (
        <DndContext>
            {/* Render only blocks in this shell */}
            {shellBlocks.map(block => (
                <DraggableBlock
                    key={block.instance_id}
                    id={block.instance_id}
                    // ...
                />
            ))}

            {/* Render only connections in this shell */}
            <WireRenderer connections={shellConnections} />
        </DndContext>
    );
}
```

**Why:**
- Canvas only shows blocks for current shell
- Prevents visual clutter from other shells
- Enables true workspace isolation
- Supports both explicit shellId and global active shell
- Works for ANY shell type (system, custom, template)

---

### Phase 4: Shell Save/Load/Hotswap (Universal Shell Persistence)

**Files:**
- `src/core/stores/index.ts` (ShellStore enhancements)
- `src/app/garden/system/[id]/page.tsx` (System shell integration)
- `src/app/CitadelApp.tsx` (Root shell integration)

**Changes:**

#### 4.1 Universal Shell Save/Load

```typescript
// src/core/stores/index.ts - ShellStore enhancements

export const useShellStore = create<ShellState>()(
    persist(
        (set, get) => ({
            shells: [],
            activeShellId: 'root',
            hotkeySlots: {},  // NEW: Map hotkey (1-9) → shellId

            // NEW: Save ANY shell (system, custom, template)
            saveShell: (shellId: string, metadata?: Partial<ShellConfig>) => {
                const blocks = useBlockStore.getState().getBlocksByShell(shellId);
                const connections = useBlockStore.getState().getConnectionsByShell(shellId);
                const wires = useWireStore.getState().getWiresByShell(shellId);

                const shellConfig: ShellConfig = {
                    id: shellId,
                    type: metadata?.type || 'custom',
                    name: metadata?.name || `Shell ${Date.now()}`,
                    description: metadata?.description,
                    systemType: metadata?.systemType,  // Only for system shells
                    blocks: blocks.map(b => ({
                        instanceId: b.instance_id,
                        blockId: b.schema.block_id,
                        position: b.position,
                        dimensions: b.dimensions,
                        data: b.data
                    })),
                    connections: connections.map(c => ({
                        id: c.id,
                        sourceId: c.sourceId,
                        targetId: c.targetId
                    })),
                    persona: metadata?.persona || 'analyst',
                    aesthetic: metadata?.aesthetic || get().currentAesthetic,
                    hotkeySlot: metadata?.hotkeySlot,
                    isTemplate: metadata?.isTemplate,
                    templateTags: metadata?.templateTags,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    lastAccessedAt: Date.now()
                };

                set(state => ({
                    shells: [...state.shells.filter(s => s.id !== shellId), shellConfig]
                }));

                return shellConfig;
            },

            // NEW: Load ANY shell
            loadShell: (shellId: string) => {
                const shell = get().shells.find(s => s.id === shellId);
                if (!shell) return false;

                // Clear existing blocks in target shell
                useBlockStore.getState().clearShell(shellId);

                // Recreate blocks
                const blockIdMap = new Map<string, string>();
                shell.blocks.forEach(blockState => {
                    const schema = blockRegistry.get(blockState.blockId);
                    if (!schema) return;

                    const newId = useBlockStore.getState().addBlock(
                        schema,
                        blockState.position,
                        shellId
                    );

                    blockIdMap.set(blockState.instanceId, newId);
                    useBlockStore.getState().updateDimensions(newId, blockState.dimensions);
                    useBlockStore.getState().updateData(newId, blockState.data);
                });

                // Recreate connections
                shell.connections.forEach(conn => {
                    const newSourceId = blockIdMap.get(conn.sourceId);
                    const newTargetId = blockIdMap.get(conn.targetId);
                    if (newSourceId && newTargetId) {
                        useBlockStore.getState().addConnection(newSourceId, newTargetId);
                    }
                });

                // Update last accessed
                set(state => ({
                    shells: state.shells.map(s =>
                        s.id === shellId ? { ...s, lastAccessedAt: Date.now() } : s
                    ),
                    activeShellId: shellId
                }));

                return true;
            },

            // NEW: Duplicate shell (for templates)
            duplicateShell: (sourceShellId: string, name?: string) => {
                const source = get().shells.find(s => s.id === sourceShellId);
                if (!source) return null;

                const newShellId = `shell_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

                // Save as new shell
                return get().saveShell(newShellId, {
                    ...source,
                    id: newShellId,
                    name: name || `${source.name} (Copy)`,
                    type: 'custom',
                    isTemplate: false,
                    hotkeySlot: undefined  // Don't copy hotkey
                });
            },

            // NEW: Assign shell to hotkey slot
            assignHotkey: (shellId: string, slot: number) => {
                if (slot < 1 || slot > 9) return false;

                set(state => ({
                    hotkeySlots: { ...state.hotkeySlots, [slot]: shellId },
                    shells: state.shells.map(s =>
                        s.id === shellId ? { ...s, hotkeySlot: slot } : s
                    )
                }));

                return true;
            },

            // ... existing methods
        }),
        {
            name: 'omni-shells',
            storage: createJSONStorage(() => localStorage)
        }
    )
);
```

#### 4.2 System Shell Integration

```typescript
// src/app/garden/system/[id]/page.tsx

export default function SystemShellPage({ params }: { params: { id: string } }) {
    const systemType = params.id as SystemType;
    const shellId = `system:${systemType}`;

    const { systemShells } = useCognitiveStore();
    const systemShell = systemShells[systemType];

    return (
        <div className="system-shell-page">
            <SystemShellHeader system={systemShell} />
            <VariablesSidebar variables={systemShell.variables} />

            {/* Canvas filtered by system shell */}
            <Canvas shellId={shellId} hideEmptyState={false} />

            <ExposedOutputsPanel outputs={systemShell.exposedOutputs} />
        </div>
    );
}
```

#### 4.3 Root Shell Integration

```typescript
// src/app/CitadelApp.tsx

export function CitadelApp() {
    return (
        <div className="citadel-app">
            <Sidebar />

            {/* Root canvas */}
            <Canvas shellId="root" />

            <MindPanel />
        </div>
    );
}
```

**Why:**
- Universal save/load works for ANY shell type
- Supports custom shells beyond 7 system shells
- Enables shell duplication for templates
- Hotkey slot assignment (1-9)
- Persistent shell configs with metadata
- Shell-to-shell independence (not just root ↔ system)

---

### Phase 5: Hotkey Navigation (Cmd+1-9)

**File:** Create new `src/core/hooks/useShellNavigation.ts`

#### 5.1 Shell Navigation Hook with Custom Assignment

```typescript
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useShellStore, useBlockStore } from '@/core/stores';
import { SystemType } from '@/core/schemas/core.schema';

// Default system shell mappings (can be overridden by user)
const DEFAULT_SYSTEM_SHORTCUTS: Record<string, SystemType> = {
    '1': 'health',
    '2': 'career',
    '3': 'finance',
    '4': 'mind',
    '5': 'relationships',
    '6': 'environment',
    '7': 'time'
};

export function useShellNavigation() {
    const router = useRouter();
    const { hotkeySlots } = useShellStore();
    const { setActiveShell } = useBlockStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd+0 for root/home
            if ((e.metaKey || e.ctrlKey) && e.key === '0') {
                e.preventDefault();
                setActiveShell('root');
                router.push('/');
                return;
            }

            // Cmd+1 through Cmd+9 for shell slots
            if ((e.metaKey || e.ctrlKey) && /^[1-9]$/.test(e.key)) {
                e.preventDefault();
                const slot = parseInt(e.key, 10);

                // Check if user assigned a custom shell to this slot
                const customShellId = hotkeySlots[slot];
                if (customShellId) {
                    setActiveShell(customShellId);
                    // Navigate to custom shell page (future enhancement)
                    // router.push(`/shell/${customShellId}`);
                    return;
                }

                // Fall back to default system shell mapping
                const systemType = DEFAULT_SYSTEM_SHORTCUTS[e.key];
                if (systemType) {
                    const shellId = `system:${systemType}`;
                    setActiveShell(shellId);
                    router.push(`/garden/system/${systemType}`);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [router, hotkeySlots, setActiveShell]);
}
```

#### 5.2 Integrate in Root Layout

```typescript
// src/app/CitadelApp.tsx

export function CitadelApp() {
    useShellNavigation();  // NEW: Enable hotkey navigation
    useMindShellSync();    // Existing

    // ... rest of component
}
```

**Hotkey Map (Default):**
```
Cmd+0 → Home (root shell)
Cmd+1 → Health System (or custom shell if assigned)
Cmd+2 → Career System (or custom shell if assigned)
Cmd+3 → Finance System (or custom shell if assigned)
Cmd+4 → Mind System (or custom shell if assigned)
Cmd+5 → Relationships System (or custom shell if assigned)
Cmd+6 → Environment System (or custom shell if assigned)
Cmd+7 → Time System (or custom shell if assigned)
Cmd+8 → Custom shell slot (user assignable)
Cmd+9 → Custom shell slot (user assignable)
Cmd+K → Command Palette (existing)
```

**Custom Assignment UI (Future Phase 6):**
```typescript
// Example: User can assign any shell to slots 1-9
useShellStore.getState().assignHotkey('my_trading_shell', 8);
// Now Cmd+8 navigates to custom trading shell
```

**Why:**
- Instant navigation between ANY shell (system or custom)
- Expandable beyond 7 system shells
- User-customizable hotkey assignments
- Familiar keyboard-first UX (like browser tabs)
- Complements existing Cmd+K command palette
- No mouse required for shell switching

---

### Phase 6: Custom Shell Creation UI

**Files:**
- Create `src/components/shells/ShellManager.tsx`
- Create `src/components/shells/CreateShellDialog.tsx`
- Update Sidebar with shell management

**Changes:**

#### 6.1 Shell Manager Component

```typescript
// src/components/shells/ShellManager.tsx

import { useShellStore, useBlockStore } from '@/core/stores';
import { Plus, Save, Upload, Copy, Pin } from 'lucide-react';

export function ShellManager() {
    const { shells, saveShell, loadShell, duplicateShell, assignHotkey } = useShellStore();
    const { activeShellId } = useBlockStore();

    const handleSaveCurrentShell = () => {
        saveShell(activeShellId, {
            name: prompt('Shell name:') || undefined,
            description: prompt('Description:') || undefined
        });
    };

    return (
        <div className="shell-manager">
            <h3>Shell Management</h3>

            {/* Quick Actions */}
            <div className="shell-actions">
                <button onClick={handleSaveCurrentShell}>
                    <Save /> Save Current Shell
                </button>
                <button onClick={() => {/* Open create dialog */}}>
                    <Plus /> New Custom Shell
                </button>
            </div>

            {/* Shell List */}
            <div className="shell-list">
                {shells.map(shell => (
                    <div key={shell.id} className="shell-item">
                        <span>{shell.name}</span>
                        <span className="shell-type">{shell.type}</span>

                        {/* Actions */}
                        <button onClick={() => loadShell(shell.id)}>
                            <Upload /> Load
                        </button>
                        <button onClick={() => duplicateShell(shell.id)}>
                            <Copy /> Duplicate
                        </button>
                        <button onClick={() => {
                            const slot = prompt('Hotkey slot (1-9):');
                            if (slot) assignHotkey(shell.id, parseInt(slot));
                        }}>
                            <Pin /> Assign Hotkey
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

#### 6.2 Create Shell Dialog

```typescript
// src/components/shells/CreateShellDialog.tsx

export function CreateShellDialog({ onClose }: { onClose: () => void }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [persona, setPersona] = useState<PersonaType>('analyst');
    const [aesthetic, setAesthetic] = useState<AestheticTheme>('matrix');

    const handleCreate = () => {
        const shellId = `custom_${Date.now()}`;
        useShellStore.getState().saveShell(shellId, {
            type: 'custom',
            name,
            description,
            persona,
            aesthetic
        });
        useBlockStore.getState().setActiveShell(shellId);
        onClose();
    };

    return (
        <dialog>
            <h2>Create Custom Shell</h2>

            <input
                placeholder="Shell Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />

            <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />

            <select value={persona} onChange={(e) => setPersona(e.target.value as PersonaType)}>
                <option value="analyst">Analyst</option>
                <option value="architect">Architect</option>
                {/* ... other personas */}
            </select>

            <select value={aesthetic} onChange={(e) => setAesthetic(e.target.value as AestheticTheme)}>
                <option value="matrix">Matrix</option>
                <option value="neon">Neon</option>
                {/* ... other aesthetics */}
            </select>

            <button onClick={handleCreate}>Create Shell</button>
            <button onClick={onClose}>Cancel</button>
        </dialog>
    );
}
```

#### 6.3 Sidebar Integration

```typescript
// Add Shell Manager to Sidebar
<Sidebar>
    {/* Existing sections */}
    <CommandPalette />
    <BlockLibrary />

    {/* NEW: Shell Management */}
    <ShellManager />
</Sidebar>
```

**Why:**
- User-friendly UI for shell management
- Create custom shells beyond 7 systems
- Save/load/duplicate any shell
- Assign custom shells to hotkeys
- Template creation for reusable workflows

---

### Phase 7: Mind-Shell Isolation (Optional Enhancement)

**File:** `src/core/hooks/useMindShellSync.ts`

**Status:** Lower priority - Mind can work globally initially

#### 7.1 Scope Sync by Active Shell (Future)

```typescript
export function useMindShellSync() {
    const { blocks, activeShellId } = useBlockStore();
    const { addToPool } = useMindStore();
    const { knowledgeGraph } = useCognitiveStore();

    // Filter blocks by active shell
    const shellBlocks = useMemo(
        () => blocks.filter(b => b.shellId === activeShellId),
        [blocks, activeShellId]
    );

    useEffect(() => {
        // Only sync blocks in active shell
        shellBlocks.forEach(block => {
            if (!block.data) return;

            // Determine shell pool ID
            const poolId = activeShellId.startsWith('system:')
                ? `pool_${activeShellId.replace('system:', '')}`
                : `pool_${activeShellId}`;

            // Add to shell-specific pool
            const summary = extractBlockSummary(block);
            if (summary) {
                addToPool('observations', {
                    content: summary,
                    source: block.instance_id,
                    timestamp: Date.now(),
                    shellPoolId: poolId  // Scoped to shell
                });
            }

            // Extract entities for knowledge graph (tracks origin)
            const entities = extractEntities(block.data);
            entities.forEach(entity => {
                knowledgeGraph.addNode({
                    id: entity.id,
                    label: entity.name,
                    type: entity.type,
                    sourceBlock: block.instance_id,
                    shellId: activeShellId  // Track origin shell
                });
            });
        });
    }, [shellBlocks, activeShellId]);
}
```

**Why:**
- Observations scoped to each shell
- Prevents cross-contamination between shells
- Knowledge graph tracks entity origin
- Each shell's Mind sees only its data
- Can start with global Mind, add this later if needed

---

## Implementation Checklist

### Phase 1: Schema Updates ⚡ REQUIRED
- [ ] Add `shellId: string` (required) to `BlockInstance`
- [ ] Add `shellId: string` (required) to `DataWire`
- [ ] Enhance `ShellConfig` with `type`, `hotkeySlot`, `isTemplate`, `templateTags`
- [ ] Update all TypeScript imports

### Phase 2: Block Store ⚡ REQUIRED
- [ ] Add `activeShellId: string` to BlockState
- [ ] Implement `getBlocksByShell(shellId)`
- [ ] Implement `getConnectionsByShell(shellId)`
- [ ] Implement `setActiveShell(shellId)`
- [ ] Implement `clearShell(shellId)`
- [ ] Update `addBlock()` to accept `shellId` parameter
- [ ] Add persistence middleware (localStorage)
- [ ] Update WireStore with `shellId` support

### Phase 3: Canvas Filtering ⚡ REQUIRED
- [ ] Add `shellId?: string` prop to Canvas
- [ ] Filter blocks by shell in render
- [ ] Filter connections by shell
- [ ] Set active shell on mount
- [ ] Update all Canvas usage sites

### Phase 4: Shell Save/Load/Hotswap ⚡ REQUIRED
- [ ] Implement `saveShell(shellId, metadata)` in ShellStore
- [ ] Implement `loadShell(shellId)` with block recreation
- [ ] Implement `duplicateShell(sourceShellId, name)`
- [ ] Implement `assignHotkey(shellId, slot)`
- [ ] Update SystemShellPage to use `shellId`
- [ ] Update CitadelApp to use `shellId="root"`

### Phase 5: Hotkey Navigation ⚡ REQUIRED
- [ ] Create `useShellNavigation` hook
- [ ] Implement Cmd+0 (root) handler
- [ ] Implement Cmd+1-9 handlers with custom slot support
- [ ] Integrate in CitadelApp
- [ ] Test keyboard navigation

### Phase 6: Custom Shell UI 🔮 OPTIONAL (Future)
- [ ] Create `ShellManager` component
- [ ] Create `CreateShellDialog` component
- [ ] Add shell list with load/duplicate/assign actions
- [ ] Integrate in Sidebar
- [ ] Add shell templates marketplace

### Phase 7: Mind-Shell Isolation 🔮 OPTIONAL (Future)
- [ ] Update `useMindShellSync` with shell filtering
- [ ] Scope observations to shell pools
- [ ] Track entity origin shell
- [ ] Test cross-shell isolation

---

## Testing Plan

### Unit Tests

**Block Store:**
```typescript
test('blocks are isolated by shell', () => {
    const store = useBlockStore.getState();

    const healthBlock = store.addBlock(schema, pos, 'system:health');
    const financeBlock = store.addBlock(schema, pos, 'system:finance');
    const customBlock = store.addBlock(schema, pos, 'custom_trading');

    const healthBlocks = store.getBlocksByShell('system:health');
    const financeBlocks = store.getBlocksByShell('system:finance');
    const customBlocks = store.getBlocksByShell('custom_trading');

    expect(healthBlocks).toHaveLength(1);
    expect(financeBlocks).toHaveLength(1);
    expect(customBlocks).toHaveLength(1);
    expect(healthBlocks[0].instance_id).toBe(healthBlock);
});

test('shell save/load preserves state', () => {
    const store = useShellStore.getState();

    // Add blocks to custom shell
    useBlockStore.getState().addBlock(schema1, pos1, 'custom_test');
    useBlockStore.getState().addBlock(schema2, pos2, 'custom_test');

    // Save shell
    store.saveShell('custom_test', { name: 'Test Shell' });

    // Clear shell
    useBlockStore.getState().clearShell('custom_test');
    expect(useBlockStore.getState().getBlocksByShell('custom_test')).toHaveLength(0);

    // Load shell
    store.loadShell('custom_test');
    expect(useBlockStore.getState().getBlocksByShell('custom_test')).toHaveLength(2);
});
```

### Integration Tests

**Canvas Rendering:**
1. Open Home → Add block → Verify `shellId="root"`
2. Navigate to Health Shell → Verify Root block NOT visible
3. Add block in Health Shell → Verify `shellId="system:health"`
4. Navigate back to Home → Verify Health block NOT visible
5. Press Cmd+1 → Verify navigates to Health Shell
6. Press Cmd+0 → Verify returns to Home

**Custom Shells:**
1. Create custom shell "Trading Workspace"
2. Add blocks to custom shell
3. Assign to hotkey slot 8
4. Press Cmd+8 → Navigate to custom shell
5. Verify only custom shell blocks visible

**Persistence:**
1. Add blocks to Health system shell
2. Add blocks to custom shell
3. Refresh page
4. Verify both shells restored with correct blocks
5. Check localStorage → Verify blocks have `shellId`

**Hotswap:**
1. Save Finance shell state as "Finance v1"
2. Modify Finance shell (add/remove blocks)
3. Save as "Finance v2"
4. Load "Finance v1" → Verify original state restored
5. Load "Finance v2" → Verify modified state loaded

**Shell Duplication:**
1. Create custom shell with complex setup
2. Duplicate shell
3. Verify duplicate has all blocks/connections
4. Modify duplicate → Verify original unaffected

---

## Migration Strategy

### For Existing Users

**Step 1: Backfill shellId**
```typescript
// Run migration on app load (in CitadelApp or layout)
function migrateBlocksToShells() {
    const blockStore = useBlockStore.getState();
    const wireStore = useWireStore.getState();

    let migrationNeeded = false;

    // Migrate blocks without shellId
    blockStore.blocks.forEach(block => {
        if (!block.shellId) {
            // Assign all existing blocks to "root"
            block.shellId = 'root';
            migrationNeeded = true;
        }
    });

    // Migrate wires without shellId
    wireStore.wires.forEach(wire => {
        if (!wire.shellId) {
            wire.shellId = 'root';
            migrationNeeded = true;
        }
    });

    if (migrationNeeded) {
        console.log('Migrated blocks and wires to root shell');
    }
}
```

**Step 2: Set Default Active Shell**
```typescript
// Ensure activeShellId is set
const blockStore = useBlockStore.getState();
if (!blockStore.activeShellId) {
    blockStore.setActiveShell('root');
}
```

**Step 3: Inform Users (Optional)**
- Show one-time notification: "Your workspace has been migrated to support multiple shells!"
- Highlight new features:
  - "Press Cmd+1-7 to navigate between Life System shells"
  - "Create custom shells for specialized workflows"
  - "Save and load shell states for experimentation"

---

## Success Metrics

### Core Functionality (Phases 1-5)
- ✅ Blocks in different shells are isolated (not visible across shells)
- ✅ Hotkeys navigate between shells instantly (Cmd+0-9)
- ✅ Blocks persist across page refreshes
- ✅ Shell save/load works for ANY shell (system, custom, template)
- ✅ No cross-shell wire connections
- ✅ Canvas renders only active shell blocks
- ✅ Custom shells can be created and saved
- ✅ Custom shells assignable to hotkey slots 1-9

### Advanced Features (Phases 6-7)
- 🔮 Shell Manager UI for browsing/managing shells
- 🔮 Template marketplace for reusable shell configs
- 🔮 Mind observations scoped to active shell (optional)

---

## Future Enhancements

### Phase 8: Shell Templates & Marketplace
- **Predefined templates** for common workflows:
  - "Trading Dashboard" (Polymarket + Analyst + Mind)
  - "Research Workspace" (Web blocks + Knowledge graph)
  - "Media Production" (Image/Video blocks + Output)
- **Template sharing** between users
- **One-click template instantiation**
- **Template versioning** and updates

### Phase 9: Cross-Shell References
- **"Link" blocks** across shells (read-only view)
- **Cross-shell wire connections** (opt-in, with visual indicators)
- **Unified search** across all shells
- **Shell-aware command palette** (search blocks in all shells)

### Phase 10: Shell History & Time Travel
- **Undo/redo** shell states
- **Auto-snapshots** at key moments
- **Time-travel debugging** for block data
- **Shell version control** (Git-like branching)
- **Compare shell states** side-by-side

### Phase 11: Collaborative Shells
- **Multi-user shell editing** (real-time collaboration)
- **Shell permissions** (read-only, edit, admin)
- **Shell comments & annotations**
- **Activity feed** for shell changes

---

**Next Steps:**
1. ✅ Review and approve this plan (Updated for universal shell independence)
2. 🎯 Begin Phase 1 implementation (schema updates with `shellId`)
3. 🎯 Implement Phases 2-5 (core shell isolation features)
4. 🔮 Consider Phases 6-7 (UI enhancements, optional)
5. Test each phase incrementally
6. Document API changes for developers

**Estimated Timeline:**
- **Phases 1-3** (Foundation): 2-3 hours
- **Phases 4-5** (Save/Load/Hotkeys): 2-3 hours
- **Phase 6** (Shell Manager UI): 2-4 hours (optional)
- **Phase 7** (Mind Isolation): 1-2 hours (optional)

**Total Core Implementation:** 4-6 hours

**Status:** ✅ Plan Complete - Ready for Phase 1 Implementation

---

**Architecture Summary:**

```
┌─────────────────────────────────────────────────────┐
│              OMNI OS SHELL ARCHITECTURE             │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Root Shell (root)                                  │
│  ├─ Default workspace                               │
│  └─ Cmd+0 hotkey                                    │
│                                                     │
│  System Shells (7)                                  │
│  ├─ system:health     → Cmd+1                       │
│  ├─ system:career     → Cmd+2                       │
│  ├─ system:finance    → Cmd+3                       │
│  ├─ system:mind       → Cmd+4                       │
│  ├─ system:relationships → Cmd+5                    │
│  ├─ system:environment → Cmd+6                      │
│  └─ system:time       → Cmd+7                       │
│                                                     │
│  Custom Shells (unlimited)                          │
│  ├─ custom_trading    → Cmd+8 (user assigned)      │
│  ├─ custom_research   → Cmd+9 (user assigned)      │
│  └─ custom_*          → Save/Load/Duplicate         │
│                                                     │
│  Templates (shareable)                              │
│  └─ template_*        → One-click instantiation     │
│                                                     │
├─────────────────────────────────────────────────────┤
│             ISOLATION MECHANISM                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  BlockInstance.shellId → "root" | "system:*" | ...  │
│  DataWire.shellId → matches blocks' shellId         │
│  Canvas.shellId → filters visible blocks            │
│  BlockStore.activeShellId → current workspace       │
│                                                     │
│  ✓ Full block isolation per shell                  │
│  ✓ Wire connections scoped to shell                │
│  ✓ Save/Load/Hotswap any shell                     │
│  ✓ Persistent across refreshes                     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

**Last Updated:** January 12, 2026
**Architecture:** Universal Shell-to-Shell Independence
**Status:** 📋 Planning Complete → Ready for Implementation
