// ============================================
// Product runtime: local Chrome/Chromium/Edge via CDP.
// Launch a disposable user-data-dir per tab, or attach to OMNI_CDP_URL.
// ============================================

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { AgentTabError } from '../errors';
import { CdpClient } from './cdpClient';
import { findChrome } from './chrome';
import { ensureDir, profileDir, runtimeStatePath, tabDir } from './paths';
import type { LiveSession, RuntimeState, TabRuntime } from './types';

type EvalResult = {
    result?: { value?: unknown };
    exceptionDetails?: { text?: string; exception?: { description?: string } };
};

type Launched = {
    proc?: ChildProcess;
    port: number;
    profile: string;
};

const launched = new Map<string, Launched>();

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function readRuntimeState(id: string): RuntimeState | null {
    try {
        return JSON.parse(fs.readFileSync(runtimeStatePath(id), 'utf8')) as RuntimeState;
    } catch {
        return null;
    }
}

function writeRuntimeState(id: string, state: RuntimeState): void {
    ensureDir(tabDir(id));
    fs.writeFileSync(runtimeStatePath(id), JSON.stringify(state));
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

async function waitForJson(url: string, timeoutMs = 15_000): Promise<unknown> {
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
        await sleep(100);
    }
    throw new AgentTabError(502, `Chrome CDP did not come up at ${url}: ${last}`);
}

async function pageWebSocket(port: number): Promise<string> {
    const version = (await waitForJson(`http://127.0.0.1:${port}/json/version`)) as {
        webSocketDebuggerUrl?: string;
    };
    const list = (await waitForJson(`http://127.0.0.1:${port}/json/list`)) as Array<{
        type?: string;
        webSocketDebuggerUrl?: string;
    }>;
    const page = list.find((item) => item.type === 'page' && item.webSocketDebuggerUrl);
    if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    if (version.webSocketDebuggerUrl) return version.webSocketDebuggerUrl;
    throw new AgentTabError(502, 'Chrome CDP has no page target');
}

function chromeHeadless(): boolean {
    if (process.env.OMNI_CHROME_HEADLESS === '1') return true;
    if (process.env.OMNI_CHROME_HEADLESS === '0') return false;
    return !process.env.DISPLAY && process.platform === 'linux';
}

async function launchChrome(id: string, existingPort?: number): Promise<Launched> {
    const chrome = findChrome();
    if (!chrome) {
        throw new AgentTabError(
            503,
            'No local Chrome/Chromium/Edge found. Install Chrome or set OMNI_CHROME_PATH / OMNI_CDP_URL. ' +
                'Playwright is not the product runtime (OMNI_TAB_RUNTIME=playwright is test/CI only).'
        );
    }
    const profile = profileDir(id);
    ensureDir(profile);
    clearChromeLocks(profile);
    const port = existingPort && existingPort > 0 ? existingPort : await freePort();
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
    const dead = new Promise<never>((_, reject) => {
        proc.once('exit', (code) => {
            reject(new AgentTabError(502, `Chrome exited (${code}): ${stderr.slice(0, 400)}`));
        });
    });
    await Promise.race([waitForJson(`http://127.0.0.1:${port}/json/version`), dead]);
    proc.removeAllListeners('exit');
    const entry = { proc, port, profile };
    launched.set(id, entry);
    writeRuntimeState(id, { kind: 'cdp', debugPort: port, pid: proc.pid, profileDir: profile });
    return entry;
}

async function attachExisting(port: number): Promise<boolean> {
    try {
        await waitForJson(`http://127.0.0.1:${port}/json/version`, 800);
        return true;
    } catch {
        return false;
    }
}

async function connectPage(port: number): Promise<CdpClient> {
    const wsUrl = await pageWebSocket(port);
    const cdp = await CdpClient.connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    return cdp;
}

class CdpSession implements LiveSession {
    readonly kind = 'cdp' as const;

