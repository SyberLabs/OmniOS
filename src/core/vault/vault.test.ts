// fake-indexeddb gives node a real (in-memory) IndexedDB implementation.
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
    vaultStorage,
    listVaultKeys,
    getVaultValue,
    VAULT_DB_NAME,
    __resetVaultConnection
} from './vaultStorage';
import { exportVault, importVault, isVaultExport } from './vaultExport';

async function wipeVault(): Promise<void> {
    await __resetVaultConnection();
    await new Promise<void>((resolve, reject) => {
        const req = indexedDB.deleteDatabase(VAULT_DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
        req.onblocked = () => resolve();
    });
}

describe('vaultStorage — IndexedDB adapter (apex A2)', () => {
    beforeEach(async () => {
        localStorage.clear();
        await wipeVault();
    });

    it('round-trips set/get/remove', async () => {
        expect(await vaultStorage.getItem('omni-test')).toBeNull();

        await vaultStorage.setItem('omni-test', '{"state":{"a":1},"version":3}');
        expect(await vaultStorage.getItem('omni-test')).toBe('{"state":{"a":1},"version":3}');

        await vaultStorage.removeItem('omni-test');
        expect(await vaultStorage.getItem('omni-test')).toBeNull();
    });

    it('lazily migrates a legacy localStorage value on first read miss', async () => {
        // Pre-vault world: the store's data lives in localStorage.
        localStorage.setItem('omni-blocks', '{"state":{"blocks":[1,2]},"version":1}');

        // First vault read adopts it…
        const value = await vaultStorage.getItem('omni-blocks');
        expect(value).toBe('{"state":{"blocks":[1,2]},"version":1}');

        // …and it now lives in the vault itself (not just passthrough).
        expect(await getVaultValue('omni-blocks')).toBe('{"state":{"blocks":[1,2]},"version":1}');

        // Vault copy wins over a later-diverging localStorage copy.
        localStorage.setItem('omni-blocks', 'STALE');
        expect(await vaultStorage.getItem('omni-blocks')).toBe('{"state":{"blocks":[1,2]},"version":1}');
    });

    it('lists stored keys', async () => {
        await vaultStorage.setItem('omni-a', '1');
        await vaultStorage.setItem('omni-b', '2');
        expect((await listVaultKeys()).sort()).toEqual(['omni-a', 'omni-b']);
    });
});

describe('export / import (apex A2)', () => {
    beforeEach(async () => {
        localStorage.clear();
        await wipeVault();
    });

    it('export gathers BOTH engines; vault wins on conflicts', async () => {
        localStorage.setItem('omni-settings', 'LS-SETTINGS');   // not-yet-migrated store
        localStorage.setItem('omni-blocks', 'LS-STALE');        // legacy copy
        localStorage.setItem('unrelated-key', 'IGNORED');       // non-omni: excluded
        await vaultStorage.setItem('omni-blocks', 'VAULT-BLOCKS');

        const exported = await exportVault();

        expect(exported.format).toBe('omni-vault-export');
        expect(exported.data['omni-settings']).toBe('LS-SETTINGS');
        expect(exported.data['omni-blocks']).toBe('VAULT-BLOCKS'); // vault wins
        expect(exported.data['unrelated-key']).toBeUndefined();
        expect(isVaultExport(exported)).toBe(true);
    });

    it('import restores every key to both engines', async () => {
        const restored = await importVault({
            format: 'omni-vault-export',
            version: 1,
            exportedAt: Date.now(),
            data: { 'omni-blocks': 'RESTORED', 'omni-settings': 'RESTORED-LS' }
        });

        expect(restored).toBe(2);
        expect(await getVaultValue('omni-blocks')).toBe('RESTORED');
        expect(localStorage.getItem('omni-settings')).toBe('RESTORED-LS');
    });

    it('isVaultExport rejects malformed/foreign payloads', () => {
        expect(isVaultExport(null)).toBe(false);
        expect(isVaultExport({ format: 'other', version: 1, data: {} })).toBe(false);
        expect(isVaultExport({ format: 'omni-vault-export', version: 1, data: { 'evil-key': 'x' } })).toBe(false);
        expect(isVaultExport({ format: 'omni-vault-export', version: 1, data: { 'omni-a': 42 } })).toBe(false);
    });
});
