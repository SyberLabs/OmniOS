import { test, expect } from '@playwright/test';
import { freshStart } from './helpers';

const KEYLESS_DASHBOARD_NAMES = [
    'Polymarket',
    'CoinGecko',
    'Hacker News',
    'OpenAlex',
    'World Bank',
    'USGS Earthquakes',
    'Open-Meteo',
    'Frankfurter FX',
    'Wikipedia',
    'Open Library',
    'GitHub',
    'Crossref'
];

const KEYLESS_ARMORY_NAMES = [
    'Polymarket',
    'Crypto Markets',
    'Hacker News',
    'OpenAlex',
    'World Bank',
    'Earthquakes',
    'Weather',
    'FX Rates',
    'Wikipedia',
    'Open Library',
    'GitHub',
    'Crossref'
];

test('command center lists every keyless demo API', async ({ page }) => {
    await freshStart(page);
    await page.getByTitle('API Dashboard').click();
    await expect(page.getByText('API Command Center')).toBeVisible();
    await expect(page.getByText('12 work without a key')).toBeVisible();

    for (const name of KEYLESS_DASHBOARD_NAMES) {
        await expect(page.getByText(name).first()).toBeVisible();
    }

    await page.getByRole('button', { name: 'Marketplace' }).click();
    await expect(page.getByText('No key').first()).toBeVisible();
    expect(await page.getByText('No key').count()).toBe(12);
});

test('armory shows every keyless block without opening hidden folders', async ({ page }) => {
    await freshStart(page);

    for (const name of KEYLESS_ARMORY_NAMES) {
        await expect(page.locator('.sidebar').getByText(name, { exact: true })).toBeVisible();
    }
});
