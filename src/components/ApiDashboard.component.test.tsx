// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ApiDashboardModal } from './ApiDashboard';
import { useApiStore } from '@/core/stores/apiStore';
import { getKeylessApis } from '@/core/schemas/api.schema';

describe('API Command Center — keyless demo APIs', () => {
    beforeEach(() => {
        useApiStore.setState({ installedApis: [], configs: {} });
        useApiStore.getState().initializeDefaults();
    });

    it('lists every keyless provider on the dashboard as installed and idle', () => {
        render(<ApiDashboardModal isOpen onClose={vi.fn()} />);

        expect(screen.getByText('API Command Center')).toBeTruthy();
        expect(screen.getByText(/12 work without a key/)).toBeTruthy();

        for (const api of getKeylessApis()) {
            expect(screen.getByText(api.name), api.id).toBeTruthy();
        }

        const configs = useApiStore.getState().getInstalledConfigs();
        const keyless = configs.filter(c => !c.provider.requiresAuth);
        expect(keyless).toHaveLength(12);
        for (const config of keyless) {
            expect(config.status, config.providerId).toBe('idle');
        }
    });

    it('marketplace cards mark keyless APIs as needing no key', () => {
        render(<ApiDashboardModal isOpen onClose={vi.fn()} />);
        fireEvent.click(screen.getByText('Marketplace'));

        const noKeyBadges = screen.getAllByText('No key');
        expect(noKeyBadges.length).toBe(getKeylessApis().length);
        expect(screen.getByText('Open-Meteo')).toBeTruthy();
        expect(screen.getByText('USGS Earthquakes')).toBeTruthy();
        expect(screen.getByText('Frankfurter FX')).toBeTruthy();
    });
});
