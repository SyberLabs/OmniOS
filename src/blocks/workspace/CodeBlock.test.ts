// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { persistCode } from './CodeBlock';

describe('persistCode — language/content saves a timestamp', () => {
    it('writes lastSaved as a number alongside content and language', () => {
        const updateData = vi.fn();
        const before = Date.now();
        persistCode('code_1', 'const x = 1', 'typescript', updateData);
        const after = Date.now();

        expect(updateData).toHaveBeenCalledTimes(1);
        const payload = updateData.mock.calls[0][1] as { content: string; language: string; lastSaved: number };
        expect(payload.content).toBe('const x = 1');
        expect(payload.language).toBe('typescript');
        expect(payload.lastSaved).toBeGreaterThanOrEqual(before);
        expect(payload.lastSaved).toBeLessThanOrEqual(after);
    });
});
