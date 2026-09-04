// ============================================
// MIND ENGINE: the Mind panel's think path.
//
// Persona turns do not go through here (those are personaTurn.service).
// This still has to fail closed, never leave status stuck on processing,
// and write the answer into observations rather than a hidden prompt path.
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MindEngine } from './mind.engine';
import { useMindStore } from '@/core/stores/mindStore';
import { useBlockStore } from '@/core/stores/blockStore';
import { createInitialMindState } from '@/core/schemas/mind.schema';
import type { BlockInstance } from '@/core/schemas/block.schema';
import { runTurn } from '@/core/cognition';

vi.mock('@/core/cognition', () => ({
    runTurn: vi.fn(),
    runTurnStream: vi.fn()
}));

function seedBlock() {
    const block: BlockInstance = {
        instance_id: 'b1',
        schema: { block_id: 'hackernews_feed', display_name: 'Hacker News', category: 'pulse' },
        status: 'connected',
        last_updated: Date.now(),
        data: { items: [{ title: 'Story' }] },
        position: { x: 0, y: 0 },
        dimensions: { width: 1, height: 1 },
        shellId: 'root'
    } as unknown as BlockInstance;
    useBlockStore.setState({ blocks: [block], activeShellId: 'root' });
}

beforeEach(() => {
    useMindStore.setState(createInitialMindState());
    useBlockStore.setState({ blocks: [], activeShellId: 'root' });
    vi.mocked(runTurn).mockReset();
});

describe('MindEngine.think', () => {
    it('refuses to think on an empty canvas', async () => {
        const engine = new MindEngine();
        const result = await engine.think();
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/Add blocks to the canvas/);
        expect(runTurn).not.toHaveBeenCalled();
        expect(useMindStore.getState().status).toBe('ready');
    });

    it('fails closed when the LLM turn fails, and is not left processing', async () => {
        seedBlock();
        vi.mocked(runTurn).mockResolvedValue({ success: false, content: '', error: 'Ollama is not running' });

        const engine = new MindEngine();
        const result = await engine.think();

        expect(result).toEqual({ success: false, error: 'Ollama is not running' });
        expect(useMindStore.getState().status).toBe('error');

        vi.mocked(runTurn).mockResolvedValue({ success: true, content: 'ok', tokensUsed: 1 });
        const second = await engine.think();
        expect(second.success).toBe(true);
    });

    it('writes a successful answer into the observations pool', async () => {
        seedBlock();
        vi.mocked(runTurn).mockResolvedValue({
            success: true,
            content: 'Rates look steady.',
            tokensUsed: 12
        });

        const engine = new MindEngine();
        const result = await engine.think('What do you see?');

        expect(result.success).toBe(true);
        expect(result.response).toBe('Rates look steady.');
        const observations = useMindStore.getState().contextPools.find(p => p.id === 'observations');
        expect(observations?.entries.some(e => e.content === 'Rates look steady.')).toBe(true);
        expect(useMindStore.getState().status).toBe('ready');
    });

    it('rejects a second think while one is in flight', async () => {
        seedBlock();
        let release!: (value: { success: true; content: string }) => void;
        vi.mocked(runTurn).mockImplementation(
            () => new Promise(resolve => { release = resolve; })
        );

        const engine = new MindEngine();
        const first = engine.think();
        const second = await engine.think();
        expect(second).toEqual({ success: false, error: 'Already processing' });

        release({ success: true, content: 'done' });
        await first;
    });
});
