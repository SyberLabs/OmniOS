'use client';

// ============================================
// PROJECT OMNI: DRAG-AND-DROP CANVAS
// ============================================

import { useCallback, useRef, useState, useEffect, useMemo } from 'react';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    useDraggable,
    useDroppable,
    PointerSensor,
    useSensor,
    useSensors
} from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { useBlockStore, useSettingsStore, useUIStore } from '@/core/stores';
import { BlockCard } from '@/components/blocks/BlockCard';
import { WireRenderer } from './WireRenderer';
import { snapToGrid, cn } from '@/lib/utils';
import { getBlockView } from '@/core/registry/ViewRegistry';

interface CanvasProps {
    hideEmptyState?: boolean;
    shellId?: string; // Optional shell ID for filtering blocks
}

export function Canvas({ hideEmptyState = false, shellId }: CanvasProps) {
    const {
        blocks,
        updatePosition,
        removeBlock,
        getBlocksByShell,
        activeShellId,
        setActiveShell
    } = useBlockStore();
    const { gridSnapping, gridSize } = useSettingsStore();
    const { draggingBlockId, setSelectedBlock, selectedBlockId } = useUIStore();
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [dragDelta, setDragDelta] = useState<{ x: number; y: number } | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Hydration fix: only render dynamic content after mount
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Use shellId prop or fallback to active shell
    const currentShell = shellId || activeShellId;

    // Filter blocks and connections by shell (only after mount to avoid hydration mismatch)
    const shellBlocks = useMemo(
        () => hasMounted ? getBlocksByShell(currentShell) : [],
        [blocks, currentShell, getBlocksByShell, hasMounted]
    );

    // Set active shell when shellId prop changes
    useEffect(() => {
        if (shellId && shellId !== activeShellId) {
            setActiveShell(shellId);
        }
    }, [shellId, activeShellId, setActiveShell]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        })
    );

    // Droppable canvas area
    const { setNodeRef: setDropRef, isOver } = useDroppable({
        id: 'canvas-drop-zone'
    });

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
        setDragDelta({ x: 0, y: 0 });
    };

    const handleDragMove = (event: any) => {
        if (event.delta) {
            setDragDelta({ x: event.delta.x, y: event.delta.y });
        }
    };

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActiveDragId(null);
        setDragDelta(null);
        const { active, delta } = event;

        if (!delta) return;

        const blockId = active.id as string;
        const block = shellBlocks.find(b => b.instance_id === blockId);

        if (block) {
            let newX = block.position.x + delta.x;
            let newY = block.position.y + delta.y;

            if (gridSnapping) {
                newX = snapToGrid(newX, gridSize);
                newY = snapToGrid(newY, gridSize);
            }

            // Ensure blocks stay within bounds
            newX = Math.max(0, newX);
            newY = Math.max(0, newY);

            updatePosition(blockId, { x: newX, y: newY });
        }
    }, [shellBlocks, gridSnapping, gridSize, updatePosition]);

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
        >
            <div
                ref={(node) => {
                    canvasRef.current = node;
                    setDropRef(node);
                }}
                className={cn(
                    "canvas-workspace relative",
                    isOver && draggingBlockId && "ring-2 ring-inset ring-[var(--citadel-primary)]/30"
                )}
            >
                {/* Grid overlay */}
                <div className="canvas-grid" />

                {/* Blocks - filtered by shell */}
                {shellBlocks.map(block => (
                    <DraggableBlock
                        key={block.instance_id}
                        id={block.instance_id}
                        isDragging={activeDragId === block.instance_id}
                        isSelected={selectedBlockId === block.instance_id}
                        onSelect={() => setSelectedBlock(block.instance_id)}
                        onClose={() => removeBlock(block.instance_id)}
                    />
                ))}

                {/* Wire connections layer - filtered by shell */}
                <WireRenderer
                    activeDragId={activeDragId}
                    dragDelta={dragDelta}
                    shellId={currentShell}
                />

                {/* Drop indicator when dragging from Armory */}
                {draggingBlockId && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <div className="text-[var(--text-muted)] text-sm bg-[var(--citadel-surface)]/80 px-4 py-2 rounded-lg backdrop-blur-sm">
                            Drop to add block
                        </div>
                    </motion.div>
                )}

                {/* Empty state - shell-aware */}
                {shellBlocks.length === 0 && !draggingBlockId && !hideEmptyState && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <div className="text-[var(--text-muted)] text-lg mb-2">
                                Your Canvas is Empty
                            </div>
                            <p className="text-[var(--text-muted)]/60 text-sm max-w-md">
                                Drag blocks from the Armory sidebar to start building your cognitive workspace.
                                <br />
                                Press <kbd className="px-2 py-0.5 bg-[var(--citadel-surface)] rounded text-xs font-mono">⌘K</kbd> to open the command palette.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </DndContext>
    );
}

// ============================================
// DRAGGABLE BLOCK COMPONENT
// ============================================

