// ============================================
// Frozen /api/agent product contract.
// Callers depend on affordances + snapshot shape, not CDP or Playwright.
// ============================================

import type { JsonSchema } from './types';

export const AGENT_CONTRACT_VERSION = 1 as const;

export const FROZEN_AFFORDANCE_IDS = [
    'runtime.ensure',
    'runtime.attach',
    'runtime.targets',
    'tabs.list',
    'tabs.create',
    'tabs.bind',
    'tabs.read',
    'tabs.act',
    'tabs.dispose',
    'tab.navigate',
    'tab.click',
    'tab.type',
    'tab.screenshot'
] as const;

export type FrozenAffordanceId = (typeof FROZEN_AFFORDANCE_IDS)[number];

export const SNAPSHOT_REQUIRED_FIELDS = [
    'id',
    'title',
    'url',
    'text',
    'actions',
    'screenshot'
] as const;

export const TAB_RUNTIME_KINDS = ['cdp', 'playwright'] as const;

export const FORBIDDEN_CALLER_KEYS = [
    'browserContext',
    'BrowserContext',
    'storageState',
    'debugPort',
    'webSocketDebuggerUrl',
    'userDataDir',
    'profileDir',
    'profilePath',
    'cdpUrl',
    'wsUrl'
] as const;

const actionSchema: JsonSchema = {
    type: 'object',
    required: ['ref', 'role', 'name', 'actions'],
    properties: {
        ref: { type: 'string' },
        role: { type: 'string' },
        name: { type: 'string' },
        actions: { type: 'array' },
        href: { type: 'string' },
        value: { type: 'string' },
        selector: { type: 'string' }
    }
};

export const AGENT_TARGET_SCHEMA: JsonSchema = {
    type: 'object',
    required: ['id', 'title', 'url'],
    properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        url: { type: 'string' }
    }
};

export const AGENT_TAB_SNAPSHOT_SCHEMA: JsonSchema = {
    type: 'object',
    required: [...SNAPSHOT_REQUIRED_FIELDS],
    properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        url: { type: 'string' },
        text: { type: 'string' },
        actions: { type: 'array', items: actionSchema },
        screenshot: { type: 'string' },
        links: { type: 'array' },
        createdAt: { type: 'number' },
        updatedAt: { type: 'number' }
    }
};

const affordanceSchema: JsonSchema = {
    type: 'object',
    required: ['id', 'description', 'method', 'path', 'inputSchema', 'mutates', 'keyRequired'],
    properties: {
        id: { type: 'string' },
        description: { type: 'string' },
        method: { type: 'string' },
        path: { type: 'string' },
        inputSchema: { type: 'object' },
        mutates: { type: 'array' },
        keyRequired: { type: 'boolean' }
    }
};

export const AGENT_DISCOVERY_SCHEMA: JsonSchema = {
    type: 'object',
    required: ['name', 'keyRequired', 'description', 'invoke', 'affordances', 'contract'],
    properties: {
        name: { type: 'string' },
        keyRequired: { type: 'boolean' },
        description: { type: 'string' },
        invoke: { type: 'object' },
        tabRuntime: { type: 'string', enum: [...TAB_RUNTIME_KINDS] },
        affordances: { type: 'array', items: affordanceSchema },
        contract: {
            type: 'object',
            required: ['version', 'snapshotRequired', 'tabRuntime'],
            properties: {
                version: { type: 'number' },
                snapshotRequired: { type: 'array' },
                tabRuntime: { type: 'object' }
            }
        }
    }
};

export function contractDiscoveryMeta() {
    return {
        version: AGENT_CONTRACT_VERSION,
        snapshotRequired: [...SNAPSHOT_REQUIRED_FIELDS],
        tabRuntime: {
            discoveryOnly: true as const,
            enum: [...TAB_RUNTIME_KINDS]
        }
    };
}

export function validateAgainstSchema(schema: JsonSchema, value: unknown, at = '$'): string[] {
    const errors: string[] = [];
    const expected = schema.type;
    const actual = Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value;
    if (expected === 'object' && (actual !== 'object' || value === null)) {
        return [`${at}: expected object, got ${actual}`];
    }
    if (expected === 'array' && actual !== 'array') {
        return [`${at}: expected array, got ${actual}`];
    }
    if (expected === 'string' && actual !== 'string') {
        return [`${at}: expected string, got ${actual}`];
    }
    if (expected === 'number' && actual !== 'number') {
        return [`${at}: expected number, got ${actual}`];
    }
    if (expected === 'boolean' && actual !== 'boolean') {
        return [`${at}: expected boolean, got ${actual}`];
    }
    if (schema.enum && (typeof value !== 'string' || !schema.enum.includes(value))) {
        errors.push(`${at}: expected one of ${schema.enum.join('|')}`);
    }
    if (expected === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
        const record = value as Record<string, unknown>;
        for (const key of schema.required || []) {
            if (!(key in record)) errors.push(`${at}: missing ${key}`);
        }
        for (const [key, child] of Object.entries(schema.properties || {})) {
            if (key in record) errors.push(...validateAgainstSchema(child, record[key], `${at}.${key}`));
        }
    }
    if (expected === 'array' && Array.isArray(value) && schema.items) {
        value.forEach((item, index) => {
            errors.push(...validateAgainstSchema(schema.items!, item, `${at}[${index}]`));
        });
    }
    return errors;
}
