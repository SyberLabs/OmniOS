// ============================================
// runtime.ensure — first-class keyless attach helper.
// Reuse an already-debuggable Chrome, or launch one and attach.
// Does not use Playwright. Does not quit Chrome on tabs.dispose.
// ============================================

import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AgentTabError } from '../errors';
import { attachRuntime, clearProcessAttachHttp, getProcessAttachHttp, probeCdpHttp } from './attach';
import { findChrome, setFindChromeForTests } from './chrome';
import { hasEverydayChrome, setEverydayChromeRunningForTests as setEverydayChromeHook } from './chromeProcesses';
import { ensureDir, inTest } from './paths';
import { clearTabRuntimeCache } from './resolve';

export const DEFAULT_DEBUG_PORT = 9222;

export type EnsureResult = {
    attached: true;
    launched: boolean;
    tabRuntime: 'cdp';
    disposeCloses: 'omni-target';
};

type LaunchedDebugChrome = {
    proc: ChildProcess;
    httpBase: string;
    port: number;
};

let launchedDebug: LaunchedDebugChrome | null = null;

export function debugChromeProfile(): string {
    if (process.env.OMNI_CHROME_DEBUG_PROFILE) return process.env.OMNI_CHROME_DEBUG_PROFILE;
    if (inTest()) {
        return path.join(
            os.tmpdir(),
            `omni-chrome-debug-vitest-${process.env.VITEST_WORKER_ID || process.pid}`
        );
    }
    return path.join(process.cwd(), '.omni', 'chrome-debug');
}

function chromeHeadless(): boolean {
    if (process.env.OMNI_CHROME_HEADLESS === '1') return true;
    if (process.env.OMNI_CHROME_HEADLESS === '0') return false;
    return !process.env.DISPLAY && process.platform === 'linux';
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearChromeLocks(profile: string): void {
    for (const name of ['SingletonLock', 'SingletonSocket', 'SingletonCookie', 'DevToolsActivePort']) {
        const file = path.join(profile, name);
        try {
            if (fs.existsSync(file)) fs.rmSync(file, { force: true });
        } catch {
            // stale lock from a killed Chrome
        }
    }
}

async function isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
        const server = createServer();
        server.once('error', () => resolve(false));
        server.listen(port, '127.0.0.1', () => {
            server.close(() => resolve(true));
        });
    });
}

