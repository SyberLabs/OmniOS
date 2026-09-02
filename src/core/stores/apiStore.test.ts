import { describe, it, expect } from 'vitest';
import { dropClientApiKeys } from './apiStore';
import { dropSettingsClientKeys } from './settingsStore';

describe('dropClientApiKeys — leftover vault keys must not survive migrate', () => {
    it('strips plaintext apiKey and XOR-era encryptedKey', () => {
        const persisted = {
            configs: {
                fred: { providerId: 'fred', apiKey: 'should-not-keep', status: 'connected', requestCount: 3 },
                news: { providerId: 'newsapi', encryptedKey: 'xor-bytes', status: 'idle', requestCount: 0 }
            },
            installedApis: ['fred', 'newsapi']
        };

        const next = dropClientApiKeys(persisted) as typeof persisted;
        expect(next.configs.fred).not.toHaveProperty('apiKey');
        expect(next.configs.news).not.toHaveProperty('encryptedKey');
        expect(next.configs.news.status).toBe('not_configured');
        expect(next.configs.fred.requestCount).toBe(3);
        expect(next.installedApis).toEqual(['fred', 'newsapi']);
    });

    it('leaves a vault with no configs alone', () => {
        expect(dropClientApiKeys({ installedApis: [] })).toEqual({ installedApis: [] });
        expect(dropClientApiKeys(null)).toBeNull();
    });
});

describe('dropSettingsClientKeys', () => {
    it('removes the dead apiKeys bag without touching other prefs', () => {
        const persisted = {
            useMockData: false,
            apiKeys: { newsapi: 'should-not-keep' },
            gridSize: 24
        };
        const next = dropSettingsClientKeys(persisted) as Record<string, unknown>;
        expect(next).not.toHaveProperty('apiKeys');
        expect(next.useMockData).toBe(false);
        expect(next.gridSize).toBe(24);
    });
});
