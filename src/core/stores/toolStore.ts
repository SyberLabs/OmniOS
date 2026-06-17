// ============================================
// PROJECT OMNI: TOOL STORE
// Global state for Shell/Canvas tools
// ============================================

import { create } from 'zustand';

// ============================================
// TYPES
// ============================================

export type ToolType = 'navigate' | 'highlighter';

export interface SelectionData {
    text: string;
    sourceBlockId?: string;
    sourceBlockType?: string;
}

interface ToolState {
    activeTool: ToolType;
    selection: SelectionData | null;
}

interface ToolActions {
    setTool: (tool: ToolType) => void;
    captureSelection: (data: SelectionData) => void;
    clearSelection: () => void;
}

type ToolStore = ToolState & ToolActions;

// ============================================
// STORE
// ============================================

export const useToolStore = create<ToolStore>((set) => ({
    // Initial State
    activeTool: 'navigate',
    selection: null,

    // Actions
    setTool: (tool) => set({ activeTool: tool }),

    captureSelection: (data) => set({ selection: data }),

    clearSelection: () => set({ selection: null }),
}));

// ============================================
// KEYBOARD SHORTCUTS HOOK (Optional)
// ============================================

export function useToolShortcuts() {
    const setTool = useToolStore((s) => s.setTool);

    // useEffect(() => {
    //     const handleKeyDown = (e: KeyboardEvent) => {
    //         if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    //         if (e.key === 'v' || e.key === 'V') setTool('navigate');
    //         if (e.key === 'h' || e.key === 'H') setTool('highlighter');
    //     };
    //     window.addEventListener('keydown', handleKeyDown);
    //     return () => window.removeEventListener('keydown', handleKeyDown);
    // }, [setTool]);

    return { setTool };
}
