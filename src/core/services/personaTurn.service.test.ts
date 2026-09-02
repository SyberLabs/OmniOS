// ============================================
// PERSONA TURN — the visible read.
//
// A persona gathering context must light the wires that actually fed it.
// A connected empty source staying dark is the product teaching the user
// that provenance is honest, not decorative.
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBlockStore } from '@/core/stores/blockStore';
import { useWireStore } from '@/core/stores/wireStore';
import { useUIStore } from '@/core/stores/uiStore';
import { createPersonaBlockData, DEFAULT_WIRE_FILTERS } from '@/core/schemas/wire.schema';
import type { BlockInstance } from '@/core/schemas/block.schema';
import type { DataWire, ContextSource } from '@/core/schemas/wire.schema';
import type { PersonaTurnInput, PersonaTurnResult } from './persona.engine';

vi.mock('./persona.engine', () => ({
    streamPersonaTurn: vi.fn()
}));
import { streamPersonaTurn } from './persona.engine';
import { runPersonaTurn } from './personaTurn.service';

const PERSONA = 'persona_1';

function block(id: string, name: string, data: unknown): BlockInstance {
    return {
        instance_id: id,
        schema: { block_id: 'x', display_name: name, category: 'truth' },
        status: 'connected',
        last_updated: Date.now(),
        data,
        position: { x: 0, y: 0 },
        dimensions: { width: 1, height: 1 },
        shellId: 'root'
    } as unknown as BlockInstance;
}

function persona(): BlockInstance {
    return {
        instance_id: PERSONA,
        schema: { block_id: 'persona_analyst', display_name: 'Analyst', category: 'model' },
        status: 'connected',
        last_updated: Date.now(),
        data: createPersonaBlockData('analyst'),
        position: { x: 0, y: 0 },
        dimensions: { width: 320, height: 400 },
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

function mockStream(opts: {
    sources: ContextSource[];
    chunks?: string[];
    result?: Partial<PersonaTurnResult>;
    throwAfterPrepare?: Error;
}) {
    vi.mocked(streamPersonaTurn).mockImplementation(async function* (input: PersonaTurnInput) {
        input.onPrepared?.(opts.sources);
        if (opts.throwAfterPrepare) throw opts.throwAfterPrepare;
        for (const c of opts.chunks ?? ['ok']) yield c;
        return {
            success: true,
            content: (opts.chunks ?? ['ok']).join(''),
            sourceIds: opts.sources.map(s => s.id),
            sources: opts.sources,
            ...opts.result
        };
    });
}

beforeEach(() => {
    useBlockStore.setState({
        blocks: [
            persona(),
            block('fred', 'FRED Series', { value: 42 }),
            block('empty', 'Empty Feed', null)
        ],
        activeShellId: 'root'
    });
    useWireStore.setState({
        wires: [
            wire('w-fred', 'fred', PERSONA),
            wire('w-empty', 'empty', PERSONA)
        ]
    } as never);
    useUIStore.setState({ readingWireIds: [] });
});

describe('runPersonaTurn — reading wires are the contributing ones', () => {
    it('puts a contributing wire in readingWireIds and leaves an empty one dark', async () => {
        let during: string[] | undefined;
        mockStream({
            sources: [{ id: 'fred', kind: 'wire', label: 'FRED Series' }],
            chunks: ['token']
        });
        // Intercept setReadingWires so we can see the during-turn set
        // without racing the finally-clear.
        const original = useUIStore.getState().setReadingWires;
        useUIStore.setState({
            setReadingWires: (ids: string[]) => {
                if (ids.length > 0) during = ids;
                original(ids);
            }
        });

        await runPersonaTurn(PERSONA);

        expect(during).toEqual(['w-fred']);
        expect(during).not.toContain('w-empty');
    });

    it('clears readingWireIds after a successful turn', async () => {
        mockStream({
            sources: [{ id: 'fred', kind: 'wire', label: 'FRED Series' }]
        });
        await runPersonaTurn(PERSONA);
        expect(useUIStore.getState().readingWireIds).toEqual([]);
    });

    it('clears readingWireIds after a failed turn', async () => {
        mockStream({
            sources: [{ id: 'fred', kind: 'wire', label: 'FRED Series' }],
            throwAfterPrepare: new Error('stream died')
        });
        await runPersonaTurn(PERSONA);
        expect(useUIStore.getState().readingWireIds).toEqual([]);
    });
});
