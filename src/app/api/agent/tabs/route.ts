// ============================================
// PROJECT OMNI: AGENT SURFACE — TABS COLLECTION
// GET  /api/agent/tabs  → list
// POST /api/agent/tabs  → create   (no API key)
// ============================================

import { NextResponse } from 'next/server';
import { guardAgentRequest } from '@/core/agent/guard';
import { invokeAffordance, readJsonBody } from '@/core/agent/invoke';
import type { HandlerResult } from '@/core/agent/types';

export const runtime = 'nodejs';

function respond(result: HandlerResult) {
    return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: Request) {
    const blocked = guardAgentRequest(request);
    if (blocked) return respond(blocked);
    return respond(await invokeAffordance('tabs.list'));
}

export async function POST(request: Request) {
    const blocked = guardAgentRequest(request);
    if (blocked) return respond(blocked);
    try {
        const body = await readJsonBody(request);
        return respond(await invokeAffordance('tabs.create', body));
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
