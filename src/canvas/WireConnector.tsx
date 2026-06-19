'use client';

// ============================================
// PROJECT OMNI: WIRE CONNECTOR
// Interactive wire creation by dragging
// ============================================

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plug, Zap } from 'lucide-react';
import { useBlockStore } from '@/core/stores';
import { useWireStore } from '@/core/stores/wireStore';
import { wireService } from '@/core/services/wire.service';
import { cn } from '@/lib/utils';

interface WireConnectorProps {
    blockId: string;
    /** Position of the block */
    position: { x: number; y: number };
    /** Dimensions of the block */
    dimensions: { width: number; height: number };
    /** Whether this block can be a wire source */
    canBeSource?: boolean;
    /** Whether this block can be a wire target */
    canBeTarget?: boolean;
}

/**
 * Wire connection ports for a block
 * Shows source (output) and target (input) ports
 */
export function WireConnector({
    blockId,
    position,
    dimensions,
    canBeSource = true,
    canBeTarget = true
}: WireConnectorProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
    const [dragEnd, setDragEnd] = useState<{ x: number; y: number } | null>(null);
    const [isHovering, setIsHovering] = useState(false);
    const connectorRef = useRef<HTMLDivElement>(null);

    const getWiresFromBlock = useWireStore(state => state.getWiresFromBlock);
    const getWiresToBlock = useWireStore(state => state.getWiresToBlock);

    const outgoingWires = getWiresFromBlock(blockId);
    const incomingWires = getWiresToBlock(blockId);

    // Source port (right edge, middle)
    const sourcePortPosition = {
        x: position.x + dimensions.width,
        y: position.y + dimensions.height / 2
    };

    // Target port (left edge, middle)
    const targetPortPosition = {
        x: position.x,
        y: position.y + dimensions.height / 2
    };

    const handleSourceDragStart = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        setDragStart(sourcePortPosition);
        setDragEnd(sourcePortPosition);

        const handleMouseMove = (moveEvent: MouseEvent) => {
            setDragEnd({
                x: moveEvent.clientX + window.scrollX,
                y: moveEvent.clientY + window.scrollY
            });
        };

        const handleMouseUp = (upEvent: MouseEvent) => {
            // Check if we're over a valid target
            const targetElement = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
            const targetPort = targetElement?.closest('[data-wire-target]');

            if (targetPort) {
                const targetBlockId = targetPort.getAttribute('data-wire-target');
                if (targetBlockId && targetBlockId !== blockId) {
                    // Create the wire
                    wireService.createWire(blockId, targetBlockId);
                }
            }

            setIsDragging(false);
            setDragStart(null);
            setDragEnd(null);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [blockId, sourcePortPosition]);

    return (
        <>
            {/* Source Port (Output) - Right side */}
            {canBeSource && (
                <div
                    className={cn(
                        "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-20",
                        "wire-port wire-port-source",
                        outgoingWires.length > 0 && "wire-port-active"
                    )}
                    onMouseDown={handleSourceDragStart}
                    onMouseEnter={() => setIsHovering(true)}
                    onMouseLeave={() => setIsHovering(false)}
                    title={`${outgoingWires.length} outgoing connection(s)`}
                >
                    <div className="relative">
                        <Zap className="w-4 h-4" />
                        {outgoingWires.length > 0 && (
                            <div className="absolute -top-1 -right-1 bg-[var(--citadel-primary)] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                {outgoingWires.length}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Target Port (Input) - Left side */}
            {canBeTarget && (
                <div
                    className={cn(
                        "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-20",
                        "wire-port wire-port-target",
                        incomingWires.length > 0 && "wire-port-active"
                    )}
                    data-wire-target={blockId}
                    title={`${incomingWires.length} incoming connection(s)`}
                >
                    <div className="relative">
                        <Plug className="w-4 h-4" />
                        {incomingWires.length > 0 && (
                            <div className="absolute -top-1 -right-1 bg-[var(--truth-green)] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                                {incomingWires.length}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Active drag preview line */}
            {isDragging && dragStart && dragEnd && (
                <svg
                    className="fixed inset-0 pointer-events-none"
                    style={{ zIndex: 1000, width: '100%', height: '100%' }}
                >
                    <defs>
                        <filter id="wire-drag-glow">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feMerge>
                                <feMergeNode in="blur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>
                    <motion.line
                        x1={dragStart.x}
                        y1={dragStart.y}
                        x2={dragEnd.x}
                        y2={dragEnd.y}
                        stroke="var(--citadel-primary)"
                        strokeWidth={3}
                        strokeDasharray="5,5"
                        strokeLinecap="round"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ filter: 'url(#wire-drag-glow)' }}
                    />
                    <circle
                        cx={dragEnd.x}
                        cy={dragEnd.y}
                        r={6}
                        fill="var(--citadel-primary)"
                        style={{ filter: 'url(#wire-drag-glow)' }}
                    />
                </svg>
            )}

            {/* Hover tooltip */}
            <AnimatePresence>
                {isHovering && !isDragging && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute right-0 top-1/2 translate-x-full -translate-y-1/2 ml-3 z-30 pointer-events-none"
                    >
                        <div className="bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] shadow-lg backdrop-blur-sm whitespace-nowrap">
                            Drag to connect to another block
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default WireConnector;
