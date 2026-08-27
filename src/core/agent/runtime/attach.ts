// ============================================
// First-class attach to an already-open Chrome (CDP HTTP).
// Not an env-var-only path. Does not use Playwright.
// ============================================

import { AgentTabError } from '../errors';

let processAttachHttp: string | null = null;

export function getProcessAttachHttp(): string | null {
    return processAttachHttp;
}

export function setProcessAttachHttp(httpBase: string | null): void {
    processAttachHttp = httpBase ? httpBase.replace(/\/$/, '') : null;
}

export function clearProcessAttachHttp(): void {
    processAttachHttp = null;
}

export function resolveAttachHttp(input: Record<string, unknown>): string {
    const cdpUrl = typeof input.cdpUrl === 'string' ? input.cdpUrl.trim() : '';
    if (cdpUrl) {
        let parsed: URL;
        try {
            parsed = new URL(cdpUrl);
        } catch {
            throw new AgentTabError(400, 'Invalid cdpUrl');
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            throw new AgentTabError(400, 'cdpUrl must be http(s)');
        }
        return `${parsed.protocol}//${parsed.host}`;
    }

    const portRaw = input.port;
    if (portRaw !== undefined && portRaw !== null && portRaw !== '') {
        const port = typeof portRaw === 'number' ? portRaw : Number(portRaw);
        if (!Number.isInteger(port) || port < 1 || port > 65535) {
            throw new AgentTabError(400, 'port must be an integer 1-65535');
        }
        return `http://127.0.0.1:${port}`;
    }

    throw new AgentTabError(400, 'runtime.attach requires cdpUrl or port');
}

async function fetchJson(url: string, timeoutMs: number): Promise<unknown> {
    const start = Date.now();
    let last = '';
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return await res.json();
            last = `HTTP ${res.status}`;
        } catch (error) {
            last = error instanceof Error ? error.message : 'fetch failed';
        }
        await new Promise((resolve) => setTimeout(resolve, 80));
    }
    throw new AgentTabError(502, `Cannot attach to Chrome at ${url}: ${last}`);
}

export async function probeCdpHttp(httpBase: string, timeoutMs = 2000): Promise<void> {
    const base = httpBase.replace(/\/$/, '');
    const version = (await fetchJson(`${base}/json/version`, timeoutMs)) as {
        webSocketDebuggerUrl?: string;
    };
    if (!version?.webSocketDebuggerUrl) {
        throw new AgentTabError(502, `Cannot attach to Chrome at ${base}: no DevTools endpoint`);
    }
}

export async function attachRuntime(input: Record<string, unknown>): Promise<string> {
    const httpBase = resolveAttachHttp(input);
    await probeCdpHttp(httpBase);
    setProcessAttachHttp(httpBase);
    return httpBase;
}
