'use client';

// ============================================
// PROJECT OMNI: GARDEN PORTAL BLOCK
// Mini-map visualization of the System Garden
// ============================================

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Hexagon, Maximize, ArrowRight } from 'lucide-react';
import { useCognitiveStore } from '@/core/stores';
import { SystemType } from '@/core/schemas/core.schema';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';

interface GardenPortalBlockProps {
    blockId: string;
    isSelected?: boolean;
}

// System color mapping
const SYSTEM_COLORS: Record<SystemType, string> = {
    health: 'var(--truth-red)',
    career: 'var(--truth-amber)',
    finance: 'var(--truth-green)',
    mind: 'var(--mind-aqua)',
    relationships: 'var(--citadel-primary)',
    environment: 'var(--citadel-secondary)',
    time: '#A855F7' // Purple for time
};

export function GardenPortalBlock({ blockId, isSelected }: GardenPortalBlockProps) {
    const router = useRouter();
    const { systems } = useCognitiveStore();

    // Memoize the radial points calculation
    const portalData = useMemo(() => {
        if (!systems || systems.length === 0) return [];

        const count = systems.length;
        const radius = 60;
        const center = { x: 100, y: 100 };

        return systems.map((sys, i) => {
            const angle = (i * 2 * Math.PI) / count - Math.PI / 2; // Start at top
            const value = sys.stabilityScore / 100;

            // Point position based on stability score (closer to center = lower score)
            const r = value * radius;
            const x = center.x + r * Math.cos(angle);
            const y = center.y + r * Math.sin(angle);

            // Outer rim position (max score)
            const outerX = center.x + radius * Math.cos(angle);
            const outerY = center.y + radius * Math.sin(angle);

            return {
                id: sys.id,
                name: sys.name,
                score: sys.stabilityScore,
                color: SYSTEM_COLORS[sys.id],
                x,
                y,
                outerX,
                outerY
            };
        });
    }, [systems]);

    // Generate SVG path for the stability polygon
    const polygonPath = useMemo(() => {
        if (portalData.length === 0) return '';
        return portalData.map((p, i) =>
            `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ') + ' Z';
    }, [portalData]);

    const handleEnterGarden = () => {
        router.push('/garden');
    };

    const [hoveredSystem, setHoveredSystem] = useState<{
        id: SystemType;
        name: string;
        score: number;
        x: number;
        y: number;
    } | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                "h-full flex flex-col rounded-lg overflow-hidden relative group",
                "bg-[var(--citadel-void)] border border-[var(--citadel-border)]",
                isSelected && "ring-2 ring-[var(--citadel-primary)]"
            )}
        >
            {/* Background Mesh Effect */}
            <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--citadel-primary)_0%,_transparent_70%)]" />

            {/* Slim Header */}
            <div className="flex items-center justify-between px-2 py-1 border-b border-[var(--citadel-border)]/50 z-10">
                <div className="flex items-center gap-1.5">
                    <Hexagon className="w-3.5 h-3.5 text-[var(--citadel-primary)]" />
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Systems
                    </span>
                </div>
                <button
                    onClick={handleEnterGarden}
                    className="p-1 rounded hover:bg-[var(--citadel-surface)] text-[var(--text-muted)] hover:text-[var(--citadel-primary)] transition-colors"
                    title="Open Garden"
                >
                    <Maximize className="w-3 h-3" />
                </button>
            </div>

            {/* Comparison Radar */}
            <div className="flex-1 relative flex items-center justify-center p-4">
                <svg viewBox="0 0 200 200" className="w-full h-full max-w-[240px] max-h-[240px]">
                    {/* Background Grid */}
                    <circle cx="100" cy="100" r="20" fill="none" stroke="var(--citadel-border)" strokeWidth="1" opacity="0.3" />
                    <circle cx="100" cy="100" r="40" fill="none" stroke="var(--citadel-border)" strokeWidth="1" opacity="0.3" />
                    <circle cx="100" cy="100" r="60" fill="none" stroke="var(--citadel-border)" strokeWidth="1" opacity="0.5" />

                    {/* Axes */}
                    {portalData.map((p) => (
                        <line
                            key={`axis-${p.id}`}
                            x1="100"
                            y1="100"
                            x2={p.outerX}
                            y2={p.outerY}
                            stroke="var(--citadel-border)"
                            strokeWidth="1"
                            opacity="0.3"
                        />
                    ))}

                    {/* Stability Polygon */}
                    <motion.path
                        d={polygonPath}
                        fill="var(--citadel-primary)"
                        fillOpacity="0.2"
                        stroke="var(--citadel-primary)"
                        strokeWidth="2"
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />

                    {/* System Points */}
                    {portalData.map((p) => (
                        <g
                            key={p.id}
                            onMouseEnter={() => setHoveredSystem({ ...p })}
                            onMouseLeave={() => setHoveredSystem(null)}
                            className="cursor-pointer"
                        >
                            <motion.circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                fill={p.color}
                                stroke="var(--citadel-void)"
                                strokeWidth="2"
                                whileHover={{ scale: 1.5 }}
                            />
                            {/* Hitbox for easier hovering */}
                            <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
                        </g>
                    ))}
                </svg>

                {/* Custom Tooltip Overlay */}
                {hoveredSystem && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute z-50 pointer-events-none"
                        style={{
                            // Simple relative positioning, can be refined
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            marginTop: '80px' // Offset below the chart
                        }}
                    >
                        <div className="bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-md px-3 py-2 shadow-xl backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SYSTEM_COLORS[hoveredSystem.id] }} />
                                <span className="text-xs font-semibold text-[var(--text-primary)]">{hoveredSystem.name}</span>
                            </div>
                            <div className="text-lg font-bold text-[var(--text-primary)] text-center">
                                {hoveredSystem.score}%
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] text-center uppercase tracking-wider">
                                Stability
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Slim Footer */}
            <div className="p-1.5 border-t border-[var(--citadel-border)]/50 z-10">
                <button
                    onClick={handleEnterGarden}
                    className="w-full flex items-center justify-center gap-1.5 py-1 rounded bg-[var(--citadel-surface)]/50 hover:bg-[var(--citadel-primary)]/10 border border-[var(--citadel-border)]/50 hover:border-[var(--citadel-primary)]/30 transition-all group"
                >
                    <span className="text-[10px] font-medium text-[var(--text-muted)] group-hover:text-[var(--citadel-primary)]">
                        Open Garden
                    </span>
                    <ArrowRight className="w-2.5 h-2.5 text-[var(--text-muted)] group-hover:text-[var(--citadel-primary)]" />
                </button>
            </div>
        </motion.div>
    );
}

export default GardenPortalBlock;
