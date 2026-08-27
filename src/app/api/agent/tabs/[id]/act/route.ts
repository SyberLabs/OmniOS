// ============================================
// PROJECT OMNI: AGENT SURFACE — ACT ON A TAB
// POST /api/agent/tabs/{id}/act  { affordance, input }  (no API key)
// ============================================

import { NextResponse } from 'next/server';
import { invokeAffordance, readJsonBody } from '@/core/agent/invoke';
import type { HandlerResult } from '@/core/agent/types';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

function respond(result: HandlerResult) {
    return NextResponse.json(result.body, { status: result.status });
}

export async function POST(request: Request, context: RouteContext) {
    const { id } = await context.params;
    try {
        const body = await readJsonBody(request);
        const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
        const nested = typeof payload.affordance === 'string' ? payload.affordance : '';
        if (nested === 'tab.navigate' || nested === 'tab.click' || nested === 'tab.type') {
            return respond(await invokeAffordance(nested, payload.input ?? payload, id));
        }
        return respond(await invokeAffordance('tabs.act', payload, id));
    } catch (error) {
        return respond({
            status: 400,
            body: {
                error: error instanceof Error ? error.message : 'Invalid request',
                keyRequired: false
            }
        });
    }
}
