// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaBlockView } from './PersonaBlock';
import { useBlockStore } from '@/core/stores';
import { useWireStore } from '@/core/stores/wireStore';
import { createPersonaBlockData } from '@/core/schemas/wire.schema';
import type { BlockInstance } from '@/core/schemas/block.schema';
import type { PersonaTurnResult } from '@/core/services/persona.engine';

// Mock the persona engine — these tests cover the UI WIRING layer (the layer
// where the fake-handler bug lived), not the LLM round-trip itself.
vi.mock('@/core/services/persona.engine', () => ({
    streamPersonaTurn: vi.fn()
}));
import { streamPersonaTurn } from '@/core/services/persona.engine';

const PERSONA_ID = 'persona_analyst_test1';

function seedPersonaBlock() {
    const block: BlockInstance = {
        instance_id: PERSONA_ID,
        schema: {
            block_id: 'persona_analyst',
            display_name: 'Analyst',
            category: 'model'
        } as unknown as BlockInstance['schema'],
        status: 'connected',
        last_updated: null,
        data: createPersonaBlockData('analyst'),
        position: { x: 0, y: 0 },
        dimensions: { width: 320, height: 400 },
        shellId: 'root'
    };
    useBlockStore.setState({ blocks: [block], activeShellId: 'root' });
}

function mockStream(chunks: string[], result: PersonaTurnResult) {
    vi.mocked(streamPersonaTurn).mockImplementation(async function* () {
        for (const c of chunks) yield c;
        return result;
    });
}

describe('PersonaBlockView — UI wiring', () => {
    beforeEach(() => {
        vi.mocked(streamPersonaTurn).mockReset();
        seedPersonaBlock();
        useWireStore.setState({ wires: [] } as never);
    });

    it('renders the persona with Think and message input', () => {
        render(<PersonaBlockView instanceId={PERSONA_ID} />);
        expect(screen.getByText('Analyst')).toBeTruthy();
        expect(screen.getByTitle('Think')).toBeTruthy();
        expect(screen.getByPlaceholderText(/Ask Analyst/)).toBeTruthy();
    });

    it('Think streams the engine response into the conversation', async () => {
        mockStream(['Markets look ', 'stable today.'], {
            success: true,
            content: 'Markets look stable today.',
            sourceIds: []
        });
        render(<PersonaBlockView instanceId={PERSONA_ID} />);

        fireEvent.click(screen.getByTitle('Think'));

        expect(await screen.findByText(/Markets look stable today\./)).toBeTruthy();
        expect(vi.mocked(streamPersonaTurn)).toHaveBeenCalledWith(
            expect.objectContaining({ instanceId: PERSONA_ID, personaType: 'analyst', userMessage: undefined })
        );
    });

    it('sending a message shows it and streams the reply', async () => {
        mockStream(['Grounded ', 'answer.'], {
            success: true,
            content: 'Grounded answer.',
            sourceIds: []
        });
        render(<PersonaBlockView instanceId={PERSONA_ID} />);

        fireEvent.change(screen.getByPlaceholderText(/Ask Analyst/), {
            target: { value: 'What do you see?' }
        });
        fireEvent.keyDown(screen.getByPlaceholderText(/Ask Analyst/), { key: 'Enter' });

        expect(await screen.findByText('What do you see?')).toBeTruthy();
        expect(await screen.findByText(/Grounded answer\./)).toBeTruthy();
        expect(vi.mocked(streamPersonaTurn)).toHaveBeenCalledWith(
            expect.objectContaining({ userMessage: 'What do you see?' })
        );
    });

    it('engine failure surfaces a clear in-chat warning (no fake answer)', async () => {
        mockStream([], {
            success: false,
            sourceIds: [],
            error: 'No LLM available — make sure Ollama is running (localhost:11434).'
        });
        render(<PersonaBlockView instanceId={PERSONA_ID} />);

        fireEvent.click(screen.getByTitle('Think'));

        expect(await screen.findByText(/No LLM available/)).toBeTruthy();
        expect(screen.queryByText(/placeholder response/i)).toBeNull();
    });
});
