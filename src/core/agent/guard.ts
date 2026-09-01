// ============================================
// PROJECT OMNI: AGENT SURFACE — LOCAL-ONLY GUARD
//
// This surface is keyless BY DESIGN (`keyRequired: false` is part of the
// frozen contract). A surface that checks no key must therefore enforce a
// boundary instead: it is reachable only from this machine, and only by a
// caller that is not a web page. Without that boundary, "keyless" means
// "any website the user visits can drive their browser."
//
// Three layers, because none of them covers what the others do:
//
//   1. Loopback host  — a LAN peer cannot reach the surface even when Next
//      binds 0.0.0.0 (its default), which `next start -H` can always undo.
//   2. Sec-Fetch-Site / Origin — a page the user visits cannot drive it.
//      Browsers always send Sec-Fetch-Site; curl and agents never do.
//   3. JSON content-type on POST — `text/plain` is CORS-safelisted, so a
//      cross-origin POST carrying it is a *simple request*: no preflight,
//      delivered, side effects run, response merely unreadable. Requiring
//      `application/json` forces a preflight this app never answers, so the
//      drive-by is blocked before it is sent.
//
// Layer 3 is the one that matters most: it closes the blind-CSRF hole that
// would otherwise let a visited page call runtime.ensure → tabs.create →
// tab.type against a live, logged-in profile.
// ============================================

import type { HandlerResult } from './types';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

/** Strip the port from a Host header value, leaving IPv6 brackets intact. */
function hostnameOf(value: string): string {
    const trimmed = value.trim().toLowerCase();
    if (trimmed.startsWith('[')) {
        const end = trimmed.indexOf(']');
        return end === -1 ? trimmed : trimmed.slice(0, end + 1);
    }
    const colon = trimmed.lastIndexOf(':');
    return colon === -1 ? trimmed : trimmed.slice(0, colon);
}

function isLoopback(value: string | null | undefined): boolean {
    if (!value) return false;
    return LOOPBACK_HOSTS.has(hostnameOf(value));
}

function denied(reason: string): HandlerResult {
    return {
        status: 403,
        body: { error: `Agent surface is local-only: ${reason}`, keyRequired: false }
    };
}

/**
 * The request's host. Prefers the `Host` header (what the transport saw);
 * falls back to the URL, since a `Request` built in-process carries no Host.
 */
function requestHost(request: Request): string | null {
    const header = request.headers.get('host');
    if (header) return header;
    try {
        return new URL(request.url).host;
    } catch {
        return null;
    }
}

/**
 * Gate one agent-surface request. Returns `null` when the request may
 * proceed, or the `HandlerResult` to return verbatim when it may not.
 * Never throws.
 */
export function guardAgentRequest(request: Request): HandlerResult | null {
    if (!isLoopback(requestHost(request))) {
        return denied('reachable only over localhost');
    }

    // Browsers label every request; non-browser callers send nothing.
    // `same-site` is still another origin (a different local port), so only
    // `same-origin` (the /surface page itself) and `none` (typed/curl) pass.
    const site = request.headers.get('sec-fetch-site');
    if (site && site !== 'same-origin' && site !== 'none') {
        return denied('cross-origin browser requests are refused');
    }

    // Belt and braces for clients that omit Sec-Fetch-Site.
    const origin = request.headers.get('origin');
    if (origin && origin !== 'null' && !isLoopback(safeHost(origin))) {
        return denied('cross-origin browser requests are refused');
    }

    // Only POST can be smuggled as a CORS simple request; GET exposes no
    // readable body cross-origin, and DELETE always preflights.
    if (request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.toLowerCase().split(';')[0].trim().startsWith('application/json')) {
            return {
                status: 415,
                body: {
                    error: 'Agent surface requires content-type: application/json',
                    keyRequired: false
                }
            };
        }
    }

    return null;
}

function safeHost(url: string): string | null {
    try {
        return new URL(url).host;
    } catch {
        return null;
    }
}
