// ============================================
// Product default is local Chrome/CDP.
// Playwright is an explicit test/CI adapter.
// ============================================

import { getProcessAttachHttp } from './attach';
import { createCdpRuntime } from './cdpRuntime';
import { findChrome } from './chrome';
import { createPlaywrightRuntime } from './playwrightRuntime';
import type { TabRuntime, TabRuntimeKind } from './types';

export type ResolveOpts = {
    env?: Record<string, string | undefined>;
    inTest?: boolean;
    hasChrome?: boolean;
    hasCdpUrl?: boolean;
};

export function resolveTabRuntimeKind(opts: ResolveOpts = {}): TabRuntimeKind {
    const env = opts.env ?? (process.env as Record<string, string | undefined>);
    const explicit = env.OMNI_TAB_RUNTIME;
    if (explicit === 'playwright') return 'playwright';
    if (explicit === 'cdp') return 'cdp';
    if (getProcessAttachHttp()) return 'cdp';

    const inTest =
        opts.inTest ?? (env.VITEST === 'true' || env.NODE_ENV === 'test');
    const hasCdpUrl = opts.hasCdpUrl ?? Boolean(env.OMNI_CDP_URL);
    const hasChrome = opts.hasChrome ?? Boolean(findChrome());

    if (inTest && !explicit) return 'playwright';
    if (hasCdpUrl || hasChrome) return 'cdp';
    if (inTest || env.CI === 'true') return 'playwright';
    return 'cdp';
}

let override: TabRuntime | null = null;
let cached: TabRuntime | null = null;

export function setTabRuntimeForTests(runtime: TabRuntime | null): void {
    override = runtime;
    cached = null;
}

export function getTabRuntime(): TabRuntime {
    if (override) return override;
    if (getProcessAttachHttp()) {
        if (!cached || cached.kind !== 'cdp') {
            cached = createCdpRuntime();
        }
        return cached;
    }
    if (cached) return cached;
    const kind = resolveTabRuntimeKind();
    cached = kind === 'playwright' ? createPlaywrightRuntime() : createCdpRuntime();
    return cached;
}
