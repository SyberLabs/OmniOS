// ============================================
// PROJECT OMNI: AGENT SURFACE — DISCOVER / INVOKE
// GET  /api/agent  → named keyless affordances
// POST /api/agent  → { affordance, input }  (no API key)
// ============================================

import { NextResponse } from 'next/server';
import { discoveryBody } from '@/core/agent/affordances';
import { invokeAffordance, readJsonBody } from '@/core/agent/invoke';
import type { HandlerResult } from '@/core/agent/types';

export const runtime = 'nodejs';

function respond(result: HandlerResult) {
    return NextResponse.json(result.body, { status: result.status });
}

export async function GET() {
    return NextResponse.json(discoveryBody());
}

export async function POST(request: Request) {
    try {
        const body = await readJsonBody(request);
        const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
        const affordance = typeof payload.affordance === 'string' ? payload.affordance : '';
        if (!affordance) {
            return respond({
                status: 400,
                body: { error: 'Missing affordance', keyRequired: false }
            });
        }
        return respond(await invokeAffordance(affordance, payload.input ?? payload));
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
