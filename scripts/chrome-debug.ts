// Companion only: start a local Chrome with remote debugging.
// Product path for an arbitrary agent is runtime.ensure (empty input), not this flag.

import { spawn } from 'node:child_process';
import { findChrome } from '../src/core/agent/runtime/chrome';
import { debugChromeProfile, DEFAULT_DEBUG_PORT } from '../src/core/agent/runtime/ensure';
import { ensureDir } from '../src/core/agent/runtime/paths';

const chrome = findChrome();
if (!chrome) {
    console.error('No Chrome/Chromium/Edge found. Install Chrome or set OMNI_CHROME_PATH.');
    console.error('An agent should call runtime.ensure — it launches Chrome when needed.');
    process.exit(1);
}

const profile = debugChromeProfile();
ensureDir(profile);
const port = Number(process.env.OMNI_CHROME_DEBUG_PORT || DEFAULT_DEBUG_PORT);

console.error(`Starting ${chrome}`);
console.error(`remote debugging: http://127.0.0.1:${port}`);
console.error(`profile: ${profile} (dedicated OmniOS debug profile)`);
console.error('Then (no CLI flag for the agent):');
console.error(
    `curl -X POST http://localhost:3000/api/agent -H 'content-type: application/json' -d '{"affordance":"runtime.ensure","input":{}}'`
);

const child = spawn(
    chrome,
    [
        `--user-data-dir=${profile}`,
        `--remote-debugging-port=${String(port)}`,
        '--remote-debugging-address=127.0.0.1',
        '--no-first-run',
        '--no-default-browser-check'
    ],
    { stdio: 'inherit' }
);
child.on('exit', (code) => process.exit(code ?? 0));
