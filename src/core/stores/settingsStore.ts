// ============================================
// PROJECT OMNI: SETTINGS STORE
// User preferences. Stays on localStorage: small, synchronous, and holds
// nothing sensitive now that provider keys are server-side.
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { OmniSettings } from '../schemas/shell.schema';

// ============================================
// SETTINGS STORE
// ============================================

interface SettingsState extends OmniSettings {
    /** Update a setting */
    updateSetting: <K extends keyof OmniSettings>(key: K, value: OmniSettings[K]) => void;

    /** Update an API key */
    updateApiKey: (key: keyof OmniSettings['apiKeys'], value: string) => void;

    /** Toggle mock data mode */
    toggleMockData: () => void;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            useMockData: true, // Default to mock mode
            // NewsAPI/Polymarket keys now live server-side (process.env); these
            // client-side fields are retained only for legacy/other providers and
            // default to undefined so no placeholder secrets are persisted.
            apiKeys: {
                polymarket: undefined,
                newsapi: undefined,
                tradingview: undefined,
                flightaware: undefined,
                marinetraffic: undefined,
                gdelt: undefined
            },
            activeShellId: null,
            gridSnapping: true,
            gridSize: 20,
            autoWiring: true,
            showConnections: true,

            updateSetting: (key, value) => set({ [key]: value }),

            updateApiKey: (key, value) => set(state => ({
                apiKeys: { ...state.apiKeys, [key]: value }
            })),

            toggleMockData: () => set(state => ({ useMockData: !state.useMockData }))
        }),
        {
            name: 'omni-settings',
            storage: createJSONStorage(() => localStorage)
        }
    )
);
