// ============================================
// Shared disk paths for tab meta and local Chrome profiles.
// ============================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function inTest(): boolean {
    return process.env.VITEST === 'true' || process.env.NODE_ENV === 'test';
}

function testWorkerSuffix(): string {
    return process.env.VITEST_WORKER_ID || String(process.pid);
}

export function persistRoot(): string {
    if (process.env.OMNI_AGENT_TABS_DIR) return process.env.OMNI_AGENT_TABS_DIR;
    if (inTest()) return path.join(os.tmpdir(), `omni-agent-tabs-vitest-${testWorkerSuffix()}`);
    return path.join(process.cwd(), '.omni', 'tabs');
}

export function profileRoot(): string {
    if (process.env.OMNI_AGENT_PROFILES_DIR) return process.env.OMNI_AGENT_PROFILES_DIR;
    if (inTest()) {
        return path.join(os.tmpdir(), `omni-agent-profiles-vitest-${testWorkerSuffix()}`);
    }
    return path.join(process.cwd(), '.omni', 'profiles');
}

export function tabDir(id: string): string {
    return path.join(persistRoot(), id);
}

export function profileDir(id: string): string {
    return path.join(profileRoot(), id);
}

export function metaPath(id: string): string {
    return path.join(tabDir(id), 'meta.json');
}

export function screenshotPath(id: string): string {
    return path.join(tabDir(id), 'shot.png');
}

export function runtimeStatePath(id: string): string {
    return path.join(tabDir(id), 'runtime.json');
}

export function storagePath(id: string): string {
    return path.join(tabDir(id), 'storage.json');
}

export function screenshotHref(id: string, updatedAt: number): string {
    return `/api/agent/tabs/${id}/screenshot?t=${updatedAt}`;
}

export function ensureDir(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
}
