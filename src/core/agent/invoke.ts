// ============================================
// PROJECT OMNI: AGENT SURFACE — INVOKE
// Async dispatcher for live-page affordances. No keys, no providers.
// ============================================

import { getAffordance } from './affordances';
import {
    AgentTabError,
    clickTab,
    disposeTab,
    listTabs,
    navigateTab,
    openTab,
    readTab,
    typeTab
} from './browserTabs';
import type { HandlerResult, InvokeInput } from './types';

function asObject(value: unknown): InvokeInput {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return value as InvokeInput;
}

function stringField(input: InvokeInput, key: string): string | undefined {
    const value = input[key];
    return typeof value === 'string' ? value : undefined;
}

function resolveTabId(input: InvokeInput, pathTabId?: string): string | undefined {
    return pathTabId || stringField(input, 'tabId') || stringField(input, 'id');
}

function missingTab(tabId: string): HandlerResult {
    return {
        status: 404,
        body: { error: `Tab not found: ${tabId}`, keyRequired: false }
    };
}

function badRequest(error: string): HandlerResult {
    return { status: 400, body: { error, keyRequired: false } };
}

function fail(error: unknown): HandlerResult {
    if (error instanceof AgentTabError) {
        return { status: error.status, body: { error: error.message, keyRequired: false } };
    }
    return {
        status: 500,
        body: {
            error: error instanceof Error ? error.message : 'Tab action failed',
            keyRequired: false
        }
    };
}

async function applyPageAct(
    actId: string,
    tabId: string,
    input: InvokeInput
): Promise<HandlerResult> {
    try {
        if (actId === 'tab.navigate') {
            const url = stringField(input, 'url');
            if (!url) return badRequest('tab.navigate requires input.url');
            const tab = await navigateTab(tabId, url);
            return { status: 200, body: { tab, mutated: ['tab.page', 'tab.storage'], keyRequired: false } };
        }
        if (actId === 'tab.click') {
            const ref = stringField(input, 'ref');
            const selector = stringField(input, 'selector');
            if (!ref && !selector) return badRequest('tab.click requires input.ref or input.selector');
            const tab = await clickTab(tabId, { ref, selector });
            return { status: 200, body: { tab, mutated: ['tab.page', 'tab.storage'], keyRequired: false } };
        }
        if (actId === 'tab.type') {
            const ref = stringField(input, 'ref');
            const selector = stringField(input, 'selector');
            const text = stringField(input, 'text');
            if ((!ref && !selector) || text == null) {
                return badRequest('tab.type requires input.text and input.ref or input.selector');
            }
            const tab = await typeTab(tabId, { ref, selector }, text);
            return { status: 200, body: { tab, mutated: ['tab.page', 'tab.storage'], keyRequired: false } };
        }
        return badRequest(`Unknown page act: ${actId}`);
    } catch (error) {
        return fail(error);
    }
}

export async function invokeAffordance(
    affordanceId: string,
    rawInput?: unknown,
    pathTabId?: string
): Promise<HandlerResult> {
    const affordance = getAffordance(affordanceId);
    if (!affordance) {
        return badRequest(`Unknown affordance: ${affordanceId}`);
    }

    const input = asObject(rawInput);

    try {
        switch (affordanceId) {
            case 'tabs.list':
                return { status: 200, body: { tabs: await listTabs(), keyRequired: false } };

            case 'tabs.create': {
                const url = stringField(input, 'url');
                if (!url) return badRequest('tabs.create requires url');
                const tab = await openTab(url);
                return { status: 201, body: { tab, keyRequired: false } };
            }

            case 'tabs.read': {
                const tabId = resolveTabId(input, pathTabId);
                if (!tabId) return badRequest('tabs.read requires tabId');
                const tab = await readTab(tabId);
                return { status: 200, body: { tab, keyRequired: false } };
            }

            case 'tabs.dispose': {
                const tabId = resolveTabId(input, pathTabId);
                if (!tabId) return badRequest('tabs.dispose requires tabId');
                const disposed = await disposeTab(tabId);
                return { status: 200, body: { disposed, keyRequired: false } };
            }

            case 'tabs.act': {
                const tabId = resolveTabId(input, pathTabId);
                if (!tabId) return badRequest('tabs.act requires tabId');
                const nestedId = stringField(input, 'affordance');
                if (!nestedId) return badRequest('tabs.act requires affordance');
                return applyPageAct(nestedId, tabId, asObject(input.input));
            }

            case 'tab.navigate':
            case 'tab.click':
            case 'tab.type': {
                const tabId = resolveTabId(input, pathTabId);
                if (!tabId) return badRequest(`${affordanceId} requires tabId`);
                return applyPageAct(affordanceId, tabId, input);
            }

            default:
                return badRequest(`Unknown affordance: ${affordanceId}`);
        }
    } catch (error) {
        if (error instanceof AgentTabError && error.status === 404) {
            const tabId = resolveTabId(input, pathTabId) || 'unknown';
            return missingTab(tabId);
        }
        return fail(error);
    }
}

export async function readJsonBody(request: Request): Promise<unknown> {
    const text = await request.text();
    if (!text.trim()) return {};
    try {
        return JSON.parse(text);
    } catch {
        throw new Error('Invalid JSON body');
    }
}
