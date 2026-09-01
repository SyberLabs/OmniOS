// ============================================
// PROJECT OMNI: AGENT SURFACE — ONE TAB
// GET    /api/agent/tabs/{id}  → read
// DELETE /api/agent/tabs/{id}  → dispose   (no API key)
// ============================================

import { NextResponse } from 'next/server';
import { guardAgentRequest } from '@/core/agent/guard';
import { invokeAffordance } from '@/core/agent/invoke';
import type { HandlerResult } from '@/core/agent/types';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

function respond(result: HandlerResult) {
    return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: Request, context: RouteContext) {
    const blocked = guardAgentRequest(request);
    if (blocked) return respond(blocked);
    const { id } = await context.params;
    return respond(await invokeAffordance('tabs.read', { tabId: id }, id));
}

export async function DELETE(request: Request, context: RouteContext) {
    const blocked = guardAgentRequest(request);
    if (blocked) return respond(blocked);
    const { id } = await context.params;
    return respond(await invokeAffordance('tabs.dispose', { tabId: id }, id));
}
