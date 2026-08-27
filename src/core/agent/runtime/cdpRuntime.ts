// ============================================
// Product runtime: local Chrome/Chromium/Edge via CDP.
// Launch a disposable user-data-dir per tab, or attach via runtime.attach
// (process attach or optional OMNI_CDP_URL).
// ============================================

import { spawn, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createServer } from 'node:net';
import { AgentTabError } from '../errors';
import { getProcessAttachHttp } from './attach';
import { CdpClient } from './cdpClient';
import { findChrome } from './chrome';
import { ensureDir, profileDir, runtimeStatePath, tabDir } from './paths';
import { resolveAttachedPage } from './targets';
import type { LiveSession, RuntimeState, TabRuntime } from './types';

type EvalResult = {
    result?: { value?: unknown };
    exceptionDetails?: { text?: string; exception?: { description?: string } };
};

type Launched = {
    proc?: ChildProcess;
    port: number;
    profile: string;
    attached?: boolean;
    bound?: boolean;
    attachHttp?: string;
    targetId?: string;
    browserContextId?: string;
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
            'No local Chrome/Chromium/Edge found. Install Chrome, set OMNI_CHROME_PATH, ' +
                'or runtime.attach to an already-open Chrome. ' +
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
        const prev = readRuntimeState(this.id);
        const entry = launched.get(this.id);
        writeRuntimeState(this.id, {
            kind: 'cdp',
            debugPort: this.port || prev?.debugPort,
            pid: entry?.proc?.pid ?? prev?.pid,
            profileDir: profileDir(this.id),
            lastUrl: await this.url(),
            attached: entry?.attached ?? prev?.attached,
            bound: entry?.bound ?? prev?.bound,
            attachHttp: entry?.attachHttp ?? prev?.attachHttp,
            targetId: entry?.targetId ?? prev?.targetId,
            browserContextId: entry?.browserContextId ?? prev?.browserContextId
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

async function closeAttachedTarget(state: RuntimeState | null, entry?: Launched): Promise<void> {
    const httpBase = (entry?.attachHttp || state?.attachHttp || '').replace(/\/$/, '');
    const targetId = entry?.targetId || state?.targetId;
    const browserContextId = entry?.browserContextId || state?.browserContextId;
    if (!httpBase) return;
    try {
        const version = (await waitForJson(`${httpBase}/json/version`, 800)) as {
            webSocketDebuggerUrl?: string;
        };
        if (!version.webSocketDebuggerUrl) return;
        const browser = await CdpClient.connect(version.webSocketDebuggerUrl);
        if (targetId) {
            await browser.send('Target.closeTarget', { targetId }).catch(() => undefined);
        }
        if (browserContextId) {
            await browser
                .send('Target.disposeBrowserContext', { browserContextId })
                .catch(() => undefined);
        }
        browser.close();
    } catch {
        // user Chrome already gone — no-op
    }
}

function isAttachedTab(id: string): boolean {
    const entry = launched.get(id);
    if (entry?.attached) return true;
    return Boolean(readRuntimeState(id)?.attached);
}

async function killLaunched(id: string): Promise<void> {
    const entry = launched.get(id);
    launched.delete(id);
    const state = readRuntimeState(id);
    if (entry?.bound || state?.bound) {
        // Unbind only — do not close the user's page or its BrowserContext.
        return;
    }
    if (entry?.attached || state?.attached) {
        await closeAttachedTarget(state, entry);
        return;
    }
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
    const state = readRuntimeState(id);
    if (state?.attached && state.attachHttp) {
        return openAttached(id, state.attachHttp, state);
    }
    if (state?.debugPort && (await attachExisting(state.debugPort))) {
        const cdp = await connectPage(state.debugPort);
        launched.set(id, {
            port: state.debugPort,
            profile: profileDir(id),
            proc: launched.get(id)?.proc
        });
        return new CdpSession(id, cdp, state.debugPort);
    }
    const attachUrl = getProcessAttachHttp() || process.env.OMNI_CDP_URL;
    if (attachUrl) {
        return openAttached(id, attachUrl);
    }
    const launchedTab = await launchChrome(id);
    const cdp = await connectPage(launchedTab.port);
    return new CdpSession(id, cdp, launchedTab.port);
}

async function openAttached(
    id: string,
    cdpHttp: string,
    existing?: RuntimeState | null
): Promise<LiveSession> {
    const base = cdpHttp.replace(/\/$/, '');
    const version = (await waitForJson(`${base}/json/version`)) as {
        webSocketDebuggerUrl?: string;
    };
    if (!version.webSocketDebuggerUrl) {
        throw new AgentTabError(502, 'Attached Chrome has no webSocketDebuggerUrl');
    }

    const list = (await waitForJson(`${base}/json/list`)) as Array<{
        id?: string;
        type?: string;
        webSocketDebuggerUrl?: string;
    }>;
    const reused = existing?.targetId
        ? list.find((item) => item.id === existing.targetId && item.webSocketDebuggerUrl)
        : undefined;
    if (reused?.webSocketDebuggerUrl) {
        const cdp = await CdpClient.connect(reused.webSocketDebuggerUrl);
        await cdp.send('Page.enable');
        await cdp.send('Runtime.enable');
        launched.set(id, {
            port: 0,
            profile: profileDir(id),
            attached: true,
            bound: Boolean(existing?.bound),
            attachHttp: base,
            targetId: existing?.targetId,
            browserContextId: existing?.browserContextId
        });
        writeRuntimeState(id, {
            kind: 'cdp',
            attached: true,
            bound: Boolean(existing?.bound),
            attachHttp: base,
            targetId: existing?.targetId,
            browserContextId: existing?.browserContextId,
            profileDir: profileDir(id)
        });
        return new CdpSession(id, cdp, 0);
    }

    if (existing?.bound) {
        throw new AgentTabError(404, `Bound page is gone: ${existing.targetId}`);
    }

    const browser = await CdpClient.connect(version.webSocketDebuggerUrl);
    const created = await browser.send<{ browserContextId: string }>('Target.createBrowserContext');
    const target = await browser.send<{ targetId: string }>('Target.createTarget', {
        url: 'about:blank',
        browserContextId: created.browserContextId
    });
    await browser.send('Target.attachToTarget', {
        targetId: target.targetId,
        flatten: true
    });
    browser.close();
    const createdList = (await waitForJson(`${base}/json/list`)) as Array<{
        id?: string;
        type?: string;
        webSocketDebuggerUrl?: string;
    }>;
    const page = createdList.find((item) => item.id === target.targetId && item.webSocketDebuggerUrl);
    const wsUrl = page?.webSocketDebuggerUrl;
    if (!wsUrl) {
        throw new AgentTabError(502, 'Attached Chrome has no page websocket');
    }
    const cdp = await CdpClient.connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    launched.set(id, {
        port: 0,
        profile: profileDir(id),
        attached: true,
        attachHttp: base,
        targetId: target.targetId,
        browserContextId: created.browserContextId
    });
    writeRuntimeState(id, {
        kind: 'cdp',
        attached: true,
        attachHttp: base,
        targetId: target.targetId,
        browserContextId: created.browserContextId,
        profileDir: profileDir(id)
    });
    return new CdpSession(id, cdp, 0);
}

async function openBound(id: string, targetId: string): Promise<LiveSession> {
    const page = await resolveAttachedPage(targetId);
    const wsUrl = page.webSocketDebuggerUrl;
    if (!wsUrl) {
        throw new AgentTabError(502, 'Attached page has no DevTools websocket');
    }
    const httpBase = (getProcessAttachHttp() || process.env.OMNI_CDP_URL || '').replace(/\/$/, '');
    const cdp = await CdpClient.connect(wsUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    launched.set(id, {
        port: 0,
        profile: profileDir(id),
        attached: true,
        bound: true,
        attachHttp: httpBase,
        targetId: page.id
    });
    writeRuntimeState(id, {
        kind: 'cdp',
        attached: true,
        bound: true,
        attachHttp: httpBase,
        targetId: page.id,
        profileDir: profileDir(id)
    });
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
        async bind(id: string, targetId: string) {
            return openBound(id, targetId);
        },
        async dropLive(id: string) {
            if (isAttachedTab(id)) {
                launched.delete(id);
                return;
            }
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
