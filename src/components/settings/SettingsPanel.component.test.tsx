// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPanel } from './SettingsPanel';
import { getKeylessApis } from '@/core/schemas/api.schema';

describe('Settings — demo APIs are named', () => {
    it('lists every keyless connector so settings does not only mention Polymarket', () => {
        render(<SettingsPanel isOpen onClose={vi.fn()} />);

        expect(screen.getByText('Demo APIs (no key)')).toBeTruthy();
        for (const api of getKeylessApis()) {
            expect(screen.getByText(api.name), api.id).toBeTruthy();
        }
    });
});
