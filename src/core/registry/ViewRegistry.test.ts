// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { API_CATALOG } from '@/core/schemas/api.schema';
import { BlockViews } from './ViewRegistry';
import { blockRegistry } from './BlockRegistry';

describe('every catalog block has a canvas view', () => {
    it('maps each provider block_id to a registered view', () => {
        for (const provider of API_CATALOG) {
            for (const id of provider.blockIds ?? []) {
                expect(blockRegistry.has(id), id).toBe(true);
                expect(BlockViews[id], `${provider.id} -> ${id}`).toBeTypeOf('function');
            }
        }
    });
});
