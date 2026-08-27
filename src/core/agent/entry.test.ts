// ============================================
// Product entry: README + /surface, not create-next-app / Citadel.
// Does not import Playwright or CDP internals.
// ============================================

import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

function read(rel: string) {
    return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('product entry is the agent surface', () => {
    it('README leads with the keyless agent surface, not create-next-app', () => {
        const readme = read('README.md');
        const lead = readme.slice(0, 900);
        expect(lead).toMatch(/keyless agent surface/i);
        expect(lead).toMatch(/\/api\/agent/);
        expect(lead).toMatch(/\/surface/);
        expect(lead).toMatch(/Chrome|CDP/i);
        expect(lead).toMatch(/Playwright/);
        expect(lead).toMatch(/test adapter/i);
        expect(lead.toLowerCase()).not.toContain('create-next-app');
        expect(lead.toLowerCase()).not.toContain('bootstrapped');

        const citadelAt = readme.toLowerCase().indexOf('citadel');
        const surfaceAt = readme.indexOf('/surface');
        expect(surfaceAt).toBeGreaterThan(-1);
        expect(citadelAt).toBeGreaterThan(surfaceAt);
    });

    it('/surface copy names the product and links discover', () => {
        const page = read('src/app/surface/page.tsx');
        const client = read('src/app/surface/SurfaceClient.tsx');
        expect(client).toMatch(/this is the product/i);
        expect(client).toMatch(/no API key/i);
        expect(client).toMatch(/href=["']\/api\/agent["']/);
        expect(client).toMatch(/refs?/);
        expect(client).toMatch(/screenshot/i);
        expect(page).toContain('LOOP_BUTTON_ID');
        expect(page).toContain('loop');
        expect(page).not.toMatch(/redirect\(['"]\/['"]\)/);
        expect(client).not.toMatch(/redirect\(['"]\/['"]\)/);
    });

    it('README documents attach-to-open Chrome as a first-class how-to', () => {
        const readme = read('README.md');
        expect(readme).toMatch(/^## Attach to an already-open Chrome/m);
        expect(readme).toMatch(/remote-debugging-port/);
        expect(readme).toMatch(/runtime\.attach/);
        expect(readme).toMatch(/cdpUrl/);
        expect(readme).toMatch(/does not quit/i);
        const attachHeading = readme.indexOf('## Attach to an already-open Chrome');
        const envFootnote = readme.indexOf('Optional attach to an already-running browser');
        expect(attachHeading).toBeGreaterThan(-1);
        expect(envFootnote).toBe(-1);
    });

    it('does not rewrite Citadel home', () => {
        const home = read('src/app/page.tsx');
        expect(home).toContain('CitadelApp');
        expect(home).not.toContain('/surface');
    });
});
