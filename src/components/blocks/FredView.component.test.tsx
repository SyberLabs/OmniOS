// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FredView } from './FredView';
import type { OmniItem, OmniMetrics } from '@/core/gateway';

const FRED_SETUP =
    'FRED requires an API key. Set FRED_API_KEY in .env.';

const noop = () => {};

function renderFred(overrides: {
    items?: OmniItem[];
    metrics?: OmniMetrics | null;
    status?: string;
    error?: string | null;
} = {}) {
    return render(
        <FredView
            items={overrides.items ?? []}
            metrics={overrides.metrics ?? null}
            status={overrides.status ?? 'connecting'}
            lastUpdated={null}
            seriesInput="GDP"
            onSeriesInputChange={noop}
            onApplySeries={noop}
            error={overrides.error}
        />
    );
}

describe('FredView: fetch states', () => {
    it('renders the server error, not Loading', () => {
        renderFred({ error: FRED_SETUP, status: 'error' });

        expect(screen.getByText(FRED_SETUP)).toBeTruthy();
        expect(screen.queryByText(/Loading/i)).toBeNull();
    });

    it('with no data and no error, does not show the setup card', () => {
        renderFred({ status: 'connecting' });

        expect(screen.queryByTestId('block-setup-card')).toBeNull();
        expect(screen.queryByText(FRED_SETUP)).toBeNull();
        expect(screen.getAllByText(/Loading/i).length).toBeGreaterThan(0);
    });

    it('with a successful empty response, shows No results rather than Loading', () => {
        renderFred({ status: 'connected' });

        expect(screen.getByText(/No results/i)).toBeTruthy();
        expect(screen.queryByText(/Loading/i)).toBeNull();
        expect(screen.queryByTestId('block-setup-card')).toBeNull();
    });
});
