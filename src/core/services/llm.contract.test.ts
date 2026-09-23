// ============================================
// /api/llm — the two halves of one contract.
//
// The route declares the run-id header; llm.service reads it. They cannot
// import each other: the route pulls in `server-only` modules that hold API
// keys, and llm.service runs in the browser. So the string is written twice,
// and this is the only thing standing between that and a silent failure —
// a divergence would leave `onRunId` never firing, `parentRunId` always
// undefined, and every cascade's lineage quietly collapsing to one node.
// ============================================

import { describe, it, expect } from 'vitest';
import { RUN_ID_HEADER as clientHeader } from './llm.service';
import { RUN_ID_HEADER as routeHeader } from '@/app/api/llm/route';

describe('run id header', () => {
    it('is the same name on both sides', () => {
        expect(clientHeader).toBe(routeHeader);
    });

    it('is a valid HTTP header token', () => {
        expect(clientHeader).toMatch(/^[A-Za-z0-9-]+$/);
    });
});
