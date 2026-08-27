// ============================================
// PROJECT OMNI: AGENT SURFACE — ONE TAB
// GET    /api/agent/tabs/{id}  → read
// DELETE /api/agent/tabs/{id}  → dispose   (no API key)
// ============================================

import { NextResponse } from 'next/server';
import { invokeAffordance } from '@/core/agent/invoke';
import type { HandlerResult } from '@/core/agent/types';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

function respond(result: HandlerResult) {
    return NextResponse.json(result.body, { status: result.status });
}

export async function GET(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    return respond(invokeAffordance('tabs.read', { tabId: id }, id));
}

export async function DELETE(_request: Request, context: RouteContext) {
    const { id } = await context.params;
    return respond(invokeAffordance('tabs.dispose', { tabId: id }, id));
}