    constructor(
        private readonly id: string,
        private cdp: CdpClient,
        private readonly port: number
    ) {}

    async evaluate<T>(expression: string): Promise<T> {
        const result = await this.cdp.send<EvalResult>('Runtime.evaluate', {
            expression,
            returnByValue: true,
            awaitPromise: true
        });
        if (result.exceptionDetails) {
            throw new AgentTabError(
                400,
                result.exceptionDetails.exception?.description ||
                    result.exceptionDetails.text ||
                    'Page evaluation failed'
            );
        }
        return result.result?.value as T;
    }

    async clickSelector(selector: string): Promise<void> {
        const loaded = this.cdp.once('Page.loadEventFired', 8_000).catch(() => undefined);
        const result = await this.evaluate<'missing' | 'nav' | 'stay'>(
            `(() => { const el = document.querySelector(${JSON.stringify(selector)});` +
                ` if (!el) return 'missing';` +
                ` const goes = el.tagName === 'A' || (el.tagName === 'BUTTON' && (el.getAttribute('type') || 'submit') === 'submit');` +
                ` el.click(); return goes ? 'nav' : 'stay'; })()`
        );
        if (result === 'missing') {
            throw new AgentTabError(400, `No element for selector: ${selector}`);
        }
        if (result === 'nav') {
            await loaded;
            await sleep(250);
            return;
        }
        await sleep(80);
    }

    async fillSelector(selector: string, text: string): Promise<void> {
        const found = await this.evaluate<boolean>(
            `(() => { const el = document.querySelector(${JSON.stringify(selector)});` +
                ` if (!el) return false; el.focus();` +
                ` if ('value' in el) el.value = ${JSON.stringify(text)};` +
                ` el.dispatchEvent(new Event('input', { bubbles: true }));` +
                ` el.dispatchEvent(new Event('change', { bubbles: true }));` +
                ` return true; })()`
        );
        if (!found) throw new AgentTabError(400, `No element for selector: ${selector}`);
    }

    async goto(url: string): Promise<void> {
        const loaded = this.cdp.once('Page.loadEventFired', 20_000).catch(() => undefined);
        await this.cdp.send('Page.navigate', { url });
        await Promise.race([loaded, sleep(20_000)]);
        await sleep(50);
    }

    async screenshotPng(): Promise<Buffer> {
        const { data } = await this.cdp.send<{ data: string }>('Page.captureScreenshot', {
            format: 'png'
        });
        return Buffer.from(data, 'base64');
    }

    async title(): Promise<string> {
        return (await this.evaluate<string>('document.title')) || '';
    }

    async url(): Promise<string> {
        return (await this.evaluate<string>('location.href')) || '';
    }

    async bodyText(): Promise<string> {
        return (
            (await this.evaluate<string>(
                'document.body ? (document.body.innerText || "") : ""'
            )) || ''
        ).slice(0, 4000);
    }

    async persist(): Promise<void> {
        writeRuntimeState(this.id, {
            kind: 'cdp',
            debugPort: this.port,
            pid: launched.get(this.id)?.proc?.pid,
            profileDir: profileDir(this.id),
            lastUrl: await this.url()
        });
    }

    async close(): Promise<void> {
        this.cdp.close();
    }
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

async function rmBestEffort(dir: string): Promise<void> {
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            if (!fs.existsSync(dir)) return;
            fs.rmSync(dir, { recursive: true, force: true });
            return;
        } catch {
            await sleep(80);
        }
    }
}

async function closeDebugPort(port?: number): Promise<void> {
    if (!port) return;
    try {
        const version = (await waitForJson(
            `http://127.0.0.1:${port}/json/version`,
            800
        )) as { webSocketDebuggerUrl?: string };
        if (!version.webSocketDebuggerUrl) return;
        const browser = await CdpClient.connect(version.webSocketDebuggerUrl);
        await browser.send('Browser.close').catch(() => undefined);
        browser.close();
    } catch {
        // already gone
    }
}

