// ============================================
// PROJECT OMNI: AGENT SURFACE — KEYLESS AFFORDANCES
// Named actions over live disposable browser tabs.
// No API-key product. No Ollama/Anthropic/Gemini/NewsAPI.
// ============================================

import { contractDiscoveryMeta } from './contract';
import { resolveTabRuntimeKind } from './runtime';
import type { Affordance } from './types';

export const AGENT_PRODUCT = {
    name: 'OmniOS agent surface',
    keyRequired: false as const,
    description:
        'Local lightweight tabs: attach to an already-open Chrome (runtime.attach), list its ' +
        'pages (runtime.targets), bind one (tabs.bind), or launch a disposable Chrome/Chromium/Edge ' +
        'profile (.omni/profiles/<tabId>). Not a Citadel canvas and not a hosted-model chat. ' +
        'Playwright is a test/CI adapter (OMNI_TAB_RUNTIME=playwright). No API key is required.',
    invoke: {
        method: 'POST' as const,
        path: '/api/agent',
        body: { affordance: '<id>', input: {} }
    }
};

const none: Affordance['inputSchema'] = { type: 'object', additionalProperties: false };

export const AGENT_AFFORDANCES: Affordance[] = [
    {
        id: 'runtime.attach',
        description:
            'Point OmniOS at an already-open Chrome with remote debugging ' +
            '(chrome --remote-debugging-port=9222). After attach, runtime.targets lists already-open ' +
            'pages and tabs.bind adopts one. tabs.create still opens a new page/target in that Chrome. ' +
            'Launching a disposable profile remains the default when you do not attach.',
        method: 'POST',
        path: '/api/agent',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                cdpUrl: {
                    type: 'string',
                    description: 'Chrome DevTools HTTP endpoint, e.g. http://127.0.0.1:9222'
                },
                port: {
                    type: 'number',
                    description: 'localhost remote-debugging-port (alternative to cdpUrl)'
                }
            }
        },
        mutates: ['runtime'],
        keyRequired: false
    },
    {
        id: 'runtime.targets',
        description:
            'List already-open pages in the attached Chrome as {id, title, url}. ' +
            'Requires runtime.attach first. Does not include CDP ports, profile paths, or BrowserContext.',
        method: 'POST',
        path: '/api/agent',
        inputSchema: none,
        mutates: [],
        keyRequired: false
    },
    {
        id: 'tabs.list',
        description: 'List live local browser tabs (last title, URL, excerpt).',
        method: 'GET',
        path: '/api/agent/tabs',
        inputSchema: none,
        mutates: [],
        keyRequired: false
    },
    {
        id: 'tabs.create',
        description:
            'Open a URL in a new isolated browser tab (own cookies/storage). ' +
            'After runtime.attach, the page is created in that already-open Chrome; otherwise ' +
            'OmniOS launches a disposable profile. Response is a full page snapshot.',
        method: 'POST',
        path: '/api/agent/tabs',
        inputSchema: {
            type: 'object',
            required: ['url'],
            additionalProperties: false,
            properties: {
                url: { type: 'string', description: 'http(s) URL to load' }
            }
        },
        mutates: ['tabs'],
        keyRequired: false
    },
    {
        id: 'tabs.bind',
        description:
            'Make an already-open Chrome page an OmniOS tab (snapshot + refs + screenshot + act-by-ref). ' +
            'Input targetId is the id from runtime.targets. Requires runtime.attach. ' +
            'tabs.dispose on a bound tab unbinds and does not close the user page.',
        method: 'POST',
        path: '/api/agent',
        inputSchema: {
            type: 'object',
            required: ['targetId'],
            additionalProperties: false,
            properties: {
                targetId: {
                    type: 'string',
                    description: 'Page id from runtime.targets'
                }
            }
        },
        mutates: ['tabs'],
        keyRequired: false
    },
    {
        id: 'tabs.read',
        description: 'Read the live page: title, URL, visible text, action refs, and screenshot URL.',
        method: 'GET',
        path: '/api/agent/tabs/{id}',
        inputSchema: {
            type: 'object',
            required: ['tabId'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string', description: 'Tab id (or path {id})' }
            }
        },
        mutates: [],
        keyRequired: false
    },
    {
        id: 'tabs.act',
        description: 'Apply a named page act (navigate, click, type). Response is a fresh snapshot.',
        method: 'POST',
        path: '/api/agent/tabs/{id}/act',
        inputSchema: {
            type: 'object',
            required: ['affordance'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' },
                affordance: {
                    type: 'string',
                    enum: ['tab.navigate', 'tab.click', 'tab.type'],
                    description: 'Page act to apply'
                },
                input: { type: 'object', description: 'Act-specific fields' }
            }
        },
        mutates: ['tab.page'],
        keyRequired: false
    },
    {
        id: 'tabs.dispose',
        description:
            'Close the OmniOS tab and drop its cookies/storage. Later read/act fail. ' +
            'On a bound page (tabs.bind), this unbinds only — the user page stays open. ' +
            'On an OmniOS-created page (tabs.create), this closes that page/target. ' +
            'It never quits an attached user Chrome process.',
        method: 'DELETE',
        path: '/api/agent/tabs/{id}',
        inputSchema: {
            type: 'object',
            required: ['tabId'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' }
            }
        },
        mutates: ['tabs'],
        keyRequired: false
    },
    {
        id: 'tab.navigate',
        description: 'Navigate the tab to a URL. Response is a fresh snapshot of the new page.',
        method: 'POST',
        path: '/api/agent/tabs/{id}/act',
        inputSchema: {
            type: 'object',
            required: ['url'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' },
                url: { type: 'string', description: 'http(s) URL to load' }
            }
        },
        mutates: ['tab.page', 'tab.storage'],
        keyRequired: false
    },
    {
        id: 'tab.click',
        description: 'Click by snapshot ref (selector fallback). Response is a fresh snapshot.',
        method: 'POST',
        path: '/api/agent/tabs/{id}/act',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' },
                ref: { type: 'string', description: 'Stable ref from tabs.read actions[]' },
                selector: { type: 'string', description: 'CSS selector fallback' }
            }
        },
        mutates: ['tab.page', 'tab.storage'],
        keyRequired: false
    },
    {
        id: 'tab.type',
        description: 'Type by snapshot ref (selector fallback). Response is a fresh snapshot.',
        method: 'POST',
        path: '/api/agent/tabs/{id}/act',
        inputSchema: {
            type: 'object',
            required: ['text'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' },
                ref: { type: 'string', description: 'Stable ref from tabs.read actions[]' },
                selector: { type: 'string', description: 'CSS selector fallback' },
                text: { type: 'string', description: 'Text to fill' }
            }
        },
        mutates: ['tab.page', 'tab.storage'],
        keyRequired: false
    },
    {
        id: 'tab.screenshot',
        description:
            'Capture a PNG of the live tab. Fetch the durable URL as image/png. ' +
            'Create/read/act also include tab.screenshot.',
        method: 'GET',
        path: '/api/agent/tabs/{id}/screenshot',
        inputSchema: {
            type: 'object',
            required: ['tabId'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' }
            }
        },
        mutates: [],
        keyRequired: false
    }
];

export function getAffordance(id: string): Affordance | undefined {
    return AGENT_AFFORDANCES.find((a) => a.id === id);
}

export function discoveryBody() {
    return {
        ...AGENT_PRODUCT,
        tabRuntime: resolveTabRuntimeKind(),
        contract: contractDiscoveryMeta(),
        affordances: AGENT_AFFORDANCES
    };
}
