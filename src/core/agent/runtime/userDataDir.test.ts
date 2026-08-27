// ============================================
// Default Chrome user-data-dir resolution per OS.
// No Playwright. No live CDP. Does not leak paths on the product payload.
// ============================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
    defaultUserDataDirCandidates,
    resolveExistingDefaultUserDataDir,
    setDefaultUserDataDirForTests
} from './userDataDir';

afterEach(() => {
    setDefaultUserDataDirForTests(null);
});

describe('default Chrome user-data-dir', () => {
    it('this file does not import Playwright', () => {
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
    });

    it('returns Windows / macOS / Linux real profile paths for Chrome, Chromium, and Edge', () => {
        expect(
            defaultUserDataDirCandidates({
                platform: 'win32',
                home: 'C:\\Users\\sam',
                env: { LOCALAPPDATA: 'C:\\Users\\sam\\AppData\\Local' },
                chromeBinary: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            })
        ).toEqual(['C:\\Users\\sam\\AppData\\Local\\Google\\Chrome\\User Data']);

        expect(
            defaultUserDataDirCandidates({
                platform: 'win32',
                home: 'C:\\Users\\sam',
                env: { LOCALAPPDATA: 'C:\\Users\\sam\\AppData\\Local' },
                chromeBinary: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
            })
        ).toEqual(['C:\\Users\\sam\\AppData\\Local\\Microsoft\\Edge\\User Data']);

        expect(
            defaultUserDataDirCandidates({
                platform: 'darwin',
                home: '/Users/sam',
                env: {},
                chromeBinary: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            })
        ).toEqual(['/Users/sam/Library/Application Support/Google Chrome']);

        expect(
            defaultUserDataDirCandidates({
                platform: 'darwin',
                home: '/Users/sam',
                env: {},
                chromeBinary: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
            })
        ).toEqual(['/Users/sam/Library/Application Support/Microsoft Edge']);

        expect(
            defaultUserDataDirCandidates({
                platform: 'linux',
                home: '/home/sam',
                env: {},
                chromeBinary: '/usr/bin/google-chrome'
            })
        ).toEqual(['/home/sam/.config/google-chrome']);

        expect(
            defaultUserDataDirCandidates({
                platform: 'linux',
                home: '/home/sam',
                env: { XDG_CONFIG_HOME: '/home/sam/.xdg' },
                chromeBinary: '/usr/bin/chromium'
            })
        ).toEqual(['/home/sam/.xdg/chromium']);

        expect(
            defaultUserDataDirCandidates({
                platform: 'linux',
                home: '/home/sam',
                env: {},
                chromeBinary: '/usr/bin/microsoft-edge'
            })
        ).toEqual(['/home/sam/.config/microsoft-edge']);
    });

    it('falls back to LOCALAPPDATA / XDG / home when env is thin, and lists chrome then chromium then edge', () => {
        expect(
            defaultUserDataDirCandidates({
                platform: 'win32',
                home: 'C:\\Users\\sam',
                env: {},
                chromeBinary: null
            })
        ).toEqual([
            'C:\\Users\\sam\\AppData\\Local\\Google\\Chrome\\User Data',
            'C:\\Users\\sam\\AppData\\Local\\Chromium\\User Data',
            'C:\\Users\\sam\\AppData\\Local\\Microsoft\\Edge\\User Data'
        ]);

        expect(
            defaultUserDataDirCandidates({
                platform: 'linux',
                home: '/home/sam',
                env: {},
                chromeBinary: null
            })
        ).toEqual([
            '/home/sam/.config/google-chrome',
            '/home/sam/.config/chromium',
            '/home/sam/.config/microsoft-edge'
        ]);
    });

    it('returns no default profile when home is missing (CI / no user-data-dir)', () => {
        expect(
            defaultUserDataDirCandidates({
                platform: 'linux',
                home: '',
                env: {},
                chromeBinary: '/usr/bin/google-chrome'
            })
        ).toEqual([]);
        expect(
            resolveExistingDefaultUserDataDir({
                platform: 'linux',
                home: '',
                env: {},
                chromeBinary: '/usr/bin/google-chrome'
            })
        ).toBeNull();
    });

    it('picks the first candidate that exists on disk', () => {
        const root = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-default-profile-'));
        const chromeDir = path.join(root, 'google-chrome');
        fs.mkdirSync(chromeDir);
        try {
            expect(
                resolveExistingDefaultUserDataDir({
                    platform: 'linux',
                    home: root,
                    env: { XDG_CONFIG_HOME: root },
                    chromeBinary: '/usr/bin/google-chrome'
                })
            ).toBe(chromeDir);
            expect(
                resolveExistingDefaultUserDataDir({
                    platform: 'linux',
                    home: path.join(root, 'no-such-home'),
                    env: { XDG_CONFIG_HOME: path.join(root, 'no-such-xdg') },
                    chromeBinary: '/usr/bin/google-chrome'
                })
            ).toBeNull();
        } finally {
            fs.rmSync(root, { recursive: true, force: true });
        }
    });

    it('implicit test lookup never opens the machine default profile', () => {
        setDefaultUserDataDirForTests(null);
        expect(resolveExistingDefaultUserDataDir()).toBeNull();
        expect(resolveExistingDefaultUserDataDir({ chromeBinary: '/usr/bin/google-chrome' })).toBeNull();
    });

    it('test hook can force an existing default dir or force no default profile', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'omni-hook-default-'));
        try {
            setDefaultUserDataDirForTests(dir);
            expect(resolveExistingDefaultUserDataDir()).toBe(dir);
            setDefaultUserDataDirForTests(false);
            expect(resolveExistingDefaultUserDataDir()).toBeNull();
            setDefaultUserDataDirForTests(path.join(dir, 'missing'));
            expect(resolveExistingDefaultUserDataDir()).toBeNull();
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