interface DraggableBlockProps {
    id: string;
    isDragging: boolean;
    isSelected: boolean;
    onSelect: () => void;
    onClose: () => void;
}

function DraggableBlock({ id, isDragging, isSelected, onSelect, onClose }: DraggableBlockProps) {
    const { blocks, updateDimensions, updatePosition } = useBlockStore();
    const block = blocks.find(b => b.instance_id === id);
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState<{
        x: number; y:
        number;
        width: number; height: number;
        posX: number; posY: number;
        handle: string
    } | null>(null);

    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id,
        disabled: isResizing // Disable drag while resizing
    });

    // Handle resize start
    const handleResizeStart = useCallback((e: React.MouseEvent, handle: string) => {
        e.stopPropagation();
        e.preventDefault();
        if (!block) return;

        setIsResizing(true);
        setResizeStart({
            x: e.clientX,
            y: e.clientY,
            width: block.dimensions.width,
            height: block.dimensions.height,
            posX: block.position.x,
            posY: block.position.y,
            handle
        });
    }, [block]);

    // Handle resize move and end
    useEffect(() => {
        if (!isResizing || !resizeStart || !block) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - resizeStart.x;
            const deltaY = e.clientY - resizeStart.y;

            let newWidth = resizeStart.width;
            let newHeight = resizeStart.height;
            let newX = resizeStart.posX;
            let newY = resizeStart.posY;

            // Apply resize based on handle position
            // East (right) edge - increase width
            if (resizeStart.handle.includes('e')) {
                newWidth = Math.max(200, resizeStart.width + deltaX);
            }
            // West (left) edge - increase width AND move left
            if (resizeStart.handle.includes('w')) {
                const proposedWidth = resizeStart.width - deltaX;
                if (proposedWidth >= 200) {
                    newWidth = proposedWidth;
                    newX = resizeStart.posX + deltaX;
                }
            }
            // South (bottom) edge - increase height
            if (resizeStart.handle.includes('s')) {
                newHeight = Math.max(150, resizeStart.height + deltaY);
            }
            // North (top) edge - increase height AND move up
            if (resizeStart.handle.includes('n')) {
                const proposedHeight = resizeStart.height - deltaY;
                if (proposedHeight >= 150) {
                    newHeight = proposedHeight;
                    newY = resizeStart.posY + deltaY;
                }
            }

            // Update dimensions
            updateDimensions(id, { width: newWidth, height: newHeight });

            // Update position if needed (for left/top edge drags)
            if (resizeStart.handle.includes('w') || resizeStart.handle.includes('n')) {
                updatePosition(id, { x: newX, y: newY });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            setResizeStart(null);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, resizeStart, block, id, updateDimensions]);

    if (!block) return null;

    const style = {
        position: 'absolute' as const,
        left: block.position.x,
        top: block.position.y,
        transform: transform
            ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
            : undefined,
        zIndex: isDragging ? 100 : isSelected ? 50 : 1
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={onSelect}
            {...attributes}
            className={cn(
                "group relative",
                isSelected && "ring-2 ring-[var(--citadel-primary)]",
                isResizing && "ring-2 ring-[var(--mind-aqua-surface)]"
            )}
        >
            <BlockCard
                block={block}
                isDragging={isDragging}
                onClose={onClose}
                dragListeners={listeners}
            >
                <BlockContent block={block} />
            </BlockCard>

            {/* Resize handles - right, bottom, and SE corner only for intuitive feel */}
            {(isSelected || isResizing) && (
                <>
                    {/* Bottom edge handle */}
                    <div
                        className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize hover:bg-[var(--citadel-primary)]/50 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 's')}
                    />
                    {/* Right edge handle */}
                    <div
                        className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize hover:bg-[var(--citadel-primary)]/50 transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'e')}
                    />

                    {/* SE corner handle - most intuitive */}
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-[var(--citadel-primary)]/40 hover:bg-[var(--citadel-primary)] rounded-tl-sm transition-colors"
                        onMouseDown={(e) => handleResizeStart(e, 'se')}
                    >
                        {/* Resize grip visual */}
                        <svg className="w-full h-full p-0.5" viewBox="0 0 10 10" fill="currentColor" opacity="0.7">
                            <circle cx="7" cy="7" r="1.2" />
                            <circle cx="4" cy="7" r="1.2" />
                            <circle cx="7" cy="4" r="1.2" />
                        </svg>
                    </div>
                </>
            )}
        </div>
    );
}

// ============================================
// BLOCK CONTENT RENDERER
// ============================================

interface BlockContentProps {
    block: ReturnType<typeof useBlockStore.getState>['blocks'][0];
}

function BlockContent({ block }: BlockContentProps) {
    const View = getBlockView(block.schema.block_id);

    if (View) {
        return <View instanceId={block.instance_id} />;
    }

    return (
        <div className="p-4 text-center text-[var(--text-muted)]">
            <p>Block type: {block.schema.display_name}</p>
            <p className="text-xs mt-1">Coming in future phase</p>
        </div>
    );
}

export default Canvas;
