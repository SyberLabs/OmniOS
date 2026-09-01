// ============================================
// PROJECT OMNI: API STORE
// Per-provider install state, status and (for custom providers only) keys.
//
// Every keyed provider OmniOS ships is now proxied through /api/data with the
// key read from process.env, so nothing here holds a shipped secret. What is
// stored is stored in the clear: the previous XOR-with-a-constant was
// obfuscation that read as encryption, which is worse than neither.
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    ApiConfig,
    ApiStatus,
    API_CATALOG,
    ApiProvider,
    getApiProvider,
    getSupportedApis,
    isApiSupported
} from '../schemas/api.schema';
import { apiGateway } from '../gateway';

// ============================================
// STORE INTERFACE
// ============================================

interface ApiStoreState {
    /** API configurations by provider ID */
    configs: Record<string, ApiConfig>;

    /** Installed API provider IDs */
    installedApis: string[];

    /** Set API key for a provider */
    setApiKey: (providerId: string, key: string) => void;

    /** Get decrypted API key */
    getApiKey: (providerId: string) => string;

    /** Install an API (add to dashboard) */
    installApi: (providerId: string) => void;

    /** Uninstall an API */
    uninstallApi: (providerId: string) => void;

    /** Check if API is installed */
    isInstalled: (providerId: string) => boolean;

    /** Update API status */
    updateStatus: (providerId: string, status: ApiStatus, errorMessage?: string) => void;

    /** Record an API request */
    recordRequest: (providerId: string) => void;

    /** Test API connection */
    testConnection: (providerId: string) => Promise<boolean>;

    /** Get all installed configs with provider details */
    getInstalledConfigs: () => (ApiConfig & { provider: ApiProvider })[];

    /** Get config for a provider */
    getConfig: (providerId: string) => ApiConfig | undefined;

    /** Clear all API keys */
    clearAllKeys: () => void;

    /** Initialize default APIs if store is empty */
    initializeDefaults: () => void;
}

// ============================================
// CREATE STORE
// ============================================

// Default APIs that come pre-installed (supported + no auth required)
const DEFAULT_INSTALLED_APIS = getSupportedApis()
    .filter(provider => !provider.requiresAuth)
    .map(provider => provider.id);

