'use client';

// ============================================
// PROJECT OMNI: PORT BADGE COMPONENT
// Visual indicators for typed block ports
// ============================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PortSchema, PortDataType } from '@/core/schemas/block.schema';
import { cn } from '@/lib/utils';

interface PortBadgeProps {
    port: PortSchema;
    connectionCount?: number;
    onClick?: () => void;
    className?: string;
    variant?: 'full' | 'compact'; // Support icon-only compact mode
    side?: 'left' | 'right'; // Which side of block (for tooltip positioning)
}

export function PortBadge({
    port,
    connectionCount = 0,
    onClick,
    className,
    variant = 'compact',
    side
}: PortBadgeProps) {
    const [isHovered, setIsHovered] = useState(false);

    const typeConfig = getPortTypeConfig(port.dataType);
    const isConnected = connectionCount > 0;

    // Determine tooltip side (left/right based on port direction if not specified)
    const tooltipSide = side || (port.direction === 'input' ? 'left' : 'right');

    // Compact variant: just icon + connection count
    if (variant === 'compact') {
        return (
            <div className="relative inline-block">
                <motion.button
                    onClick={onClick}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                        "port-badge-compact flex flex-col items-center gap-0.5 p-1 rounded transition-all",
                        className
                    )}
                    style={{
                        backgroundColor: isHovered ? `${typeConfig.color}25` : 'transparent',
                        color: typeConfig.color,
                    }}
                >
                    {/* Port icon */}
                    <span className="text-base leading-none">{typeConfig.icon}</span>

                    {/* Connection count (small badge below icon) */}
                    {isConnected && (
                        <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold"
                            style={{
                                backgroundColor: typeConfig.color,
                                color: '#000'
                            }}
                        >
                            {connectionCount}
                        </motion.span>
                    )}
                </motion.button>

                {/* Tooltip - slides in from the side */}
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, x: tooltipSide === 'left' ? -8 : 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: tooltipSide === 'left' ? -8 : 8 }}
                            transition={{ duration: 0.15 }}
                            className="absolute z-50 pointer-events-none"
                            style={{
                                top: '50%',
                                transform: 'translateY(-50%)',
                                [tooltipSide === 'left' ? 'left' : 'right']: '100%',
                                [tooltipSide === 'left' ? 'marginLeft' : 'marginRight']: '12px',
                                minWidth: '180px'
                            }}
                        >
                            <div
                                className="px-3 py-2 rounded-lg text-xs backdrop-blur-xl border shadow-xl"
                                style={{
                                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                                    borderColor: `${typeConfig.color}60`
                                }}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-base">{typeConfig.icon}</span>
                                    <span className="font-semibold text-white">
                                        {typeConfig.label} {port.direction === 'input' ? 'Input' : 'Output'}
                                    </span>
                                </div>
                                <div className="text-gray-300 text-[11px] space-y-0.5">
                                    {port.label && <div>• {port.label}</div>}
                                    {port.description && <div>• {port.description}</div>}
                                    <div>• Type: <span className="font-mono">{port.dataType}</span></div>
                                    {port.accepts && port.accepts.length > 1 && (
                                        <div>• Accepts: {port.accepts.join(', ')}</div>
                                    )}
                                    {isConnected && (
                                        <div className="mt-1 font-medium" style={{ color: typeConfig.color }}>
                                            ✓ {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
                                        </div>
                                    )}
                                    {onClick && (
                                        <div className="mt-1.5 text-blue-400 text-[10px]">
                                            → Click to configure
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Full variant: original design with label
    return (
        <div className="relative inline-block">
            <motion.button
                onClick={onClick}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "port-badge flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all",
                    "backdrop-blur-sm border",
                    isConnected && "ring-1",
                    className
                )}
                style={{
                    backgroundColor: `${typeConfig.color}15`,
                    borderColor: `${typeConfig.color}40`,
                    color: typeConfig.color,
                    ...(isConnected && {
                        ringColor: `${typeConfig.color}60`
                    })
                }}
            >
                {/* Port icon */}
                <span className="text-sm">{typeConfig.icon}</span>

                {/* Port type */}
                <span className="font-mono uppercase tracking-wide">
                    {port.dataType}
                </span>

                {/* Connection count */}
                {isConnected && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold"
                        style={{
                            backgroundColor: typeConfig.color,
                            color: '#000'
                        }}
                    >
                        {connectionCount}
                    </motion.span>
                )}
            </motion.button>

            {/* Tooltip on hover */}
            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.15 }}
                        className="absolute z-50 pointer-events-none"
                        style={{
                            [port.direction === 'input' ? 'bottom' : 'top']: 'calc(100% + 8px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            minWidth: '200px'
                        }}
                    >
                        <div
                            className="px-3 py-2 rounded-lg text-xs backdrop-blur-xl border shadow-lg"
                            style={{
                                backgroundColor: 'var(--citadel-bg)',
                                borderColor: `${typeConfig.color}40`
                            }}
                        >
                            <div className="font-semibold mb-1" style={{ color: typeConfig.color }}>
                                {port.label || port.id}
                            </div>
                            {port.description && (
                                <div className="text-[var(--text-muted)] mb-2">
                                    {port.description}
                                </div>
                            )}
                            <div className="text-[var(--text-muted)] text-[10px]">
                                <div>Direction: {port.direction}</div>
                                <div>Type: {port.dataType}</div>
                                {port.accepts && port.accepts.length > 1 && (
                                    <div>Accepts: {port.accepts.join(', ')}</div>
                                )}
                                {isConnected && (
                                    <div className="mt-1 font-medium" style={{ color: typeConfig.color }}>
                                        ✓ {connectionCount} connection{connectionCount !== 1 ? 's' : ''}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Arrow pointing to badge */}
                        <div
                            className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 border"
                            style={{
                                [port.direction === 'input' ? 'top' : 'bottom']: '-4px',
                                backgroundColor: 'var(--citadel-bg)',
                                borderColor: `${typeConfig.color}40`,
                                borderRight: 'none',
                                borderBottom: port.direction === 'input' ? 'none' : undefined,
                                borderTop: port.direction === 'output' ? 'none' : undefined
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * Get visual configuration for a port type
 */
function getPortTypeConfig(type: PortDataType): {
    color: string;
    icon: string;
    label: string;
} {
    switch (type) {
        case 'json':
            return {
                color: '#3B82F6', // Blue
                icon: '🔷',
                label: 'JSON'
            };
        case 'text':
            return {
                color: '#10B981', // Green
                icon: '📝',
                label: 'Text'
            };
        case 'media':
            return {
                color: '#8B5CF6', // Purple
                icon: '🎨',
                label: 'Media'
            };
        case 'any':
            return {
                color: '#6B7280', // Gray
                icon: '🔌',
                label: 'Any'
            };
        default:
            return {
                color: '#6B7280',
                icon: '❓',
                label: 'Unknown'
            };
    }
}

/**
 * Compact port indicator (just the icon)
 */
export function PortIndicator({ port, className }: { port: PortSchema; className?: string }) {
    const typeConfig = getPortTypeConfig(port.dataType);

    return (
        <span
            className={cn("inline-block text-sm", className)}
            title={`${port.label || port.id} (${port.dataType})`}
        >
            {typeConfig.icon}
        </span>
    );
}
