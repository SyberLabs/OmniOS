// ============================================
// TEST / CI ADAPTER ONLY.
// Not the product path. OMNI_TAB_RUNTIME=playwright.
// ============================================

import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { ensureDir, storagePath } from './paths';
import type { LiveSession, TabRuntime } from './types';

let browserPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
        browserPromise = chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage']
        });
    }
    return browserPromise;
}

class PlaywrightSession implements LiveSession {
    readonly kind = 'playwright' as const;

    constructor(
        private readonly id: string,
        private readonly context: BrowserContext,
        private readonly page: Page
    ) {}

    async evaluate<T>(expression: string): Promise<T> {
        return this.page.evaluate(expression) as Promise<T>;
    }

    async clickSelector(selector: string): Promise<void> {
        await this.page.locator(selector).click({ timeout: 10_000 });
        await new Promise((resolve) => setTimeout(resolve, 50));
    }

    async fillSelector(selector: string, text: string): Promise<void> {
        await this.page.locator(selector).fill(text, { timeout: 10_000 });
    }

    async goto(url: string): Promise<void> {
        await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    }

    async screenshotPng(): Promise<Buffer> {
        return this.page.screenshot({ type: 'png' });
    }

    async title(): Promise<string> {
        return this.page.title();
    }

    async url(): Promise<string> {
        return this.page.url();
    }

    async bodyText(): Promise<string> {
        return ((await this.page.locator('body').innerText().catch(() => '')) || '').slice(0, 4000);
    }

    async persist(): Promise<void> {
        ensureDir(path.dirname(storagePath(this.id)));
        await this.context.storageState({ path: storagePath(this.id) });
    }

    async close(): Promise<void> {
        await this.page.close().catch(() => undefined);
        await this.context.close().catch(() => undefined);
    }
}

async function newSession(id: string): Promise<PlaywrightSession> {
    const browser = await getBrowser();
    const stored = storagePath(id);
    const context = await browser.newContext({
        storageState: fs.existsSync(stored) ? stored : undefined
    });
    const page = await context.newPage();
    return new PlaywrightSession(id, context, page);
}

export function createPlaywrightRuntime(): TabRuntime {
    return {
        kind: 'playwright',
        async open(id: string) {
            return newSession(id);
        },
        async restore(id: string) {
            return newSession(id);
        },
        async dropLive(id: string) {
            void id;
        },
        async destroy(id: string) {
            void id;
        }
    };
}

export function __playwrightIsAdapter(): true {
    return true;
}
