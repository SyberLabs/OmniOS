// ============================================
// PROJECT OMNI: OMNIVAULT — EXPORT / IMPORT (apex A2)
// One-click "your data" portability. The export gathers BOTH storage
// engines — vault (IndexedDB) keys AND legacy `omni-*` localStorage keys —
// so it is complete regardless of which stores have migrated to the vault.
// Import writes each entry to both engines (harmless, guarantees pickup
// wherever the owning store currently reads from), then the caller reloads.
// ============================================

import { listVaultKeys, getVaultValue, vaultStorage } from './vaultStorage';

export interface OmniVaultExport {
    format: 'omni-vault-export';
    version: 1;
    exportedAt: number;
    /** Raw persisted JSON strings, keyed by store name. */
    data: Record<string, string>;
}

const OMNI_KEY_PREFIX = 'omni-';

/** Gather all persisted app state into a portable export object. */
export async function exportVault(): Promise<OmniVaultExport> {
    const data: Record<string, string> = {};

    // localStorage first (legacy / not-yet-migrated stores)…
    if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(OMNI_KEY_PREFIX)) {
                const value = localStorage.getItem(key);
                if (value !== null) data[key] = value;
            }
        }
    }

    // …then the vault (migrated stores win when both hold a copy —
    // the vault is the live engine for them).
    for (const key of await listVaultKeys()) {
        const value = await getVaultValue(key);
        if (value !== null) data[key] = value;
    }

    return {
        format: 'omni-vault-export',
        version: 1,
        exportedAt: Date.now(),
        data
    };
}

/** Validate an untrusted parsed JSON object as an OmniVaultExport. */
export function isVaultExport(obj: unknown): obj is OmniVaultExport {
    if (!obj || typeof obj !== 'object') return false;
    const o = obj as Record<string, unknown>;
    return o.format === 'omni-vault-export'
        && o.version === 1
        && typeof o.data === 'object' && o.data !== null
        && Object.entries(o.data as Record<string, unknown>)
            .every(([k, v]) => k.startsWith(OMNI_KEY_PREFIX) && typeof v === 'string');
}

/**
 * Restore an export. Writes every entry to both engines; the caller should
 * reload the page afterwards so all stores rehydrate from the restored state.
 * Returns the number of restored keys.
 */
export async function importVault(exported: OmniVaultExport): Promise<number> {
    let restored = 0;
    for (const [key, value] of Object.entries(exported.data)) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, value);
        }
        await vaultStorage.setItem(key, value);
        restored++;
    }
    return restored;
}
