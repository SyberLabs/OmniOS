// ============================================
// PROVENANCE — what actually fed a persona turn.
//
// The product's central claim is that a persona's context is inspectable.
// These lock the two ways that claim can quietly become false:
//   1. citing wires that carried no data (overstating the grounding), and
//   2. omitting ambient Mind pools (hiding a real input entirely).
// ============================================

import { describe, it, expect, beforeEach } from 'vitest';
import { aggregateWireContext } from './wire.service';
import { useBlockStore } from '@/core/stores';
import { useWireStore } from '@/core/stores/wireStore';
import { useMindStore } from '@/core/stores/mindStore';
import { DEFAULT_WIRE_FILTERS, DEFAULT_CONTEXT_SETTINGS } from '@/core/schemas/wire.schema';
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

const PERSONA = 'persona-1';

function seedPersona(contextSettings?: unknown) {
    return block(PERSONA, 'Analyst', {
        personaType: 'analyst',
        messages: [],
        memory: [],
        isCollapsed: false,
        isThinking: false,
        ...(contextSettings ? { contextSettings } : {})
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

describe('aggregateWireContext — ambient sources', () => {
    it('reports Mind observations as an ambient source, not a wire', () => {
        useMindStore.getState().addToPool('observations', {
            type: 'observation',
            content: 'Rates held steady.',
            importance: 0.8
        });

        useBlockStore.setState({
            blocks: [seedPersona({ ...DEFAULT_CONTEXT_SETTINGS, useGlobalObservations: true })],
            activeShellId: 'root'
        });

        const { sources } = aggregateWireContext(PERSONA);
        const ambient = sources.filter(s => s.kind === 'ambient');

        expect(ambient.map(s => s.id)).toContain('pool:observations');
        // The whole point: ambient context must never masquerade as a block.
        expect(ambient.every(s => s.kind === 'ambient')).toBe(true);
    });

    it('stays silent when the persona has not opted in', () => {
        useMindStore.getState().addToPool('observations', {
            type: 'observation',
            content: 'Should not leak into an opted-out persona.',
            importance: 0.8
        });

        useBlockStore.setState({
            blocks: [seedPersona({ ...DEFAULT_CONTEXT_SETTINGS, useGlobalObservations: false })],
            activeShellId: 'root'
        });

        expect(aggregateWireContext(PERSONA).sources.filter(s => s.kind === 'ambient')).toHaveLength(0);
    });

    it('an ambient-only persona still reports provenance (the invisible-input case)', () => {
        useMindStore.getState().addToPool('observations', {
            type: 'observation',
            content: 'Ambient only.',
            importance: 0.9
        });

        useBlockStore.setState({
            blocks: [seedPersona({ ...DEFAULT_CONTEXT_SETTINGS, useGlobalObservations: true })],
            activeShellId: 'root'
        });

        const { sources, sourceIds } = aggregateWireContext(PERSONA);
        // No wires at all, yet the answer is grounded in something — which is
        // exactly the case the UI used to render as "no sources".
        expect(sourceIds).toHaveLength(0);
        expect(sources.length).toBeGreaterThan(0);
    });
});
