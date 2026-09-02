// ============================================
// PROJECT OMNI: LLM PROXY ROUTE
// Server-side proxy for LLM calls. Keys are read from process.env here and
// never shipped to the client. See IMPLEMENTATION_PLAN.md (Phase 3).
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import {
    runComplete,
    runStream,
    isProviderConfigured,
    checkProviderAvailable,
    type ServerLLMProvider,
    type ServerLLMRequest,
    type LLMMessage
} from '@/core/services/server/llm.adapters';
import { resolveModel } from '@/core/models.registry';

export const runtime = 'nodejs';

const VALID_PROVIDERS: ServerLLMProvider[] = ['local', 'anthropic', 'google'];
const VALID_ROLES = new Set(['system', 'user', 'assistant']);

const MAX_MESSAGES = 100;
const MAX_TOTAL_CHARS = 200_000;
const MAX_OUTPUT_TOKENS = 8192;

interface ParsedBody {
    provider: ServerLLMProvider;
    model: string;
    messages: LLMMessage[];
    options?: { temperature?: number; maxTokens?: number };
    baseUrl?: string;
    stream?: boolean;
}

/** Validate + clamp the request body. Returns an error string on failure. */
function parseBody(raw: unknown): { ok: true; body: ParsedBody } | { ok: false; error: string } {
    if (!raw || typeof raw !== 'object') return { ok: false, error: 'Invalid request body' };
    const b = raw as Record<string, unknown>;

    const provider = b.provider as ServerLLMProvider;
    if (!VALID_PROVIDERS.includes(provider)) {
        return { ok: false, error: `Unsupported provider: ${String(b.provider)}` };
    }

    const model = typeof b.model === 'string' && b.model.trim() ? b.model.trim() : '';
    if (!model && provider !== 'local') {
        return { ok: false, error: 'Missing model' };
    }

    if (!Array.isArray(b.messages) || b.messages.length === 0) {
        return { ok: false, error: 'messages must be a non-empty array' };
    }
    if (b.messages.length > MAX_MESSAGES) {
        return { ok: false, error: `Too many messages (max ${MAX_MESSAGES})` };
    }

    let totalChars = 0;
    const messages: LLMMessage[] = [];
    for (const m of b.messages as unknown[]) {
        if (!m || typeof m !== 'object') return { ok: false, error: 'Invalid message' };
        const msg = m as Record<string, unknown>;
        if (typeof msg.role !== 'string' || !VALID_ROLES.has(msg.role)) {
            return { ok: false, error: `Invalid message role: ${String(msg.role)}` };
        }
        if (typeof msg.content !== 'string') {
            return { ok: false, error: 'Message content must be a string' };
        }
        totalChars += msg.content.length;
        messages.push({ role: msg.role as LLMMessage['role'], content: msg.content });
    }
    if (totalChars > MAX_TOTAL_CHARS) {
        return { ok: false, error: 'Request too large' };
    }

    const rawOptions = (b.options as Record<string, unknown>) || {};
    const options: ParsedBody['options'] = {};
    if (typeof rawOptions.temperature === 'number') {
        options.temperature = Math.min(2, Math.max(0, rawOptions.temperature));
    }
    if (typeof rawOptions.maxTokens === 'number') {
        options.maxTokens = Math.min(MAX_OUTPUT_TOKENS, Math.max(1, Math.floor(rawOptions.maxTokens)));
    }

    // baseUrl is only honored for the local provider (Ollama).
    const baseUrl = provider === 'local' && typeof b.baseUrl === 'string' ? b.baseUrl : undefined;

    return {
        ok: true,
        body: { provider, model, messages, options, baseUrl, stream: b.stream === true }
    };
}

// ============================================
// E2E TEST DOUBLE
// When the server runs with OMNI_E2E=1 (never set in production), the route
// answers with deterministic canned output so the golden-path e2e can exercise
// the full client pipeline (persona block → streaming render) without a real
// provider. Server-side env var only — clients cannot trigger this.
// ============================================
const E2E_RESPONSE = 'E2E MOCK RESPONSE — grounded analysis of the wired data.';

function e2eDouble(rawObj: Record<string, unknown>): Response {
    if (rawObj.mode === 'ping') {
        return NextResponse.json({ available: true }, { status: 200 });
    }
    if (rawObj.stream === true) {
        const encoder = new TextEncoder();
        const chunks = E2E_RESPONSE.split(' ').map(w => `${w} `);
        const body = new ReadableStream<Uint8Array>({
            async start(controller) {
                for (const chunk of chunks) {
                    controller.enqueue(encoder.encode(chunk));
                    await new Promise(r => setTimeout(r, 15));
                }
                controller.close();
            }
        });
        return new Response(body, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
        });
    }
    return NextResponse.json({ content: E2E_RESPONSE, tokensUsed: 42, finishReason: 'stop' });
}

export async function POST(request: NextRequest) {
    let raw: unknown;
    try {
        raw = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (process.env.OMNI_E2E === '1') {
        const rawObj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
        return e2eDouble(rawObj);
    }

    // Lightweight availability probe (mode: 'ping') — checks key presence for
    // cloud providers and actually pings Ollama for local, WITHOUT running a
    // real completion. Always 200 with { available } so the client can branch
    // cleanly instead of misreading a failed generation as "available".
    const rawObj = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
    if (rawObj.mode === 'ping') {
        const provider = rawObj.provider as ServerLLMProvider;
        if (!VALID_PROVIDERS.includes(provider)) {
            return NextResponse.json({ available: false, error: 'Unsupported provider' }, { status: 200 });
        }
        const baseUrl = provider === 'local' && typeof rawObj.baseUrl === 'string' ? rawObj.baseUrl : undefined;
        const available = await checkProviderAvailable({
            provider, model: '', messages: [], baseUrl
        });
        return NextResponse.json({ available }, { status: 200 });
    }

    const parsed = parseBody(raw);
    if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { provider, messages, options, baseUrl, stream } = parsed.body;
    // Defense in depth: heal known-deprecated model ids server-side so stale
    // clients (old persisted configs) don't 404 against providers (apex A5).
    const model = resolveModel(provider, parsed.body.model);

    if (!isProviderConfigured(provider)) {
        return NextResponse.json(
            { error: `${provider} is not configured on the server. Set the corresponding API key in .env.` },
            { status: 503 }
        );
    }

    const req: ServerLLMRequest = { provider, model, messages, options, baseUrl };

    try {
        if (stream) {
            const body = await runStream(req);
            return new Response(body, {
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-store'
                }
            });
        }
        const result = await runComplete(req);
        return NextResponse.json(result);
    } catch {
        // Never reflect raw upstream errors (may contain keys/PII).
        console.error('[api/llm] provider call failed');
        return NextResponse.json(
            { error: 'LLM provider request failed. Check server logs.' },
            { status: 502 }
        );
    }
}
