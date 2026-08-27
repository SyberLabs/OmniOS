import { describe, expect, it } from 'vitest';
import { resolveTabRuntimeKind } from './resolve';

describe('tab runtime resolve', () => {
    it('uses Playwright only as an explicit test/CI adapter', () => {
        expect(
            resolveTabRuntimeKind({
                env: { OMNI_TAB_RUNTIME: 'playwright' },
                hasChrome: true,
                inTest: false
            })
        ).toBe('playwright');
    });

    it('defaults the product path to local Chrome/CDP when Chrome exists', () => {
        expect(
            resolveTabRuntimeKind({
                env: {},
                hasChrome: true,
                hasCdpUrl: false,
                inTest: false
            })
        ).toBe('cdp');
    });

    it('defaults Vitest to the Playwright adapter so CI does not fake the product path', () => {
        expect(
            resolveTabRuntimeKind({
                env: { VITEST: 'true' },
                hasChrome: true,
                inTest: true
            })
        ).toBe('playwright');
    });

    it('honors OMNI_TAB_RUNTIME=cdp even in tests', () => {
        expect(
            resolveTabRuntimeKind({
                env: { OMNI_TAB_RUNTIME: 'cdp', VITEST: 'true' },
                hasChrome: true,
                inTest: true
            })
        ).toBe('cdp');
    });
});
