// ============================================
// Detect a running everyday Chrome/Chromium/Edge that is not our debug process.
// Used so runtime.ensure fails closed instead of launching a second Chrome.
// Windows (user box) and Linux (CI) both work. Does not kill Chrome.
// ============================================

import { execSync } from 'node:child_process';
import fs from 'node:fs';

export type ChromeProcess = {
    pid: number;
    name: string;
    command: string;
};

export type EverydayChromeOptions = {
    excludePids?: Iterable<number>;
    debugProfile?: string;
};

const BROWSER_NAMES = new Set([
    'chrome',
    'chromium',
    'chromium-browser',
    'google-chrome',
    'google-chrome-stable',
    'google-chrome-beta',
    'google-chrome-unstable',
    'google-chrome-dev',
    'msedge',
    'microsoft-edge',
    'microsoft-edge-stable',
    'microsoft-edge-beta',
    'microsoft-edge-dev'
]);

const LINUX_COMM_PREFIXES = [
    'google-chrome-',
    'chromium-browse',
    'microsoft-edge-'
];

let everydayChromeOverride: boolean | null = null;
let listOsProcessesOverride: (() => ChromeProcess[]) | null = null;

export function setEverydayChromeRunningForTests(value: boolean | null): void {
    everydayChromeOverride = value;
}

export function setListOsProcessesForTests(fn: (() => ChromeProcess[]) | null): void {
    listOsProcessesOverride = fn;
}

function processBasename(file: string): string {
    return file.replace(/\\/g, '/').split('/').pop() || file;
}

function stripExe(name: string): string {
    return name.replace(/\.exe$/i, '');
}

function firstToken(command: string): string {
    const trimmed = command.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('"')) {
        const end = trimmed.indexOf('"', 1);
        return end > 0 ? trimmed.slice(1, end) : trimmed;
    }
    return trimmed.split(/\s+/, 1)[0] || '';
}

function normalizePath(value: string): string {
    return value.replace(/\\/g, '/').toLowerCase();
}

function isPlaywrightBrowser(haystack: string): boolean {
    const lower = normalizePath(haystack);
    return (
        lower.includes('ms-playwright') ||
        lower.includes('playwright-core') ||
        /(?:^|\/)playwright(?:\/|$|-)/.test(lower)
    );
}

function looksLikeBrowserName(raw: string): boolean {
    const name = stripExe(processBasename(raw).trim()).toLowerCase();
    if (!name) return false;
    if (BROWSER_NAMES.has(name)) return true;
    if (name === 'google chrome' || name.startsWith('google chrome ')) return !name.includes('helper');
    if (name === 'microsoft edge' || name.startsWith('microsoft edge ')) {
        return !name.includes('helper');
    }
    if (LINUX_COMM_PREFIXES.some((prefix) => name.startsWith(prefix))) return true;
    return false;
}

export function isEverydayChromeProcess(
    proc: ChromeProcess,
    options: EverydayChromeOptions = {}
): boolean {
    if (options.excludePids) {
        for (const pid of options.excludePids) {
            if (proc.pid === pid) return false;
        }
    }

    const hay = `${proc.name} ${proc.command}`;
    if (isPlaywrightBrowser(hay)) return false;
    if (/(?:^|\s)--type=/.test(proc.command)) return false;
    if (/helper|crashpad|headless[_-]?shell/i.test(proc.name)) return false;
    if (options.debugProfile && normalizePath(proc.command).includes(normalizePath(options.debugProfile))) {
        return false;
    }

    if (looksLikeBrowserName(proc.name)) return true;
    return looksLikeBrowserName(firstToken(proc.command));
}

export function parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                cur += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            out.push(cur);
            cur = '';
        } else {
            cur += ch;
        }
    }
    out.push(cur);
    return out;
}

export function parsePsPidArgs(text: string): ChromeProcess[] {
    const out: ChromeProcess[] = [];
    for (const raw of text.split(/\r?\n/)) {
        const match = raw.match(/^\s*(\d+)\s+(.*)$/);
        if (!match) continue;
        const command = match[2].trim();
        if (!command) continue;
        out.push({
            pid: Number(match[1]),
            name: processBasename(firstToken(command)),
            command
        });
    }
    return out;
}

export function parseTasklistCsv(text: string): ChromeProcess[] {
    const out: ChromeProcess[] = [];
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim();
        if (!line) continue;
        const cols = parseCsvLine(line);
        const name = (cols[0] || '').trim();
        const pid = Number(cols[1]);
        if (!name || !Number.isInteger(pid) || pid <= 0) continue;
        out.push({ pid, name, command: name });
    }
    return out;
}

