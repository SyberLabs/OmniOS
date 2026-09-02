import { test, expect } from '@playwright/test';
import { freshStart, spawnInvestor } from './helpers';

/**
 * Hovering a provenance chip must light the block it names. The attribute
 * is the contract — pixels are not.
 */
test('provenance: hovering a source chip highlights its block', async ({ page }) => {
    await freshStart(page);
    await spawnInvestor(page);

    await page.getByTitle('Run chain — think upstream personas first, then this one').click();

    const analystChip = page.getByTestId('provenance-chip').filter({ hasText: 'Analyst' });
    await expect(analystChip).toBeVisible({ timeout: 30_000 });

    await expect(page.locator('.block-card[data-cited="true"]')).toHaveCount(0);

    await analystChip.hover();
    const cited = page.locator('.block-card[data-cited="true"]');
    await expect(cited).toHaveCount(1);
    await expect(cited.getByText('Analyst').first()).toBeVisible();

    await page.getByText('Grounded in').last().hover();
    await expect(page.locator('.block-card[data-cited="true"]')).toHaveCount(0);
});
