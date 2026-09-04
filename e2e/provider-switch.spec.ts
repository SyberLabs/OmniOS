import { test, expect } from '@playwright/test';
import { freshStart } from './helpers';

/**
 * The TopBar pill is the provider selector. Switching must update the label
 * and re-ping — it used to look like a selector and only refresh.
 */
test('provider switch: TopBar pill changes provider and re-pings', async ({ page }) => {
    await freshStart(page);

    const pill = page.getByTestId('llm-status-pill');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText('local');

    await pill.click();
    await page.getByRole('menuitem', { name: /Anthropic/ }).click();

    await expect(pill).toContainText('anthropic');
    await expect(page.getByRole('menu')).toBeHidden();
    await expect(pill).toHaveAttribute('title', /LLM ready: anthropic/i, { timeout: 10_000 });
});
