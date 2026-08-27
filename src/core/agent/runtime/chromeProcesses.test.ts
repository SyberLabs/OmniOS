// ============================================
// Everyday Chrome process matching. No Playwright. No live CDP.
// ============================================

import { afterEach, describe, expect, it } from 'vitest';
import { AgentTabError } from '../errors';
import { clearProcessAttachHttp } from './attach';
import { setFindChromeForTests } from './chrome';
import {
    hasEverydayChrome,
    isEverydayChromeProcess,
    listOsProcesses,
    parsePsPidArgs,
    parseTasklistCsv,
    parseWmicCsv,
    setEverydayChromeRunningForTests,
    setListOsProcessesForTests
} from './chromeProcesses';
import { ensureRuntime, setEverydayChromeRunningForTests as setEnsureEveryday } from './ensure';

afterEach(() => {
    setEverydayChromeRunningForTests(null);
    setEnsureEveryday(null);
    setListOsProcessesForTests(null);
    setFindChromeForTests(null);
    delete process.env.OMNI_CDP_URL;
    clearProcessAttachHttp();
});

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
        expect(
            isEverydayChromeProcess({
                pid: 25,
                name: 'chrome',
                command:
                    '/home/runner/app/node_modules/playwright-core/.local-browsers/chromium-1200/chrome-linux64/chrome'
            })
        ).toBe(false);
        expect(
            isEverydayChromeProcess({
                pid: 26,
                name: 'msedgewebview2.exe',
                command: 'C:\\Program Files (x86)\\Microsoft\\EdgeWebView\\msedgewebview2.exe'
            })
        ).toBe(false);
        expect(
            isEverydayChromeProcess({
                pid: 27,
                name: 'google-chrome-s',
                command: '/usr/bin/google-chrome-stable'
            })
        ).toBe(true);
    });

    it('lists OS processes without throwing (Linux CI / Windows)', () => {
        const listed = listOsProcesses();
        expect(Array.isArray(listed)).toBe(true);
        expect(listed.every((proc) => Number.isInteger(proc.pid) && proc.pid > 0)).toBe(true);
        expect(hasEverydayChrome()).toBe(
            listed.some((proc) => isEverydayChromeProcess(proc))
        );
    });

    it('treats a fixture chrome.exe list as everyday Chrome and fails ensure closed', async () => {
        setListOsProcessesForTests(() => [
            {
                pid: 4400,
                name: 'chrome.exe',
                command: '"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"'
            }
        ]);
        let locateCalls = 0;
        setFindChromeForTests(() => {
            locateCalls += 1;
            return null;
        });
        clearProcessAttachHttp();
        delete process.env.OMNI_CDP_URL;

        try {
            await ensureRuntime();
            throw new Error('expected ensureRuntime to fail');
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(409);
        }
        expect(locateCalls).toBe(0);
        expect(hasEverydayChrome()).toBe(true);
    });

    it('reaches the missing-binary 503 when the process list is empty', async () => {
        setListOsProcessesForTests(() => []);
        setFindChromeForTests(() => null);
        clearProcessAttachHttp();
        delete process.env.OMNI_CDP_URL;

        try {
            await ensureRuntime();
            throw new Error('expected ensureRuntime to fail');
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(503);
            expect((error as AgentTabError).status).not.toBe(409);
        }
        expect(hasEverydayChrome()).toBe(false);
    });

    it('fails closed when the process list cannot be read', async () => {
        setListOsProcessesForTests(() => {
            throw new Error('tasklist unavailable');
        });
        let locateCalls = 0;
        setFindChromeForTests(() => {
            locateCalls += 1;
            return null;
        });

        try {
            await ensureRuntime();
            throw new Error('expected ensureRuntime to fail');
        } catch (error) {
            expect(error).toBeInstanceOf(AgentTabError);
            expect((error as AgentTabError).status).toBe(409);
        }
        expect(locateCalls).toBe(0);
        expect(hasEverydayChrome()).toBe(true);
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
