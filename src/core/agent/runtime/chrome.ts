// ============================================
// Locate a real Chrome / Chromium / Edge on this machine.
// Never treat Playwright's downloaded Chromium as the product browser.
// ============================================

import fs from 'node:fs';
import { execSync } from 'node:child_process';

const CANDIDATES = [
    process.env.OMNI_CHROME_PATH,
    process.env.CHROME_PATH,
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/opt/google/chrome/chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge-stable',
    '/usr/bin/microsoft-edge',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].filter((value): value is string => Boolean(value));

function isPlaywrightBrowser(file: string): boolean {
    return file.includes('ms-playwright') || file.includes('playwright');
}

let findChromeOverride: (() => string | null) | null = null;

/** Test hook: force a missing (or fake) Chrome binary. */
export function setFindChromeForTests(fn: (() => string | null) | null): void {
    findChromeOverride = fn;
}

export function findChrome(): string | null {
    if (findChromeOverride) return findChromeOverride();
    for (const candidate of CANDIDATES) {
        if (candidate && fs.existsSync(candidate) && !isPlaywrightBrowser(candidate)) {
            return candidate;
        }
    }
    for (const name of [
        'google-chrome',
        'google-chrome-stable',
        'chromium-browser',
        'chromium',
        'microsoft-edge',
        'msedge'
    ]) {
        try {
            const resolved = execSync(`command -v ${name}`, {
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore']
            }).trim();
            if (resolved && fs.existsSync(resolved) && !isPlaywrightBrowser(resolved)) {
                return resolved;
            }
        } catch {
            // not on PATH
        }
    }
    return null;
}
