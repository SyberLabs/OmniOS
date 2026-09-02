// @vitest-environment happy-dom
// ============================================
// The pill showed the provider on a hover-styled button whose click only
// re-pinged. It read as a selector and behaved as a refresh, so the provider
// looked stuck on whatever it was. These lock the fix.
// ============================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LlmStatusPill } from './LlmStatusPill';
import { useMindStore } from '@/core/stores/mindStore';
import { LLM_DEFAULTS } from '@/core/schemas/mind.schema';

function mockPing(available: boolean) {
    vi.stubGlobal('fetch', vi.fn(async () => ({
        ok: true,
        json: async () => ({ available })
    } as unknown as Response)));
}

beforeEach(() => {
    useMindStore.setState({ llmConfig: { ...LLM_DEFAULTS.local } });
    mockPing(true);
});

afterEach(() => vi.unstubAllGlobals());

describe('LlmStatusPill', () => {
    it('shows the active provider', async () => {
        render(<LlmStatusPill />);
        expect(await screen.findByText('local')).toBeTruthy();
    });

    it('opens a provider menu on click, rather than silently re-pinging', async () => {
        render(<LlmStatusPill />);
        fireEvent.click(await screen.findByTestId('llm-status-pill'));

        // The whole bug: clicking produced no visible affordance.
        expect(screen.getByRole('menu')).toBeTruthy();
        expect(screen.getByText('Anthropic')).toBeTruthy();
        expect(screen.getByText('Google')).toBeTruthy();
    });

    it('switching provider updates the store and the label', async () => {
        render(<LlmStatusPill />);
        fireEvent.click(await screen.findByTestId('llm-status-pill'));
        fireEvent.click(screen.getByText('Google'));

        expect(useMindStore.getState().llmConfig.provider).toBe('google');
        expect(await screen.findByText('google')).toBeTruthy();
    });

    it('closes the menu after choosing', async () => {
        render(<LlmStatusPill />);
        fireEvent.click(await screen.findByTestId('llm-status-pill'));
        fireEvent.click(screen.getByText('Anthropic'));

        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    });

    it('re-pings when the provider changes, so the dot reflects the new choice', async () => {
        render(<LlmStatusPill />);
        await screen.findByText('local');
        const before = vi.mocked(fetch).mock.calls.length;

        fireEvent.click(screen.getByTestId('llm-status-pill'));
        fireEvent.click(screen.getByText('Google'));

        await waitFor(() =>
            expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(before)
        );
        const body = JSON.parse(String(vi.mocked(fetch).mock.calls.at(-1)?.[1]?.body));
        expect(body.provider).toBe('google');
        expect(body.mode).toBe('ping');
    });

    it('reports an unreachable provider with an actionable hint', async () => {
        mockPing(false);
        useMindStore.setState({ llmConfig: { ...LLM_DEFAULTS.google } });
        render(<LlmStatusPill />);

        const pill = await screen.findByTestId('llm-status-pill');
        await waitFor(() =>
            expect(pill.getAttribute('title')).toMatch(/set the google API key in \.env/i)
        );
    });

    it('closes on Escape', async () => {
        render(<LlmStatusPill />);
        fireEvent.click(await screen.findByTestId('llm-status-pill'));
        expect(screen.getByRole('menu')).toBeTruthy();

        fireEvent.keyDown(document, { key: 'Escape' });
        await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    });
});
