'use client';

// ============================================
// PROJECT OMNI: SYSTEM SHELL VIEW
// A Canvas workspace for a specific System
// ============================================

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Settings, Zap } from 'lucide-react';
import { useCognitiveStore, useBlockStore, useUIStore } from '@/core/stores';
import { SystemType } from '@/core/schemas/core.schema';
import { blockRegistry } from '@/core/registry/BlockRegistry';
import { Canvas } from '@/canvas/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { cn } from '@/lib/utils';

export default function SystemShellPage() {
    const params = useParams();
    const router = useRouter();
    const systemId = params.id as SystemType;

    const {
        systems,
        systemShells,
        initializeSystems,
        activateSystemShell,
        deactivateSystemShell,
        getSystemShell,
        updateSystemVariable
    } = useCognitiveStore();

    const system = systems.find(s => s.id === systemId);
    const shell = systemShells[systemId];

    // Debug logging
    console.log('[SystemShellPage] systemId:', systemId);
    console.log('[SystemShellPage] systems:', systems);
    console.log('[SystemShellPage] systemShells:', systemShells);
    console.log('[SystemShellPage] system found:', system);
    console.log('[SystemShellPage] shell found:', shell);

    // Initialize systems if not already done
    useEffect(() => {
        if (systems.length === 0) {
            console.log('[SystemShellPage] Initializing systems...');
            initializeSystems();
        }
    }, [systems.length, initializeSystems]);

    // Activate shell on mount (only once when systemId is available)
    useEffect(() => {
        if (systemId) {
            console.log('[SystemShellPage] Activating shell:', systemId);
            activateSystemShell(systemId);
        }
        return () => {
            deactivateSystemShell();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [systemId]);

    // Block drag-drop handling
    const { addBlock, getBlocksByShell } = useBlockStore();
    const { setDraggingBlock } = useUIStore();
    const shellIdForBlocks = `system:${systemId}`;
    const shellBlocks = getBlocksByShell(shellIdForBlocks);

    // Handle native drag events from sidebar
    useEffect(() => {
        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            const blockId = e.dataTransfer?.getData('text/plain');

            if (blockId) {
                const schema = blockRegistry.get(blockId);
                if (schema) {
                    // Calculate drop position relative to canvas
                    const canvas = document.querySelector('.canvas-workspace');
                    if (canvas) {
                        const rect = canvas.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        addBlock(schema, { x: Math.max(0, x - 160), y: Math.max(0, y - 20) }, shellIdForBlocks);
                    }
                }
            }

            setDraggingBlock(null);
        };

        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            if (e.dataTransfer) {
                e.dataTransfer.dropEffect = 'copy';
            }
        };

        const canvas = document.querySelector('.canvas-workspace');
        if (canvas) {
            canvas.addEventListener('drop', handleDrop as EventListener);
            canvas.addEventListener('dragover', handleDragOver as EventListener);
        }

        return () => {
            if (canvas) {
                canvas.removeEventListener('drop', handleDrop as EventListener);
                canvas.removeEventListener('dragover', handleDragOver as EventListener);
            }
        };
    }, [addBlock, setDraggingBlock, shellIdForBlocks]);

    // Show loading while initializing
    if (systems.length === 0) {
        return (
            <div className="min-h-screen bg-[var(--citadel-void)] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse text-2xl mb-4">🌳</div>
                    <p className="text-[var(--text-muted)]">Initializing systems...</p>
                </div>
            </div>
        );
    }

    if (!system || !shell) {
        return (
            <div className="min-h-screen bg-[var(--citadel-void)] flex items-center justify-center">
                <div className="text-center">
                    <p className="text-[var(--text-muted)] mb-2">System not found: {systemId}</p>
                    <p className="text-xs text-[var(--text-muted)] mb-4">
                        Available systems: {systems.map(s => s.id).join(', ') || 'none'}
                    </p>
                    <Link href="/garden" className="text-[var(--citadel-primary)] hover:underline">
                        Back to Garden
                    </Link>
                </div>
            </div>
        );
    }

    const getStabilityColor = (score: number) => {
        if (score >= 80) return 'var(--truth-green)';
        if (score >= 60) return 'var(--truth-amber)';
        return 'var(--truth-red)';
    };

    return (
        <div className="h-screen bg-[var(--citadel-void)] flex flex-col overflow-hidden">
            {/* Header */}
            {/* Top Bar with Stability Badge */}
            <TopBar
                customRight={
                    <div className="flex items-center gap-4">
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border"
                            style={{
                                borderColor: `${getStabilityColor(system.stabilityScore)}40`,
                                backgroundColor: `${getStabilityColor(system.stabilityScore)}10`
                            }}
                        >
                            <div
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: getStabilityColor(system.stabilityScore) }}
                            />
                            <span
                                className="text-xs font-medium"
                                style={{ color: getStabilityColor(system.stabilityScore) }}
                            >
                                {system.stabilityScore}% Stable
                            </span>
                        </div>
                    </div>
                }
            >
                {/* Center: System Info - overridden by TopBar children if present, using this slot for summary */}
                <div className="hidden md:flex items-center gap-3">
                    <span className="text-xl">{system.icon}</span>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                            {system.name} Shell
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                            {shell.variables.length} Variables • Workspace active
                        </span>
                    </div>
                </div>
            </TopBar>

            {/* Main Content: Armory + Variables + Canvas */}
            <div className="flex flex-1 overflow-hidden">
                {/* Armory/Block Library */}
                <Sidebar />
                <aside className="w-64 border-r border-[var(--citadel-border)] bg-[var(--citadel-surface)] flex flex-col">
                    <div className="p-4 border-b border-[var(--citadel-border)]">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Variables</h2>
                            <button className="p-1 rounded hover:bg-[var(--citadel-elevated)] transition-colors">
                                <Plus className="w-4 h-4 text-[var(--text-muted)]" />
                            </button>
                        </div>
                        <p className="text-xs text-[var(--text-muted)]">
                            Track and compute system metrics
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {shell.variables.map((variable) => (
                            <motion.div
                                key={variable.id}
                                className="p-3 rounded-lg bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)]/30 transition-colors cursor-pointer"
                                whileHover={{ scale: 1.01 }}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-[var(--text-primary)]">
                                        {variable.name}
                                    </span>
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--citadel-primary)]/10 text-[var(--citadel-primary)]">
                                        {variable.source}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-lg font-bold text-[var(--mind-aqua-surface)]">
                                        {String(variable.value)}
                                        {variable.unit && <span className="text-xs ml-1 text-[var(--text-muted)]">{variable.unit}</span>}
                                    </span>
                                </div>
                                {variable.type === 'number' && variable.max && (
                                    <div className="mt-2 h-1 bg-[var(--citadel-void)] rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-[var(--mind-aqua-surface)] rounded-full transition-all"
                                            style={{ width: `${(Number(variable.value) / variable.max) * 100}%` }}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Exposed Outputs */}
                    <div className="p-4 border-t border-[var(--citadel-border)]">
                        <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1">
                            <Zap className="w-3 h-3" /> Exposed Outputs
                        </h3>
                        <div className="space-y-1">
                            {shell.exposedOutputs.map((output) => (
                                <div
                                    key={output.id}
                                    className="flex items-center justify-between text-xs p-2 rounded bg-[var(--citadel-elevated)]"
                                >
                                    <span className="text-[var(--text-muted)]">{output.name}</span>
                                    <span className="font-mono text-[var(--truth-green)]">
                                        {String(output.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>

                {/* Canvas - Isolated to this system's shell */}
                <main className="flex-1 overflow-hidden relative">
                    <Canvas shellId={`system:${systemId}`} hideEmptyState={true} />

                    {/* Empty State Overlay (if no blocks in this shell) */}
                    {shellBlocks.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="text-center">
                                <div className="text-4xl mb-4">{system.icon}</div>
                                <p className="text-[var(--text-muted)] mb-2">
                                    No blocks in this shell yet
                                </p>
                                <p className="text-xs text-[var(--text-muted)]">
                                    Drag blocks from the sidebar to build your {system.name} workflow
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
