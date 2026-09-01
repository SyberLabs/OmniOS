'use client';

import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@/canvas/Canvas';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { CommandPalette } from '@/components/CommandPalette';
import { SkinModal } from '@/components/SkinModal';
import { ApiDashboardModal } from '@/components/ApiDashboard';
import { ShellPanel } from '@/components/ShellPanel';
import { MindPanel } from '@/components/mind';
import { MindDock } from '@/components/mind/MindDock';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { ContextCaptureModal } from '@/components/mind/ContextCaptureModal';
import { useBlockStore, useUIStore, useToolStore } from '@/core/stores';
import { useApiStore } from '@/core/stores/apiStore';
import { blockRegistry } from '@/core/registry/BlockRegistry';
import { useMindShellSync, useShellNavigation } from '@/core/hooks';

export default function CitadelApp() {
    const { addBlock } = useBlockStore();
    const { setDraggingBlock } = useUIStore();
    const { activeTool, selection, captureSelection, clearSelection } = useToolStore();
    const { initializeDefaults } = useApiStore();

    const [isMindOpen, setIsMindOpen] = useState(false);
    const [isSkinOpen, setIsSkinOpen] = useState(false);
    const [isApiOpen, setIsApiOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isShellsOpen, setIsShellsOpen] = useState(false);

    useMindShellSync();
    useShellNavigation();

    useEffect(() => {
        initializeDefaults();
    }, [initializeDefaults]);

    const handleMouseUp = useCallback(() => {
        if (activeTool !== 'highlighter') return;

        const windowSelection = window.getSelection();
        const text = windowSelection?.toString().trim();

        if (text && text.length > 0) {
            captureSelection({ text });
        }
    }, [activeTool, captureSelection]);

    useEffect(() => {
        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            const blockId = e.dataTransfer?.getData('text/plain');

            if (blockId) {
                const schema = blockRegistry.get(blockId);
                if (schema) {
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
        <div
            className={`flex flex-col h-screen overflow-hidden bg-[var(--citadel-void)] ${activeTool === 'highlighter' ? 'cursor-text' : ''}`}
            onMouseUp={handleMouseUp}
        >
            <TopBar
                onOpenSkin={() => setIsSkinOpen(true)}
                onOpenApi={() => setIsApiOpen(true)}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenShells={() => setIsShellsOpen(true)}
            />

            <div className="flex flex-1 overflow-hidden">
                <Sidebar />

                <main className="flex-1 overflow-hidden relative">
                    <Canvas shellId="root" />
                    <MindDock onExpandPanel={() => setIsMindOpen(true)} />
                </main>
            </div>

            <CommandPalette />
            <ShellPanel isOpen={isShellsOpen} onClose={() => setIsShellsOpen(false)} />
            <MindPanel isOpen={isMindOpen} onClose={() => setIsMindOpen(false)} />
            <SkinModal isOpen={isSkinOpen} onClose={() => setIsSkinOpen(false)} />
            <ApiDashboardModal isOpen={isApiOpen} onClose={() => setIsApiOpen(false)} />
            <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            <ContextCaptureModal
                isOpen={!!selection?.text}
                onClose={clearSelection}
                selectedText={selection?.text || ''}
            />
        </div>
    );
}
