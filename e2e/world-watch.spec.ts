import { test, expect } from '@playwright/test';
import { freshStart } from './helpers';

test('world watch: keyless live-data shell lands on the canvas', async ({ page }) => {
    await freshStart(page);
    await page.getByTitle('Shell Manager').click();
    await page.locator('.group').filter({ hasText: 'World Watch' }).getByRole('button', { name: 'Use this shell' }).click();
    await expect(page.getByText('Shell Store')).toBeHidden();

    await expect(page.getByText('Analyst').first()).toBeVisible();
    await expect(page.getByText('Weather').first()).toBeVisible();
    await expect(page.getByText('Earthquakes').first()).toBeVisible();
    await expect(page.getByText('Wikipedia').first()).toBeVisible();
    await expect(page.getByText('FX Rates').first()).toBeVisible();
    await expect(page.getByText('GitHub').first()).toBeVisible();
    await expect(page.getByTestId('wire').first()).toBeVisible();
    expect(await page.getByTestId('wire').count()).toBeGreaterThanOrEqual(5);
});