async function freePort(): Promise<number> {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            if (!addr || typeof addr === 'string') {
                server.close();
                reject(new Error('Failed to allocate a debug port'));
                return;
            }
            const port = addr.port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

async function pickDebugPort(): Promise<number> {
    // Tests use an ephemeral port so parallel files do not collide on 9222.
    if (inTest() && !process.env.OMNI_CHROME_DEBUG_PORT) return freePort();
    const preferred = Number(process.env.OMNI_CHROME_DEBUG_PORT || DEFAULT_DEBUG_PORT);
    if (Number.isInteger(preferred) && preferred > 0 && preferred <= 65535) {
        if (await isPortFree(preferred)) return preferred;
    }
    return freePort();
}

async function probeExisting(httpBase: string, timeoutMs = 400): Promise<boolean> {
    try {
        await probeCdpHttp(httpBase.replace(/\/$/, ''), timeoutMs);
        return true;
    } catch {
        return false;
    }
}

async function findExistingDebugChrome(): Promise<string | null> {
    const candidates: string[] = [];
    const attached = getProcessAttachHttp();
    if (attached) candidates.push(attached);
    if (launchedDebug?.httpBase) candidates.push(launchedDebug.httpBase);
    if (process.env.OMNI_CDP_URL) candidates.push(process.env.OMNI_CDP_URL);
    // Product probes the well-known debug port. Tests skip it so a leftover
    // or parallel-file Chrome on 9222 cannot steal the missing-binary path.
    if (!inTest() || process.env.OMNI_CHROME_DEBUG_PORT) {
        const preferred = Number(process.env.OMNI_CHROME_DEBUG_PORT || DEFAULT_DEBUG_PORT);
        if (Number.isInteger(preferred) && preferred > 0 && preferred <= 65535) {
            candidates.push(`http://127.0.0.1:${preferred}`);
        }
    }

    const seen = new Set<string>();
    for (const raw of candidates) {
        const base = raw.replace(/\/$/, '');
        if (!base || seen.has(base)) continue;
        seen.add(base);
        if (await probeExisting(base)) return base;
    }
    return null;
}

async function launchDebugChrome(chrome: string): Promise<LaunchedDebugChrome> {
    const profile = debugChromeProfile();
    ensureDir(profile);
    clearChromeLocks(profile);
    const port = await pickDebugPort();
    const args = [
        `--user-data-dir=${profile}`,
        `--remote-debugging-port=${port}`,
        '--remote-debugging-address=127.0.0.1',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-sync',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-background-networking',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        'about:blank'
    ];
    if (chromeHeadless()) args.unshift('--headless=new');

    const proc = spawn(chrome, args, {
        stdio: ['ignore', 'ignore', 'pipe'],
        detached: false
    });
    let stderr = '';
    proc.stderr?.on('data', (chunk) => {
        stderr += String(chunk);
        if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });
    const httpBase = `http://127.0.0.1:${port}`;
    const dead = new Promise<never>((_, reject) => {
        proc.once('exit', (code) => {
            if (launchedDebug?.proc === proc) launchedDebug = null;
            reject(new AgentTabError(502, `Chrome exited (${code}): ${stderr.slice(0, 400)}`));
        });
    });
    try {
        await Promise.race([probeCdpHttp(httpBase, 15_000), dead]);
    } catch (error) {
        if (proc.exitCode == null) {
            try {
                proc.kill('SIGTERM');
            } catch {
                // already gone
            }
        }
        throw error;
    }
    proc.removeAllListeners('exit');
    proc.once('exit', () => {
        if (launchedDebug?.proc === proc) launchedDebug = null;
    });
    const entry = { proc, httpBase, port };
    launchedDebug = entry;
    return entry;
}

export async function ensureRuntime(): Promise<EnsureResult> {
    const existing = await findExistingDebugChrome();
    if (existing) {
        await attachRuntime({ cdpUrl: existing });
        return {
            attached: true,
            launched: false,
            tabRuntime: 'cdp',
            disposeCloses: 'omni-target'
        };
    }

    const excludePids = new Set<number>();
    if (launchedDebug?.proc?.pid) excludePids.add(launchedDebug.proc.pid);
    if (hasEverydayChrome({ excludePids, debugProfile: debugChromeProfile() })) {
        throw new AgentTabError(
            409,
            'Everyday Chrome/Chromium/Edge is already open and is not debuggable. ' +
                'Quit it, or restart it with remote debugging, then retry runtime.ensure. ' +
                'OmniOS will not launch a second Chrome on top of yours.'
        );
    }

    const chrome = findChrome();
    if (!chrome) {
        throw new AgentTabError(
            503,
            'No local Chrome/Chromium/Edge found. Install Chrome or set OMNI_CHROME_PATH. ' +
                'Playwright is not the product runtime (OMNI_TAB_RUNTIME=playwright is test/CI only).'
        );
    }

    const launched = await launchDebugChrome(chrome);
    await attachRuntime({ cdpUrl: launched.httpBase });
    return {
        attached: true,
        launched: true,
        tabRuntime: 'cdp',
        disposeCloses: 'omni-target'
    };
}

/** Test hook: force a missing Chrome binary for the fail-clean path. */
export function setEnsureChromeLocatorForTests(fn: (() => string | null) | null): void {
    setFindChromeForTests(fn);
}

/** Test hook: force everyday Chrome running / not running for the fail-closed path. */
export function setEverydayChromeRunningForTests(value: boolean | null): void {
    setEverydayChromeHook(value);
}

/** Test hook: true if runtime.ensure currently owns a launched debug Chrome. */
export function __hasLaunchedDebugChrome(): boolean {
    return Boolean(launchedDebug?.proc && launchedDebug.proc.exitCode == null);
}

/**
 * Test hook: stop a Chrome that runtime.ensure launched.
 * Product tabs.dispose never calls this — an ensure-launched Chrome stays up.
 */
export async function __stopEnsuredChrome(): Promise<void> {
    const entry = launchedDebug;
    launchedDebug = null;
    if (entry?.proc && entry.proc.exitCode == null) {
        try {
            entry.proc.kill('SIGTERM');
        } catch {
            // already gone
        }
        await sleep(400);
        if (entry.proc.exitCode == null) {
            try {
                entry.proc.kill('SIGKILL');
            } catch {
                // already gone
            }
            await sleep(200);
        }
    }
    const profile = debugChromeProfile();
    if (inTest() && fs.existsSync(profile)) {
        try {
            fs.rmSync(profile, { recursive: true, force: true });
        } catch {
            // leftover test profile
        }
    }
    clearProcessAttachHttp();
    clearTabRuntimeCache();
}
