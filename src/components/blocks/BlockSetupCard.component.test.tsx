// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlockSetupCard } from './BlockSetupCard';

describe('BlockSetupCard', () => {
    it('renders the server message verbatim', () => {
        const message = 'FRED requires an API key. Set FRED_API_KEY in .env.';
        render(<BlockSetupCard message={message} />);

        expect(screen.getByText(message)).toBeTruthy();
        expect(screen.queryByText(/Loading/i)).toBeNull();
    });

    it('an env-var message reads as setup, not a crash', () => {
        render(
            <BlockSetupCard message="NewsAPI requires an API key. Set NEWS_API_KEY in .env." />
        );

        const card = screen.getByTestId('block-setup-card');
        expect(card.getAttribute('data-kind')).toBe('setup');
        expect(screen.getByText('Needs configuration')).toBeTruthy();
        expect(screen.queryByText(/crash/i)).toBeNull();
    });

    it('a non-setup failure still shows the server text', () => {
        const message = 'Rate limit exceeded. Try again later.';
        render(<BlockSetupCard message={message} />);

        expect(screen.getByText(message)).toBeTruthy();
        expect(screen.getByTestId('block-setup-card').getAttribute('data-kind')).toBe('error');
        expect(screen.queryByText('Needs configuration')).toBeNull();
    });
});
