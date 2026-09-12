import { describe, it, expect } from 'vitest';
import { dropClientApiKeys, migrateApiVault, withMissingKeylessInstalled } from './apiStore';
import { dropSettingsClientKeys } from './settingsStore';
import { getKeylessApis } from '../schemas/api.schema';

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

describe('keyless demo APIs land in an existing Command Center vault', () => {
    const keylessIds = getKeylessApis().map(p => p.id);

    it('installs every shipped keyless provider onto a vault that only had the original five', () => {
        const persisted = {
            installedApis: ['polymarket', 'coingecko', 'hackernews', 'openalex', 'worldbank'],
            configs: {
                polymarket: { providerId: 'polymarket', status: 'idle', requestCount: 4 }
            }
        };

        const next = withMissingKeylessInstalled(persisted) as typeof persisted;
        expect(next.installedApis.sort()).toEqual(keylessIds.slice().sort());
        expect(next.configs.polymarket.requestCount).toBe(4);
        expect(next.configs.usgs).toEqual({ providerId: 'usgs', status: 'idle', requestCount: 0 });
        expect(next.configs.wikipedia.status).toBe('idle');
    });

    it('rewrites a leftover not_configured status on a keyless card to idle', () => {
        const next = withMissingKeylessInstalled({
            installedApis: ['wikipedia'],
            configs: { wikipedia: { providerId: 'wikipedia', status: 'not_configured', requestCount: 0 } }
        }) as { configs: { wikipedia: { status: string } } };
        expect(next.configs.wikipedia.status).toBe('idle');
    });

    it('v3 migrate does not reinstall something the user already uninstalled', () => {
        const persisted = {
            installedApis: ['polymarket'],
            configs: { polymarket: { providerId: 'polymarket', status: 'idle', requestCount: 0 } }
        };
        const next = migrateApiVault(persisted, 3) as typeof persisted;
        expect(next.installedApis).toEqual(['polymarket']);
    });

    it('v2 migrate still adds the new demo APIs', () => {
        const next = migrateApiVault({
            installedApis: ['polymarket'],
            configs: {}
        }, 2) as { installedApis: string[] };
        expect(next.installedApis).toEqual(expect.arrayContaining(['usgs', 'openmeteo', 'github']));
        expect(next.installedApis).toHaveLength(keylessIds.length);
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
