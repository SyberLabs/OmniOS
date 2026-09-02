import { expect, type Page } from '@playwright/test';

/**
 * Wipe both persistence engines and boot from a blank app.
 * IndexedDB must go too — localStorage.clear alone leaves OmniVault data
 * that would make later persistence assertions pass vacuously.
 */
export async function freshStart(page: Page): Promise<void> {
    await page.goto('/');
    await page.evaluate(async () => {
        localStorage.clear();
        await new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase('omni-vault');
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
        });
    });
    await page.reload();
}

export async function spawnInvestor(page: Page): Promise<void> {
    await page.getByTitle('Shell Manager').click();
    await page.getByRole('button', { name: 'Use this shell' }).click();
    await expect(page.getByText('Shell Store')).toBeHidden();
    await expect(page.getByText('Analyst').first()).toBeVisible();
}

/** Wait until the OMNI_E2E mock has finished streaming into a persona. */
export async function waitForMockAnswer(page: Page, timeout = 20_000): Promise<void> {
    await expect(page.getByText('E2E MOCK RESPONSE')).toBeVisible({ timeout });
    await expect(page.getByText(/grounded analysis of the wired data\./)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTitle('Think').first()).toBeEnabled();
}