async function killLaunched(id: string): Promise<void> {
    const entry = launched.get(id);
    launched.delete(id);
    const state = readRuntimeState(id);
    const port = entry?.port ?? state?.debugPort;
    const proc = entry?.proc;
    const exited = proc
        ? new Promise<void>((resolve) => {
              if (proc.exitCode != null) {
                  resolve();
                  return;
              }
              proc.once('exit', () => resolve());
          })
        : null;
    await closeDebugPort(port);
    // Give Chrome time to flush cookies to the profile before SIGTERM.
    if (exited) {
        await Promise.race([exited, sleep(2500)]);
    } else {
        await sleep(600);
    }
    if (proc && proc.exitCode == null) {
        try {
            proc.kill('SIGTERM');
        } catch {
            // already gone
        }
        await Promise.race([exited, sleep(800)]);
    }
    if (proc && proc.exitCode == null) {
        try {
            proc.kill('SIGKILL');
        } catch {
            // already gone
        }
        await Promise.race([exited, sleep(500)]);
    }
}

async function openLaunched(id: string): Promise<LiveSession> {
    const attachUrl = process.env.OMNI_CDP_URL;
    if (attachUrl) {
        return openAttached(id, attachUrl);
    }
    const state = readRuntimeState(id);
    if (state?.debugPort && (await attachExisting(state.debugPort))) {
        const cdp = await connectPage(state.debugPort);
        launched.set(id, {
            port: state.debugPort,
            profile: profileDir(id),
            proc: launched.get(id)?.proc
        });
        return new CdpSession(id, cdp, state.debugPort);
    }
    const launchedTab = await launchChrome(id);
    const cdp = await connectPage(launchedTab.port);
    return new CdpSession(id, cdp, launchedTab.port);
}

async function openAttached(id: string, cdpHttp: string): Promise<LiveSession> {
    const base = cdpHttp.replace(/\/$/, '');
    const version = (await waitForJson(`${base}/json/version`)) as {
        webSocketDebuggerUrl?: string;
    };
    if (!version.webSocketDebuggerUrl) {
        throw new AgentTabError(502, 'OMNI_CDP_URL has no webSocketDebuggerUrl');
    }
    const browser = await CdpClient.connect(version.webSocketDebuggerUrl);
    const created = await browser.send<{ browserContextId: string }>('Target.createBrowserContext');
    const target = await browser.send<{ targetId: string }>('Target.createTarget', {
        url: 'about:blank',
        browserContextId: created.browserContextId
    });
    const attached = await browser.send<{ sessionId: string }>('Target.attachToTarget', {
        targetId: target.targetId,
        flatten: true
    });
    // Flattened sessions still speak on the same socket with sessionId;
    // fall back to the page WS from /json/list for a simpler session.
    browser.close();
    const list = (await waitForJson(`${base}/json/list`)) as Array<{
        id?: string;
        type?: string;
        webSocketDebuggerUrl?: string;
    }>;
    const page = list.find((item) => item.id === target.targetId && item.webSocketDebuggerUrl);
    const wsUrl = page?.webSocketDebuggerUrl;
    if (!wsUrl) {
        throw new AgentTabError(502, 'Attached Chrome has no page websocket');
    }
    const cdp = await CdpClient.connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    writeRuntimeState(id, { kind: 'cdp', profileDir: profileDir(id) });
    void attached;
    return new CdpSession(id, cdp, 0);
}

export function createCdpRuntime(): TabRuntime {
    return {
        kind: 'cdp',
        async open(id: string) {
            return openLaunched(id);
        },
        async restore(id: string) {
            return openLaunched(id);
        },
        async dropLive(id: string) {
            const entry = launched.get(id);
            if (entry?.proc) {
                await killLaunched(id);
            }
        },
        async destroy(id: string) {
            await killLaunched(id);
            await rmBestEffort(profileDir(id));
        }
    };
}
