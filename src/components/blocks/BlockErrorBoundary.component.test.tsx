// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlockErrorBoundary } from './BlockErrorBoundary';

// React logs caught boundary errors via console.error — silence for the test.
let consoleSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => consoleSpy.mockRestore());

function Bomb({ defused }: { defused?: boolean }) {
    if (!defused) throw new Error('kaboom');
    return <div>view recovered</div>;
}

describe('BlockErrorBoundary — failure isolation (apex A5)', () => {
    it('renders children when nothing throws', () => {
        render(
            <BlockErrorBoundary blockName="Polymarket">
                <div>healthy view</div>
            </BlockErrorBoundary>
        );
        expect(screen.getByText('healthy view')).toBeTruthy();
        expect(screen.queryByTestId('block-crash-fallback')).toBeNull();
    });

    it('catches a crashing view and shows the in-card fallback', () => {
        render(
            <BlockErrorBoundary blockName="Polymarket">
                <Bomb />
            </BlockErrorBoundary>
        );
        expect(screen.getByTestId('block-crash-fallback')).toBeTruthy();
        expect(screen.getByText('Polymarket crashed')).toBeTruthy();
        expect(screen.getByText(/kaboom/)).toBeTruthy();
        expect(screen.getByText(/rest of the canvas is unaffected/i)).toBeTruthy();
    });

    it('a crash in one boundary does not affect a sibling boundary', () => {
        render(
            <>
                <BlockErrorBoundary blockName="Crasher">
                    <Bomb />
                </BlockErrorBoundary>
                <BlockErrorBoundary blockName="Healthy">
                    <div>still standing</div>
                </BlockErrorBoundary>
            </>
        );
        expect(screen.getByText('Crasher crashed')).toBeTruthy();
        expect(screen.getByText('still standing')).toBeTruthy();
    });

    it('Retry re-mounts the child (recovers when the fault is transient)', () => {
        let defused = false;
        function FlakyBomb() {
            return <Bomb defused={defused} />;
        }
        render(
            <BlockErrorBoundary blockName="Flaky">
                <FlakyBomb />
            </BlockErrorBoundary>
        );
        expect(screen.getByText('Flaky crashed')).toBeTruthy();

        defused = true;
        fireEvent.click(screen.getByText('Retry'));

        expect(screen.getByText('view recovered')).toBeTruthy();
        expect(screen.queryByTestId('block-crash-fallback')).toBeNull();
    });
});
