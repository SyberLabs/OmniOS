import { describe, expect, it } from 'vitest';
import { AgentTabError } from '../errors';
import { resolveAttachHttp } from './attach';

describe('resolveAttachHttp', () => {
    it('accepts cdpUrl or localhost port', () => {
        expect(resolveAttachHttp({ cdpUrl: 'http://127.0.0.1:9222/' })).toBe(
            'http://127.0.0.1:9222'
        );
        expect(resolveAttachHttp({ port: 9222 })).toBe('http://127.0.0.1:9222');
        expect(resolveAttachHttp({ port: '9333' })).toBe('http://127.0.0.1:9333');
    });

    it('rejects missing or invalid input', () => {
        expect(() => resolveAttachHttp({})).toThrow(AgentTabError);
        try {
            resolveAttachHttp({});
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(400);
        }
        try {
            resolveAttachHttp({ cdpUrl: 'not-a-url' });
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(400);
        }
        try {
            resolveAttachHttp({ port: 0 });
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(400);
        }
    });
});
