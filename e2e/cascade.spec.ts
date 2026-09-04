import { test, expect } from '@playwright/test';
import { freshStart, spawnInvestor } from './helpers';

/**
 * Investor already wires Analyst → Strategist. Run chain must run both, and
 * the downstream answer must cite the upstream: provenance from the turn,
 * not from "there is a wire".
 */
test('cascade: Run chain answers both personas and the downstream cites the upstream', async ({ page }) => {
    await freshStart(page);
    await spawnInvestor(page);

    await page.getByTitle('Run chain: think upstream personas first, then this one').click();

    await expect(page.getByText('E2E MOCK RESPONSE')).toHaveCount(2, { timeout: 30_000 });
    await expect(page.getByTitle('Think').first()).toBeEnabled();
    await expect(page.getByTitle('Think').nth(1)).toBeEnabled();

    const analystChip = page.getByTestId('provenance-chip').filter({ hasText: 'Analyst' });
    await expect(analystChip).toBeVisible();
    await expect(page.getByText('Grounded in').last()).toBeVisible();
});
