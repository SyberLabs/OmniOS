// ============================================
// Resolve the everyday Chrome/Chromium/Edge user-data-dir for this OS.
// Used by runtime.ensure when Chrome is quit. Never kill Chrome.
// Tests must opt in — Vitest does not open the machine's real profile.
// ============================================

import fs from 'node:fs';
import os from 'node:os';
import { inTest } from './paths';

export type BrowserKind = 'chrome' | 'chromium' | 'edge';

export type UserDataDirLookup = {
    platform?: NodeJS.Platform;
    env?: Record<string, string | undefined>;
    home?: string;
    chromeBinary?: string | null;
};

/** `false` = no default profile. `string` = that path if it exists. `null` = reset. */
let defaultDirOverride: string | false | null = null;

export function setDefaultUserDataDirForTests(value: string | false | null): void {
    defaultDirOverride = value;
}

function safeHome(env: Record<string, string | undefined> = process.env): string {
    try {
        return os.homedir() || env.HOME || env.USERPROFILE || '';
    } catch {
        return env.HOME || env.USERPROFILE || '';
    }
}

function joinOs(platform: NodeJS.Platform, ...parts: string[]): string {
    const sep = platform === 'win32' ? '\\' : '/';
    const cleaned = parts.filter((part) => part !== undefined && part !== '');
    if (cleaned.length === 0) return '';
    let out = cleaned[0].replace(/[\\/]+$/, '');
    for (const part of cleaned.slice(1)) {
        const piece = part.replace(/^[\\/]+/, '').replace(/[\\/]+$/, '');
        if (!piece) continue;
        out = `${out}${sep}${piece}`;
    }
    return out;
}

export function classifyChromeBinary(chromeBinary?: string | null): BrowserKind | null {
    if (!chromeBinary) return null;
    const lower = chromeBinary.replace(/\\/g, '/').toLowerCase();
    if (lower.includes('msedge') || lower.includes('microsoft-edge') || lower.includes('microsoft edge')) {
        return 'edge';
    }
    if (lower.includes('chromium')) return 'chromium';
    if (lower.includes('chrome')) return 'chrome';
    return null;
}

function dirsForKind(
    kind: BrowserKind,
    platform: NodeJS.Platform,
    home: string,
    env: Record<string, string | undefined>
): string[] {
    if (platform === 'win32') {
        const local = env.LOCALAPPDATA || joinOs(platform, home, 'AppData', 'Local');
        if (kind === 'chrome') return [joinOs(platform, local, 'Google', 'Chrome', 'User Data')];
        if (kind === 'chromium') return [joinOs(platform, local, 'Chromium', 'User Data')];
        return [joinOs(platform, local, 'Microsoft', 'Edge', 'User Data')];
    }
    if (platform === 'darwin') {
        const support = joinOs(platform, home, 'Library', 'Application Support');
        if (kind === 'chrome') return [joinOs(platform, support, 'Google Chrome')];
        if (kind === 'chromium') return [joinOs(platform, support, 'Chromium')];
        return [joinOs(platform, support, 'Microsoft Edge')];
    }
    const config = env.XDG_CONFIG_HOME || joinOs(platform, home, '.config');
    if (kind === 'chrome') return [joinOs(platform, config, 'google-chrome')];
    if (kind === 'chromium') return [joinOs(platform, config, 'chromium')];
    return [joinOs(platform, config, 'microsoft-edge')];
}

export function defaultUserDataDirCandidates(opts: UserDataDirLookup = {}): string[] {
    const platform = opts.platform ?? process.platform;
    const env = opts.env ?? process.env;
    const home = opts.home ?? safeHome(env);
    if (!home) return [];
    const kind = classifyChromeBinary(opts.chromeBinary);
    if (kind) return dirsForKind(kind, platform, home, env);
    return (['chrome', 'chromium', 'edge'] as const).flatMap((item) =>
        dirsForKind(item, platform, home, env)
    );
}

export function resolveExistingDefaultUserDataDir(opts: UserDataDirLookup = {}): string | null {
    if (defaultDirOverride === false) return null;
    if (typeof defaultDirOverride === 'string') {
        return fs.existsSync(defaultDirOverride) ? defaultDirOverride : null;
    }
    // Implicit lookup in Vitest never opens the machine's real profile.
    if (inTest() && opts.platform === undefined && opts.home === undefined) {
        return null;
    }
    for (const dir of defaultUserDataDirCandidates(opts)) {
        if (fs.existsSync(dir)) return dir;
    }
    return null;
}
