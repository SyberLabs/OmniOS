// ============================================
// PROJECT OMNI: AGENT SURFACE — KEYLESS AFFORDANCES
// Named, machine-readable actions an arbitrary agent can take.
// No API-key product. No Ollama/Anthropic/Gemini/NewsAPI.
// ============================================

import type { Affordance } from './types';

export const AGENT_PRODUCT = {
    name: 'OmniOS agent surface',
    keyRequired: false as const,
    description:
        'Local lightweight tabs: persistent browser/session state records. ' +
        'Not a Citadel canvas and not a hosted-model chat. No API key is required.',
    invoke: {
        method: 'POST' as const,
        path: '/api/agent',
        body: { affordance: '<id>', input: {} }
    }
};

const none: JsonObject = { type: 'object', additionalProperties: false };

type JsonObject = Affordance['inputSchema'];

export const AGENT_AFFORDANCES: Affordance[] = [
    {
        id: 'tabs.list',
        description: 'List local lightweight tabs.',
        method: 'GET',
        path: '/api/agent/tabs',
        inputSchema: none,
        mutates: [],
        keyRequired: false
    },
    {
        id: 'tabs.create',
        description: 'Create a local lightweight tab (persistent browser/session state).',
        method: 'POST',
        path: '/api/agent/tabs',
        inputSchema: {
            type: 'object',
            additionalProperties: false,
            properties: {
                title: { type: 'string', description: 'Human-readable tab title' },
                url: { type: 'string', description: 'Session locator / URL' },
                note: { type: 'string', description: 'Optional starting note' }
            }
        },
        mutates: ['tabs'],
        keyRequired: false
    },
    {
        id: 'tabs.read',
        description: 'Read one tab by id.',
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
        description: 'Apply a named local act to a tab (write_note, set_url).',
        method: 'POST',
        path: '/api/agent/tabs/{id}/act',
        inputSchema: {
            type: 'object',
            required: ['affordance'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string', description: 'Tab id (or path {id})' },
                affordance: {
                    type: 'string',
                    enum: ['tab.write_note', 'tab.set_url'],
                    description: 'Local act to apply'
                },
                input: { type: 'object', description: 'Act-specific fields' }
            }
        },
        mutates: ['tab'],
        keyRequired: false
    },
    {
        id: 'tabs.dispose',
        description: 'Dispose a tab and drop its session state.',
        method: 'DELETE',
        path: '/api/agent/tabs/{id}',
        inputSchema: {
            type: 'object',
            required: ['tabId'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string', description: 'Tab id (or path {id})' }
            }
        },
        mutates: ['tabs'],
        keyRequired: false
    },
    {
        id: 'tab.write_note',
        description: 'Write a local note onto a tab. No model, no key.',
        method: 'POST',
        path: '/api/agent/tabs/{id}/act',
        inputSchema: {
            type: 'object',
            required: ['text'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' },
                text: { type: 'string', description: 'Note body to persist on the tab' }
            }
        },
        mutates: ['tab.note', 'tab.state'],
        keyRequired: false
    },
    {
        id: 'tab.set_url',
        description: 'Set the tab URL / session locator.',
        method: 'POST',
        path: '/api/agent/tabs/{id}/act',
        inputSchema: {
            type: 'object',
            required: ['url'],
            additionalProperties: false,
            properties: {
                tabId: { type: 'string' },
                url: { type: 'string', description: 'URL or locator stored on the tab' }
            }
        },
        mutates: ['tab.url', 'tab.state'],
        keyRequired: false
    }
];

export function getAffordance(id: string): Affordance | undefined {
    return AGENT_AFFORDANCES.find((a) => a.id === id);
}

export function discoveryBody() {
    return {
        ...AGENT_PRODUCT,
        affordances: AGENT_AFFORDANCES
    };
}
