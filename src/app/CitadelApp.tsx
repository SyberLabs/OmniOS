'use client';

// ============================================
// PROJECT OMNI: MAIN APPLICATION
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@/canvas/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { CommandPalette } from '@/components/CommandPalette';
import { SkinModal } from '@/components/SkinModal';
import { Sprout } from 'lucide-react';
import Link from 'next/link';
import { ApiDashboardModal } from '@/components/ApiDashboard';
import { ShellPanel } from '@/components/ShellPanel';
import { MindPanel } from '@/components/mind';
import { MindDock } from '@/components/mind/MindDock';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ContextCaptureModal } from '@/components/mind/ContextCaptureModal';
import { EquilibriumDashboard } from '@/components/EquilibriumDashboard';
import { useBlockStore, useUIStore, useToolStore, useCognitiveStore } from '@/core/stores';
import { useApiStore } from '@/core/stores/apiStore';
import { blockRegistry } from '@/core/registry/BlockRegistry';
import { useMindShellSync, useShellNavigation } from '@/core/hooks';

export default function CitadelApp() {
    const { addBlock } = useBlockStore();
    const { draggingBlockId, setDraggingBlock } = useUIStore();
    const { activeTool, selection, captureSelection, clearSelection } = useToolStore();
    const { initializeDefaults } = useApiStore();
    const { initializeSystems } = useCognitiveStore();

    const [isMindOpen, setIsMindOpen] = useState(false);
    const [isSkinOpen, setIsSkinOpen] = useState(false);
    const [isApiOpen, setIsApiOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShellsOpen, setIsShellsOpen] = useState(false);
    const [isEquilibriumOpen, setIsEquilibriumOpen] = useState(false);

    // Initialize Mind-Shell synchronization
    const { mindStatus } = useMindShellSync();

    // Initialize shell keyboard navigation (Cmd+0-9)
    useShellNavigation();

    // Initialize default APIs and Systems
    useEffect(() => {
        initializeDefaults();
        initializeSystems();
    }, [initializeDefaults, initializeSystems]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8
            }
        })
    );

    // Global selection handler for Highlighter tool
    const handleMouseUp = useCallback(() => {
        if (activeTool !== 'highlighter') return;

        const windowSelection = window.getSelection();
        const text = windowSelection?.toString().trim();

        if (text && text.length > 0) {
            captureSelection({ text });
            // windowSelection?.removeAllRanges(); // Optional: clear selection
        }
    }, [activeTool, captureSelection]);
    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { over } = event;

        if (draggingBlockId && over?.id === 'canvas-drop-zone') {
            const schema = blockRegistry.get(draggingBlockId);
            if (schema) {
                // Add block at a reasonable position
                addBlock(schema, { x: 350, y: 100 });
            }
        }

        setDraggingBlock(null);
    }, [draggingBlockId, addBlock, setDraggingBlock]);

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
                        addBlock(schema, { x: Math.max(0, x - 160), y: Math.max(0, y - 20) });
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
    }, [addBlock, setDraggingBlock]);

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
                className={`flex flex-col h-screen overflow-hidden bg-[var(--citadel-void)] ${activeTool === 'highlighter' ? 'cursor-text' : ''}`}
                onMouseUp={handleMouseUp}
            >
                {/* Top Bar */}
                <TopBar
                    onOpenSkin={() => setIsSkinOpen(true)}
                    onOpenApi={() => setIsApiOpen(true)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    onOpenShells={() => setIsShellsOpen(true)}
                    onOpenEquilibrium={() => setIsEquilibriumOpen(true)}
                />

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar / Armory */}
                    <Sidebar />

                    {/* Canvas Workspace - Root Shell */}
                    <main className="flex-1 overflow-hidden relative">
                        <Canvas shellId="root" />

                        {/* Mind Dock - Always Visible */}
                        <MindDock onExpandPanel={() => setIsMindOpen(true)} />

                        {/* Garden FAB - Bottom Right */}
                        <Link
                            href="/garden"
                            className="absolute bottom-6 right-6 z-30 group"
                        >
                            <div className="flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-200">
                                <Sprout className="w-5 h-5" />
                                <span className="text-sm font-medium">Garden</span>
                            </div>
                        </Link>
                    </main>
                </div>

                {/* Command Palette */}
                <CommandPalette />

                {/* Shell Manager Panel */}
                <ShellPanel isOpen={isShellsOpen} onClose={() => setIsShellsOpen(false)} />

                {/* Mind Panel */}
                <MindPanel isOpen={isMindOpen} onClose={() => setIsMindOpen(false)} />

                {/* Skin Modal */}
                <SkinModal isOpen={isSkinOpen} onClose={() => setIsSkinOpen(false)} />

                {/* API Dashboard Modal */}
                <ApiDashboardModal isOpen={isApiOpen} onClose={() => setIsApiOpen(false)} />

                {/* Settings Panel */}
                <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

                {/* Equilibrium Dashboard Overlay */}
                <AnimatePresence>
                    {isEquilibriumOpen && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsEquilibriumOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100]"
                            />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-2xl pointer-events-none"
                            >
                                <div className="pointer-events-auto shadow-2xl shadow-indigo-500/20">
                                    <EquilibriumDashboard />
                                    <button 
                                        onClick={() => setIsEquilibriumOpen(false)}
                                        className="absolute top-4 right-4 text-slate-500 hover:text-white"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Context Capture Modal (for Highlighter tool) */}
                <ContextCaptureModal
                    isOpen={!!selection?.text}
                    onClose={clearSelection}
                    selectedText={selection?.text || ''}
                />
            </div>
        </DndContext>
    );
}


