// ============================================
// Everyday Chrome process matching. No Playwright. No live CDP.
// ============================================

import { describe, expect, it } from 'vitest';
import {
    isEverydayChromeProcess,
    parsePsPidArgs,
    parseTasklistCsv,
    parseWmicCsv
} from './chromeProcesses';

describe('everyday Chrome process matching', () => {
    it('this file does not import Playwright', async () => {
        const fs = await import('node:fs');
        const imports = fs
            .readFileSync(new URL(import.meta.url), 'utf8')
            .split('\n')
            .filter((line) => /^\s*import\s/.test(line))
            .join('\n');
        expect(imports).not.toMatch(/playwright/i);
    });

    it('matches Windows chrome.exe / msedge.exe and Linux / macOS browser binaries', () => {
        expect(
            isEverydayChromeProcess({
                pid: 11,
                name: 'chrome.exe',
                command: '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"'
            })
        ).toBe(true);
        expect(
            isEverydayChromeProcess({
                pid: 12,
                name: 'msedge.exe',
                command: '"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"'
            })
        ).toBe(true);
        expect(
            isEverydayChromeProcess({
                pid: 13,
                name: 'chrome',
                command: '/opt/google/chrome/chrome'
            })
        ).toBe(true);
        expect(
            isEverydayChromeProcess({
                pid: 14,
                name: 'chromium',
                command: '/usr/bin/chromium --enable-crashpad'
            })
        ).toBe(true);
        expect(
            isEverydayChromeProcess({
                pid: 15,
                name: 'Google Chrome',
                command: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
            })
        ).toBe(true);
    });

    it('ignores helpers, Playwright browsers, and the ensure debug profile', () => {
        expect(
            isEverydayChromeProcess({
                pid: 21,
                name: 'chrome',
                command: '/opt/google/chrome/chrome --type=renderer'
            })
        ).toBe(false);
        expect(
            isEverydayChromeProcess({
                pid: 22,
                name: 'chrome',
                command:
                    '/home/runner/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome --headless'
            })
        ).toBe(false);
        expect(
            isEverydayChromeProcess(
                {
                    pid: 23,
                    name: 'chrome',
                    command: '/usr/bin/google-chrome --user-data-dir=/tmp/omni-chrome-debug-vitest-1'
                },
                { debugProfile: '/tmp/omni-chrome-debug-vitest-1' }
            )
        ).toBe(false);
        expect(
            isEverydayChromeProcess({
                pid: 24,
                name: 'cursor',
                command: '/usr/share/cursor/cursor --type=zygote'
            })
        ).toBe(false);
    });

    it('parses Linux ps, Windows tasklist, and wmic listings', () => {
        const linux = parsePsPidArgs(
            ['  101 /opt/google/chrome/chrome', '  102 /usr/bin/chromium --type=gpu-process'].join(
                '\n'
            )
        );
        expect(linux).toEqual([
            { pid: 101, name: 'chrome', command: '/opt/google/chrome/chrome' },
            { pid: 102, name: 'chromium', command: '/usr/bin/chromium --type=gpu-process' }
        ]);

        const tasklist = parseTasklistCsv(
            [
                '"chrome.exe","4400","Console","1","120,000 K"',
                '"msedge.exe","4401","Console","1","80,000 K"'
            ].join('\r\n')
        );
        expect(tasklist).toEqual([
            { pid: 4400, name: 'chrome.exe', command: 'chrome.exe' },
            { pid: 4401, name: 'msedge.exe', command: 'msedge.exe' }
        ]);

        const wmic = parseWmicCsv(
            [
                'Node,CommandLine,ExecutablePath,Name,ProcessId',
                'BOX,"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe,chrome.exe,8800'
            ].join('\r\n')
        );
        expect(wmic).toEqual([
            {
                pid: 8800,
                name: 'chrome.exe',
                command: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
            }
        ]);
    });
});