export function parseWmicCsv(text: string): ChromeProcess[] {
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    const header = parseCsvLine(lines[0]).map((col) => col.trim().toLowerCase());
    const nameAt = header.indexOf('name');
    const pidAt = header.indexOf('processid');
    const cmdAt = header.indexOf('commandline');
    const pathAt = header.indexOf('executablepath');
    if (nameAt < 0 || pidAt < 0) return [];

    const out: ChromeProcess[] = [];
    for (const line of lines.slice(1)) {
        const cols = parseCsvLine(line);
        const name = (cols[nameAt] || '').trim();
        const pid = Number(cols[pidAt]);
        if (!name || !Number.isInteger(pid) || pid <= 0) continue;
        const command = (cols[cmdAt] || cols[pathAt] || name).trim() || name;
        out.push({ pid, name, command });
    }
    return out;
}

function runCapture(command: string): string {
    return execSync(command, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout: 4000,
        windowsHide: true
    });
}

function listLinuxProc(): ChromeProcess[] | null {
    const out: ChromeProcess[] = [];
    let entries: string[];
    try {
        entries = fs.readdirSync('/proc');
    } catch {
        return null;
    }
    for (const entry of entries) {
        if (!/^\d+$/.test(entry)) continue;
        const pid = Number(entry);
        let name = '';
        let command = '';
        try {
            name = fs.readFileSync(`/proc/${pid}/comm`, 'utf8').trim();
        } catch {
            continue;
        }
        try {
            command = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ').trim();
        } catch {
            command = name;
        }
        out.push({ pid, name, command: command || name });
    }
    return out;
}

function listViaPs(): ChromeProcess[] | null {
    try {
        return parsePsPidArgs(runCapture('ps -axo pid=,args='));
    } catch {
        try {
            return parsePsPidArgs(runCapture('ps -eo pid=,args='));
        } catch {
            return null;
        }
    }
}

function listWindows(): ChromeProcess[] | null {
    try {
        const json = runCapture(
            'powershell -NoProfile -NonInteractive -Command ' +
                '"Get-CimInstance Win32_Process | ' +
                "Where-Object { $_.Name -match 'chrome|msedge|chromium' } | " +
                'Select-Object ProcessId,Name,ExecutablePath,CommandLine | ' +
                'ConvertTo-Json -Compress"'
        ).trim();
        if (!json) return [];
        const parsed = JSON.parse(json) as
            | Array<{
                  ProcessId?: number;
                  Name?: string;
                  ExecutablePath?: string;
                  CommandLine?: string;
              }>
            | {
                  ProcessId?: number;
                  Name?: string;
                  ExecutablePath?: string;
                  CommandLine?: string;
              };
        const rows = Array.isArray(parsed) ? parsed : [parsed];
        const out: ChromeProcess[] = [];
        for (const row of rows) {
            const pid = Number(row.ProcessId);
            const name = String(row.Name || '').trim();
            if (!name || !Number.isInteger(pid) || pid <= 0) continue;
            out.push({
                pid,
                name,
                command: String(row.CommandLine || row.ExecutablePath || name)
            });
        }
        return out;
    } catch {
        // wmic / tasklist fallback
    }

    try {
        return parseWmicCsv(
            runCapture(
                'wmic process where "Name=\'chrome.exe\' or Name=\'msedge.exe\' or Name=\'chromium.exe\'" ' +
                    'get ProcessId,Name,ExecutablePath,CommandLine /FORMAT:CSV'
            )
        );
    } catch {
        // tasklist last resort
    }

    const chunks: ChromeProcess[] = [];
    let listed = false;
    for (const image of ['chrome.exe', 'msedge.exe', 'chromium.exe']) {
        try {
            chunks.push(
                ...parseTasklistCsv(runCapture(`tasklist /FI "IMAGENAME eq ${image}" /FO CSV /NH`))
            );
            listed = true;
        } catch {
            // try remaining image names
        }
    }
    if (!listed) return null;
    return chunks.filter((proc) => !/^INFO:/i.test(proc.name));
}

export function listOsProcesses(): ChromeProcess[] {
    if (listOsProcessesOverride) return listOsProcessesOverride();
    if (process.platform === 'win32') {
        const listed = listWindows();
        if (!listed) throw new Error('Cannot list Chrome processes on Windows');
        return listed;
    }
    if (process.platform === 'linux') {
        const fromProc = listLinuxProc();
        if (fromProc) return fromProc;
    }
    const fromPs = listViaPs();
    if (fromPs) return fromPs;
    throw new Error('Cannot list Chrome processes');
}

export function hasEverydayChrome(options: EverydayChromeOptions = {}): boolean {
    if (everydayChromeOverride !== null) return everydayChromeOverride;
    try {
        return listOsProcesses().some((proc) => isEverydayChromeProcess(proc, options));
    } catch {
        // Fail closed: if we cannot tell, do not launch a second Chrome.
        return true;
    }
}
