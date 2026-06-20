import { describe, it, expect, beforeEach } from 'vitest';
// localStorage is polyfilled in vitest.setup.ts.
import { useShellStore, useBlockStore } from './index';
import { getShellTemplate, type ShellTemplate } from '../shells/templates';

const investor = getShellTemplate('tmpl_investor') as ShellTemplate;

describe('shell workflow — createShell', () => {
    beforeEach(() => {
        useShellStore.setState({ shells: [], activeShellId: null });
        useBlockStore.setState({ blocks: [], connections: [], activeShellId: 'root' });
    });

    it('creates an EMPTY shell (not a copy of the current canvas)', () => {
        // Populate the current canvas first.
        useShellStore.getState().instantiateTemplate(investor);
        expect(useBlockStore.getState().blocks.length).toBeGreaterThan(0);

        const newShell = useShellStore.getState().createShell('Blank', 'desc');

        // The new shell has no blocks of its own...
        expect(newShell.blocks).toEqual([]);
        expect(newShell.connections).toEqual([]);
        // ...and the canvas (which follows the active shell) is now empty.
        expect(useBlockStore.getState().activeShellId).toBe(newShell.id);
        expect(useBlockStore.getState().getBlocksByShell(newShell.id)).toHaveLength(0);
    });

    it('does not destroy the previous shell’s blocks', () => {
        const spawnedId = useShellStore.getState().instantiateTemplate(investor)!;
        const before = useBlockStore.getState().getBlocksByShell(spawnedId).length;
        expect(before).toBeGreaterThan(0);

        useShellStore.getState().createShell('Blank');

        // Old shell's blocks still exist (just not shown on the canvas).
        expect(useBlockStore.getState().getBlocksByShell(spawnedId)).toHaveLength(before);
    });
});

describe('shell workflow — deleteShell', () => {
    beforeEach(() => {
        useShellStore.setState({ shells: [], activeShellId: null });
        useBlockStore.setState({ blocks: [], connections: [], activeShellId: 'root' });
    });

    it('removes the shell and clears its orphaned blocks', () => {
        const id = useShellStore.getState().instantiateTemplate(investor)!;
        expect(useBlockStore.getState().getBlocksByShell(id).length).toBeGreaterThan(0);

        useShellStore.getState().deleteShell(id);

        // Shell gone, and its blocks no longer linger in the block store.
        expect(useShellStore.getState().shells.some(s => s.id === id)).toBe(false);
        expect(useBlockStore.getState().getBlocksByShell(id)).toHaveLength(0);
    });

    it('falls back to root on the canvas when deleting the active shell', () => {
        const id = useShellStore.getState().instantiateTemplate(investor)!;
        expect(useBlockStore.getState().activeShellId).toBe(id);

        useShellStore.getState().deleteShell(id);

        expect(useBlockStore.getState().activeShellId).toBe('root');
    });

    it('leaves the canvas alone when deleting a non-active shell', () => {
        const a = useShellStore.getState().instantiateTemplate(investor)!; // becomes active
        const b = useShellStore.getState().instantiateTemplate(investor)!; // now active
        expect(useBlockStore.getState().activeShellId).toBe(b);

        useShellStore.getState().deleteShell(a); // delete the non-active one

        // Canvas still on b; b's blocks intact.
        expect(useBlockStore.getState().activeShellId).toBe(b);
        expect(useBlockStore.getState().getBlocksByShell(b).length).toBeGreaterThan(0);
    });
});
