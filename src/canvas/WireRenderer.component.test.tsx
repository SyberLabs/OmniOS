// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { WireRenderer } from './WireRenderer';
import { useBlockStore } from '@/core/stores/blockStore';
import { useWireStore } from '@/core/stores/wireStore';
import { useUIStore } from '@/core/stores/uiStore';
import { DEFAULT_WIRE_FILTERS } from '@/core/schemas/wire.schema';
import type { BlockInstance } from '@/core/schemas/block.schema';
import type { DataWire } from '@/core/schemas/wire.schema';

function block(id: string, x: number): BlockInstance {
    return {
        instance_id: id,
        schema: { block_id: 'x', display_name: id, category: 'truth' },
        status: 'connected',
        last_updated: Date.now(),
        data: { value: 1 },
        position: { x, y: 0 },
        dimensions: { width: 100, height: 80 },
        shellId: 'root'
    } as unknown as BlockInstance;
}

function wire(id: string, from: string, to: string): DataWire {
    return {
        id,
        sourceBlockId: from,
        targetBlockId: to,
        wireType: 'push',
        status: 'active',
        filters: { ...DEFAULT_WIRE_FILTERS },
        shellId: 'root',
        createdAt: Date.now()
    } as unknown as DataWire;
}

beforeEach(() => {
    useBlockStore.setState({
        blocks: [block('src', 0), block('dst', 300)],
        activeShellId: 'root'
    });
    useWireStore.setState({ wires: [wire('w-live', 'src', 'dst')] } as never);
    useUIStore.setState({ readingWireIds: [] });
});

describe('WireRenderer — the visible read', () => {
    it('marks a reading wire with data-reading, and leaves others unmarked', () => {
        // Assert the attribute, not pixels: motion is CSS; honesty is which
        // wire is flagged.
        useUIStore.setState({ readingWireIds: ['w-live'] });
        const { container } = render(<WireRenderer />);
        const marked = container.querySelector('[data-testid="wire"][data-reading="true"]');
        expect(marked).toBeTruthy();
        expect(marked?.getAttribute('data-wire-id')).toBe('w-live');
    });

    it('does not mark a wire that is not being read', () => {
        const { container } = render(<WireRenderer />);
        expect(container.querySelector('[data-reading="true"]')).toBeNull();
    });
});
