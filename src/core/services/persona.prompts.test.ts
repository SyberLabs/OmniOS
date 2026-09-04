// ============================================
// PERSONA PROMPTS: what the Mind panel injects.
//
// Lock the parse, not the prose: SUGGEST_MEMORY must become a typed insight,
// and a named persona must actually appear in the system prompt.
// ============================================

import { describe, it, expect } from 'vitest';
import { getPersonaSystemPrompt, parseInsightsFromResponse } from './persona.prompts';
import { BUILTIN_PERSONAS } from '@/core/schemas/mind.schema';

function persona(id: string) {
    const p = BUILTIN_PERSONAS.find(x => x.id === id);
    if (!p) throw new Error(`missing built-in persona ${id}`);
    return { ...p, createdAt: 0, updatedAt: 0 };
}

describe('getPersonaSystemPrompt', () => {
    it('names the analyst and asks it to ground claims in evidence', () => {
        const prompt = getPersonaSystemPrompt(persona('analyst'));
        expect(prompt).toContain('The Analyst');
        expect(prompt).toMatch(/evidence/i);
    });

    it('falls back to the analyst prompt for an unknown persona id', () => {
        const unknown = { ...persona('analyst'), id: 'not-a-persona', name: 'Stranger' };
        expect(getPersonaSystemPrompt(unknown)).toContain('Stranger');
    });
});

describe('parseInsightsFromResponse', () => {
    it('lifts SUGGEST_MEMORY lines into high-confidence memory suggestions', () => {
        const insights = parseInsightsFromResponse(
            'Markets are quiet today across the wired feeds.\nSUGGEST_MEMORY: GDP growth printed 2.1% in Q2.\n'
        );
        const memory = insights.filter(i => i.type === 'memory_suggestion');
        expect(memory).toEqual([
            {
                type: 'memory_suggestion',
                content: 'GDP growth printed 2.1% in Q2.',
                confidence: 'high'
            }
        ]);
    });

    it('ignores a SUGGEST_MEMORY with nothing worth keeping', () => {
        expect(parseInsightsFromResponse('SUGGEST_MEMORY: no').filter(i => i.type === 'memory_suggestion')).toEqual([]);
    });
});