export const useApiStore = create<ApiStoreState>()(
    persist(
        (set, get) => ({
            configs: {},
            installedApis: [],

            // Initialize defaults if store is empty
            initializeDefaults: () => {
                const state = get();
                if (state.installedApis.length === 0) {
                    set({
                        installedApis: DEFAULT_INSTALLED_APIS,
                        configs: DEFAULT_INSTALLED_APIS.reduce((acc, id) => ({
                            ...acc,
                            [id]: {
                                providerId: id,
                                status: 'idle' as ApiStatus,
                                requestCount: 0
                            }
                        }), {})
                    });
                }
            },

            setApiKey: (providerId, key) => {
                set(state => ({
                    configs: {
                        ...state.configs,
                        [providerId]: {
                            ...state.configs[providerId],
                            providerId,
                            apiKey: key,
                            status: key ? 'idle' : 'not_configured',
                            requestCount: state.configs[providerId]?.requestCount || 0
                        }
                    }
                }));
            },

            getApiKey: (providerId) => {
                const config = get().configs[providerId];
                return config?.apiKey || '';
            },

            installApi: (providerId) => {
                set(state => {
                    if (state.installedApis.includes(providerId)) return state;
                    if (!isApiSupported(providerId)) return state;

                    return {
                        installedApis: [...state.installedApis, providerId],
                        configs: {
                            ...state.configs,
                            [providerId]: state.configs[providerId] || {
                                providerId,
                                status: 'not_configured',
                                requestCount: 0
                            }
                        }
                    };
                });
            },

            uninstallApi: (providerId) => {
                set(state => ({
                    installedApis: state.installedApis.filter(id => id !== providerId)
                }));
            },

            isInstalled: (providerId) => {
                return get().installedApis.includes(providerId);
            },

            updateStatus: (providerId, status, errorMessage) => {
                set(state => ({
                    configs: {
                        ...state.configs,
                        [providerId]: {
                            ...state.configs[providerId],
                            providerId,
                            status,
                            errorMessage,
                            requestCount: state.configs[providerId]?.requestCount || 0
                        }
                    }
                }));
            },

            recordRequest: (providerId) => {
                set(state => ({
                    configs: {
                        ...state.configs,
                        [providerId]: {
                            ...state.configs[providerId],
                            providerId,
                            requestCount: (state.configs[providerId]?.requestCount || 0) + 1,
                            lastRequest: Date.now(),
                            status: state.configs[providerId]?.status || 'idle'
                        }
                    }
                }));
            },

            testConnection: async (providerId) => {
                const provider = getApiProvider(providerId);
                if (!provider) return false;

                set(state => ({
                    configs: {
                        ...state.configs,
                        [providerId]: {
                            ...state.configs[providerId],
                            providerId,
                            status: 'testing',
                            requestCount: state.configs[providerId]?.requestCount || 0
                        }
                    }
                }));

                try {
                    if (!apiGateway.isRegistered(providerId)) {
                        get().updateStatus(providerId, 'error', 'No gateway adapter registered for this API.');
                        return false;
                    }

                    const apiKey = get().getApiKey(providerId);
                    if (apiKey) {
                        apiGateway.setApiKey(providerId, apiKey);
                    }

                    const testParams = provider.integration?.testParams
                        || (provider.integration?.gateway?.type === 'normalizer'
                            ? provider.integration.gateway.defaultParams
                            : provider.integration?.gateway?.type === 'rest_list'
                                ? provider.integration.gateway.config.defaultParams
                                : undefined);

                    const result = await apiGateway.fetch(providerId, testParams, true);
                    if (result.error) {
                        get().updateStatus(providerId, 'error', result.error.message);
                        return false;
                    }

                    get().updateStatus(providerId, 'connected');
                    get().recordRequest(providerId);
                    return true;
                } catch (error) {
                    get().updateStatus(providerId, 'error', (error as Error).message);
                    return false;
                }
            },

            getInstalledConfigs: () => {
                const state = get();
                return state.installedApis.map(id => {
                    const provider = API_CATALOG.find(p => p.id === id);
                    const config = state.configs[id] || {
                        providerId: id,
                        status: 'not_configured' as ApiStatus,
                        requestCount: 0
                    };
                    return { ...config, provider: provider! };
                }).filter(c => c.provider);
            },

            getConfig: (providerId) => {
                return get().configs[providerId];
            },

            clearAllKeys: () => {
                set(state => ({
                    configs: Object.fromEntries(
                        Object.entries(state.configs).map(([id, config]) => [
                            id,
                            { ...config, apiKey: undefined, status: 'not_configured' as ApiStatus }
                        ])
                    )
                }));
            }
        }),
        {
            name: 'omni-api-vault',
            version: 1,
            // v0 stored `encryptedKey`: XOR-obfuscated, not encrypted. Those
            // bytes are not a usable plaintext key, so they are dropped rather
            // than mis-carried. Shipped providers need no client key at all now;
            // a custom provider's key is simply re-entered.
            migrate: (persisted: unknown) => {
                const state = persisted as { configs?: Record<string, Record<string, unknown>> };
                if (!state?.configs) return state;
                for (const cfg of Object.values(state.configs)) {
                    if ('encryptedKey' in cfg) {
                        delete cfg.encryptedKey;
                        cfg.status = 'not_configured';
                    }
                }
                return state;
            },
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                configs: state.configs,
                installedApis: state.installedApis
            })
        }
    )
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get status color for UI
 */
export function getStatusColor(status: ApiStatus): string {
    switch (status) {
        case 'connected': return 'var(--truth-green)';
        case 'idle': return 'var(--truth-amber)';
        case 'error': return 'var(--truth-red)';
        case 'testing': return 'var(--citadel-primary)';
        case 'not_configured': return 'var(--text-muted)';
        default: return 'var(--text-muted)';
    }
}

/**
 * Get status icon name
 */
export function getStatusIcon(status: ApiStatus): string {
    switch (status) {
        case 'connected': return 'CheckCircle';
        case 'idle': return 'Circle';
        case 'error': return 'XCircle';
        case 'testing': return 'Loader2';
        case 'not_configured': return 'CircleDashed';
        default: return 'Circle';
    }
}

export default useApiStore;
