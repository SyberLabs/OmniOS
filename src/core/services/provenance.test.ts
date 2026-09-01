// ============================================
// PROVENANCE — what actually fed a persona turn.
//
// The product's central claim is that a persona's context is inspectable.
// These lock the two ways that claim can quietly become false:
//   1. citing wires that carried no data (overstating the grounding), and
//   2. letting anything reach a prompt without arriving through a wire.
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { aggregateWireContext } from './wire.service';
import { useBlockStore } from '@/core/stores';
import { useWireStore } from '@/core/stores/wireStore';
import { DEFAULT_WIRE_FILTERS } from '@/core/schemas/wire.schema';
import type { BlockInstance } from '@/core/schemas/block.schema';
import type { DataWire } from '@/core/schemas/wire.schema';

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

function wire(id: string, from: string, to: string, status: DataWire['status'] = 'active'): DataWire {
    return {
        id,
        sourceBlockId: from,
        targetBlockId: to,
        wireType: 'data',
        status,
        filters: { ...DEFAULT_WIRE_FILTERS },
        shellId: 'root',
        createdAt: Date.now()
    } as unknown as DataWire;
}


function memoryBlock(id: string, name: string, contents: string[]): BlockInstance {
    return {
        instance_id: id,
        schema: { block_id: 'memory_pool', display_name: name, category: 'model' },
        status: 'connected',
        last_updated: Date.now(),
        data: {
            poolId: 'memory',
            limit: 10,
            entries: contents.map((content, i) => ({
                id: `${id}-e${i}`,
                type: 'memory',
                content,
                importance: 0.5,
                timestamp: Date.now()
            }))
        },
        position: { x: 0, y: 0 },
        dimensions: { width: 1, height: 1 },
        shellId: 'root'
    } as unknown as BlockInstance;
}

const PERSONA = 'persona-1';

function seedPersona() {
    return block(PERSONA, 'Analyst', {
        personaType: 'analyst',
        messages: [],
        memory: [],
        isCollapsed: false,
        isThinking: false
    });
}

beforeEach(() => {
    useBlockStore.setState({ blocks: [], activeShellId: 'root' });
    useWireStore.setState({ wires: [] });
});

describe('aggregateWireContext — wired sources', () => {
    it('names each contributing block, not just its id', () => {
        useBlockStore.setState({
            blocks: [seedPersona(), block('src-1', 'FRED Series', { value: 42 })],
            activeShellId: 'root'
        });
        useWireStore.setState({ wires: [wire('w1', 'src-1', PERSONA)] });

        const { sources } = aggregateWireContext(PERSONA);
        const wired = sources.filter(s => s.kind === 'wire');

        expect(wired).toHaveLength(1);
        expect(wired[0]).toMatchObject({ id: 'src-1', kind: 'wire', label: 'FRED Series' });
    });

    it('does NOT cite a connected wire whose source carried no data', () => {
        // The old UI recorded every connected wire, so an empty source still
        // appeared as grounding. Provenance has to mean "fed this answer".
        useBlockStore.setState({
            blocks: [seedPersona(), block('empty', 'Empty Feed', null)],
            activeShellId: 'root'
        });
        useWireStore.setState({ wires: [wire('w1', 'empty', PERSONA)] });

        const { sources } = aggregateWireContext(PERSONA);
        expect(sources.filter(s => s.kind === 'wire')).toHaveLength(0);
    });

    it('ignores wires that are not active', () => {
        useBlockStore.setState({
            blocks: [seedPersona(), block('src-1', 'Stale Source', { value: 1 })],
            activeShellId: 'root'
        });
        useWireStore.setState({ wires: [wire('w1', 'src-1', PERSONA, 'stale')] });

        expect(aggregateWireContext(PERSONA).sources).toHaveLength(0);
    });

    it('sources and sourceIds agree for wired blocks', () => {
        useBlockStore.setState({
            blocks: [
                seedPersona(),
                block('a', 'Alpha', { value: 1 }),
                block('b', 'Beta', { value: 2 })
            ],
            activeShellId: 'root'
        });
        useWireStore.setState({
            wires: [wire('w1', 'a', PERSONA), wire('w2', 'b', PERSONA)]
        });

        const { sources, sourceIds } = aggregateWireContext(PERSONA);
        expect(sources.filter(s => s.kind === 'wire').map(s => s.id)).toEqual(sourceIds);
    });
});

describe('aggregateWireContext — memory is wired, not injected', () => {
    it('a Memory block is cited by kind, distinct from live data', () => {
        useBlockStore.setState({
            blocks: [
                seedPersona(),
                block('src-fred', 'FRED Series', { value: 42 }),
                memoryBlock('mem-1', 'Long-term memory', ['Rates held steady.'])
            ],
            activeShellId: 'root'
        });
        useWireStore.setState({
            wires: [wire('w1', 'src-fred', PERSONA), wire('w2', 'mem-1', PERSONA)]
        });

        const { sources, context } = aggregateWireContext(PERSONA);

        expect(sources.find(s => s.id === 'src-fred')?.kind).toBe('wire');
        expect(sources.find(s => s.id === 'mem-1')?.kind).toBe('memory');
        expect(context).toContain('Rates held steady.');
    });

    it('cutting the wire removes the memory — the point of making it a block', () => {
        useBlockStore.setState({
            blocks: [seedPersona(), memoryBlock('mem-1', 'Long-term memory', ['Secret.'])],
            activeShellId: 'root'
        });
        useWireStore.setState({ wires: [wire('w1', 'mem-1', PERSONA)] });
        expect(aggregateWireContext(PERSONA).context).toContain('Secret.');

        useWireStore.setState({ wires: [] });
        const after = aggregateWireContext(PERSONA);
        expect(after.context).not.toContain('Secret.');
        expect(after.sources).toHaveLength(0);
    });

    it('an empty Memory block reports itself as empty, rather than vanishing', () => {
        useBlockStore.setState({
            blocks: [seedPersona(), memoryBlock('mem-1', 'Long-term memory', [])],
            activeShellId: 'root'
        });
        useWireStore.setState({ wires: [wire('w1', 'mem-1', PERSONA)] });

        // It formats to '(No entries)', which is real output — so it IS cited.
        // What matters is that the persona can see there is nothing in it.
        const { context } = aggregateWireContext(PERSONA);
        expect(context).toContain('(No entries)');
    });

    it('a persona with no wires at all is grounded in nothing', () => {
        useBlockStore.setState({ blocks: [seedPersona()], activeShellId: 'root' });
        useWireStore.setState({ wires: [] });

        const { sources, sourceIds } = aggregateWireContext(PERSONA);
        // Previously a hidden toggle could make this untrue without any
        // on-screen sign. There is no such path now.
        expect(sources).toHaveLength(0);
        expect(sourceIds).toHaveLength(0);
    });
});
