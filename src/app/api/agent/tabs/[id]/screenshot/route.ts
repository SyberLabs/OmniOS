// ============================================
// PROJECT OMNI: AGENT SURFACE — TAB SCREENSHOT
// GET /api/agent/tabs/{id}/screenshot  → image/png  (no API key)
// ============================================

import { NextResponse } from 'next/server';
import { AgentTabError, readTabScreenshot } from '@/core/agent/browserTabs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
    const { id } = await context.params;
    // Touch the cache-buster so Next never treats this GET as static.
    void new URL(request.url).searchParams.get('t');
    try {
        const bytes = await readTabScreenshot(id);
        return new NextResponse(new Uint8Array(bytes), {
            status: 200,
            headers: {
                'content-type': 'image/png',
                'cache-control': 'no-store',
                'content-length': String(bytes.length)
            }
        });
    } catch (error) {
        const status = error instanceof AgentTabError ? error.status : 500;
        const message = error instanceof Error ? error.message : 'Screenshot failed';
        return NextResponse.json({ error: message, keyRequired: false }, { status });
    }
}
