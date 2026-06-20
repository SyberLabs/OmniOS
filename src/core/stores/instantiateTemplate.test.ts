import { describe, it, expect, beforeEach } from 'vitest';
// localStorage is polyfilled in vitest.setup.ts so the persisted stores load.
import { useShellStore, useBlockStore } from './index';
import { getShellTemplate, type ShellTemplate } from '../shells/templates';

const investor = getShellTemplate('tmpl_investor') as ShellTemplate;

describe('instantiateTemplate', () => {
    beforeEach(() => {
        useShellStore.setState({ shells: [], activeShellId: null });
        useBlockStore.setState({ blocks: [], connections: [], activeShellId: 'root' });
    });

    it('creates a fresh shell populated with all the template blocks', () => {
        const shellId = useShellStore.getState().instantiateTemplate(investor);
        expect(shellId).toBeTruthy();

        const blocks = useBlockStore.getState().getBlocksByShell(shellId!);
        expect(blocks).toHaveLength(investor.blocks.length);
        // Every block carries the new shell id and a real schema (recreated via registry).
        for (const b of blocks) {
            expect(b.shellId).toBe(shellId);
            expect(b.schema).toBeDefined();
        }
        // The shell is registered and active.
        expect(useShellStore.getState().shells.some(s => s.id === shellId)).toBe(true);
        expect(useBlockStore.getState().activeShellId).toBe(shellId);
    });

    it('remaps connections to the fresh instance ids (no dangling refs)', () => {
        const shellId = useShellStore.getState().instantiateTemplate(investor)!;
        const conns = useBlockStore.getState().getConnectionsByShell(shellId);
        const blockIds = new Set(useBlockStore.getState().getBlocksByShell(shellId).map(b => b.instance_id));

        expect(conns.length).toBe(investor.connections.length);
        for (const c of conns) {
            // Both endpoints point at real, newly-created block instances.
            expect(blockIds.has(c.sourceBlockId)).toBe(true);
            expect(blockIds.has(c.targetBlockId)).toBe(true);
            // Ports are preserved from the template.
            expect(typeof c.sourcePort).toBe('string');
            expect(typeof c.targetPort).toBe('string');
        }
    });

    it('produces independent copies on repeated use (distinct instance ids)', () => {
        const a = useShellStore.getState().instantiateTemplate(investor)!;
        const b = useShellStore.getState().instantiateTemplate(investor)!;
        expect(a).not.toBe(b);

        const idsA = useBlockStore.getState().getBlocksByShell(a).map(x => x.instance_id);
        const idsB = useBlockStore.getState().getBlocksByShell(b).map(x => x.instance_id);
        // No instance id is shared between the two spawned shells.
        expect(idsA.some(id => idsB.includes(id))).toBe(false);
    });

    it('applies the template persona and aesthetic to the new shell', () => {
        const shellId = useShellStore.getState().instantiateTemplate(investor)!;
        const shell = useShellStore.getState().shells.find(s => s.id === shellId)!;
        expect(shell.persona).toBe(investor.persona);
        expect(shell.aesthetic).toBe(investor.aesthetic);
        expect(shell.type).toBe('custom'); // a working copy, not a template
    });

    it('honors a custom name', () => {
        const shellId = useShellStore.getState().instantiateTemplate(investor, 'My Investor')!;
        const shell = useShellStore.getState().shells.find(s => s.id === shellId)!;
        expect(shell.name).toBe('My Investor');
    });
});
