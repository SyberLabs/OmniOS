// ============================================
// TabRuntime — a tab is a local lightweight browser state.
// Product: Chrome/CDP. Playwright is a test/CI adapter only.
// ============================================

export type TabRuntimeKind = 'cdp' | 'playwright';

export type LiveSession = {
    kind: TabRuntimeKind;
    evaluate<T>(expression: string): Promise<T>;
    clickSelector(selector: string): Promise<void>;
    fillSelector(selector: string, text: string): Promise<void>;
    goto(url: string): Promise<void>;
    screenshotPng(): Promise<Buffer>;
    title(): Promise<string>;
    url(): Promise<string>;
    bodyText(): Promise<string>;
    persist(): Promise<void>;
    close(): Promise<void>;
};

export type TabRuntime = {
    kind: TabRuntimeKind;
    open(id: string): Promise<LiveSession>;
    restore(id: string): Promise<LiveSession>;
    destroy(id: string): Promise<void>;
    dropLive(id: string): Promise<void>;
};

export type RuntimeState = {
    kind: TabRuntimeKind;
    debugPort?: number;
    pid?: number;
    profileDir?: string;
};
