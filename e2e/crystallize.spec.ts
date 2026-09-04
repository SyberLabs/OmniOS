import { test, expect } from '@playwright/test';
import { freshStart, spawnInvestor, waitForMockAnswer } from './helpers';

/**
 * Think → Crystallize → a Memory block appears, wired back, holding the text.
 * Crystallizing must produce something the user can SEE — not a hidden pool.
 */
test('crystallize: Think then Crystallize creates a wired Memory block', async ({ page }) => {
    await freshStart(page);
    await spawnInvestor(page);

    const wiresBefore = await page.getByTestId('wire').count();

    await page.getByTitle('Think').first().click();
    await waitForMockAnswer(page);

    await page.getByTitle('Keep this as memory — it becomes a block you can wire anywhere').click();
    await expect(page.getByText('Kept in a new Memory block')).toBeVisible();

    await expect(page.getByText('Memory').first()).toBeVisible();
    await expect(page.getByText('E2E MOCK RESPONSE').nth(1)).toBeVisible();
    await expect(page.getByPlaceholder('Remember something…')).toBeVisible();

    expect(await page.getByTestId('wire').count()).toBeGreaterThan(wiresBefore);
});
