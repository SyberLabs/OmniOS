// ============================================
// SKIN SERVICE: LLM JSON in, CSS variables out.
//
// A theme prompt must not become arbitrary CSS. Only known colour tokens
// with colour-shaped values are applied.
// ============================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSkinService, PRESET_THEMES } from './skin.service';
import { runTurn } from '@/core/cognition';

vi.mock('@/core/cognition', () => ({
    runTurn: vi.fn()
}));

beforeEach(() => {
    vi.mocked(runTurn).mockReset();
});

describe('SkinService.generateSkin', () => {
    it('accepts known colour tokens from the model', async () => {
        vi.mocked(runTurn).mockResolvedValue({
            success: true,
            content: JSON.stringify({
                '--citadel-primary': '#ff00aa',
                '--text-primary': '#f4f4f5'
            })
        });

        const result = await getSkinService().generateSkin('neon');
        expect(result.success).toBe(true);
        expect(result.variables).toEqual({
            '--citadel-primary': '#ff00aa',
            '--text-primary': '#f4f4f5'
        });
    });

    it('drops unknown properties and non-colours so a prompt cannot inject CSS', async () => {
        vi.mocked(runTurn).mockResolvedValue({
            success: true,
            content: JSON.stringify({
                '--citadel-primary': '#00ffaa',
                '--not-a-token': '#ffffff',
                '--text-primary': 'url(javascript:alert(1))',
                'background': 'red'
            })
        });

        const result = await getSkinService().generateSkin('hostile');
        expect(result.variables).toEqual({ '--citadel-primary': '#00ffaa' });
    });

    it('fails closed when the model returns no usable tokens', async () => {
        vi.mocked(runTurn).mockResolvedValue({
            success: true,
            content: 'Sure, here is a vibe.'
        });
        const result = await getSkinService().generateSkin('moody');
        expect(result.success).toBe(false);
        expect(result.error).toMatch(/parse/i);
    });

    it('returns the LLM error when the turn itself fails', async () => {
        vi.mocked(runTurn).mockResolvedValue({ success: false, content: '', error: 'LLM unavailable' });
        await expect(getSkinService().generateSkin('x')).resolves.toEqual({
            success: false,
            error: 'LLM unavailable'
        });
    });
});

describe('PRESET_THEMES', () => {
    it('ships the four named presets with citadel tokens', () => {
        expect(PRESET_THEMES.map(t => t.id)).toEqual(['command', 'journal', 'cybernetic', 'minimal']);
        for (const theme of PRESET_THEMES) {
            expect(theme.variables['--citadel-primary']).toMatch(/^#/);
            expect(theme.variables['--text-primary']).toMatch(/^#/);
        }
    });
});
