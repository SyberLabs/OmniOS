// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ShellPanel } from './ShellPanel';
import { useShellStore, useBlockStore } from '@/core/stores';
import { useWireStore } from '@/core/stores/wireStore';
import { getShellTemplate } from '@/core/shells/templates';

describe('ShellPanel: Shell Store wiring (real stores)', () => {
    beforeEach(() => {
        useShellStore.setState({ shells: [], activeShellId: null });
        useBlockStore.setState({ blocks: [], activeShellId: 'root' });
        useWireStore.setState({ wires: [] } as never);
    });

    it('shows the Shell Store with the Investor and Researcher template cards', () => {
        render(<ShellPanel isOpen onClose={vi.fn()} />);
        expect(screen.getByText('Shell Store')).toBeTruthy();
        expect(screen.getByText('Investor Shell')).toBeTruthy();
        expect(screen.getByText('Researcher Shell')).toBeTruthy();
        expect(screen.getAllByRole('button', { name: 'Use this shell' })).toHaveLength(2);
        expect(screen.getAllByText('Works without API keys').length).toBeGreaterThanOrEqual(2);
    });

    it('"Use this shell" spawns a fully wired shell and closes the panel', () => {
        const onClose = vi.fn();
        render(<ShellPanel isOpen onClose={onClose} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Use this shell' })[0]);

        // Panel closes; a new shell is registered and ACTIVE on the canvas…
        expect(onClose).toHaveBeenCalled();
        const shellId = useBlockStore.getState().activeShellId;
        expect(shellId).not.toBe('root');

        // …with every template block created…
        const investor = getShellTemplate('tmpl_investor')!;
        expect(useBlockStore.getState().getBlocksByShell(shellId)).toHaveLength(investor.blocks.length);

        // …and LIVE wires in the single wire system (the A1 regression, at UI level).
        expect(useWireStore.getState().getWiresByShell(shellId)).toHaveLength(investor.connections.length);
    });
});
