// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBlockStore } from '@/core/stores';
import type { BlockInstance } from '@/core/schemas/block.schema';

vi.mock('@/core/hooks', () => ({
    useOmniData: () => ({
        items: [],
        isLoading: false,
        error: null,
        refresh: () => undefined
    })
}));

import { useMetaculusBlock } from './MetaculusBlock';

const ID = 'metaculus_1';

beforeEach(() => {
    useBlockStore.setState({
        blocks: [{
            instance_id: ID,
            schema: { block_id: 'metaculus_forecast', display_name: 'Metaculus', category: 'truth' },
            status: 'disconnected',
            last_updated: null,
            data: null,
            position: { x: 0, y: 0 },
            dimensions: { width: 320, height: 240 },
            shellId: 'root'
        } as unknown as BlockInstance],
        activeShellId: 'root'
    });
});

describe('useMetaculusBlock: lastUpdated is the block\'s, not invented', () => {
    it('does not invent a timestamp when the block has never updated', () => {
        // Date.now() during render was a fake "just now" that hid a never-fetched block.
        const { result } = renderHook(() => useMetaculusBlock(ID));
        expect(result.current.lastUpdated).toBeNull();
    });

    it('reports the block\'s last_updated when it has one', () => {
        const ts = 1_700_000_000_000;
        useBlockStore.setState(s => ({
            blocks: s.blocks.map(b => b.instance_id === ID ? { ...b, last_updated: ts } : b)
        }));
        const { result } = renderHook(() => useMetaculusBlock(ID));
        expect(result.current.lastUpdated).toBe(ts);
    });
});
