// ============================================
// PROJECT OMNI: AGENT SURFACE — INVOKE
// Single dispatcher for named affordances. No keys, no providers.
// ============================================

import { getAffordance } from './affordances';
import { getAgentTabStore } from './tabStore';
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

function applyWriteNote(tabId: string, input: InvokeInput): HandlerResult {
    const text = stringField(input, 'text') ?? stringField(input, 'note');
    if (text == null) return badRequest('write_note requires input.text');
    const tab = getAgentTabStore().writeNote(tabId, text);
    if (!tab) return missingTab(tabId);
    return { status: 200, body: { tab, mutated: ['tab.note', 'tab.state'], keyRequired: false } };
}

function applySetUrl(tabId: string, input: InvokeInput): HandlerResult {
    const url = stringField(input, 'url');
    if (url == null) return badRequest('set_url requires input.url');
    const tab = getAgentTabStore().setUrl(tabId, url);
    if (!tab) return missingTab(tabId);
    return { status: 200, body: { tab, mutated: ['tab.url', 'tab.state'], keyRequired: false } };
}

function applyLocalAct(actId: string, tabId: string, input: InvokeInput): HandlerResult {
    if (actId === 'tab.write_note') return applyWriteNote(tabId, input);
    if (actId === 'tab.set_url') return applySetUrl(tabId, input);
    return badRequest(`Unknown local act: ${actId}`);
}

export function invokeAffordance(
    affordanceId: string,
    rawInput?: unknown,
    pathTabId?: string
): HandlerResult {
    const affordance = getAffordance(affordanceId);
    if (!affordance) {
        return badRequest(`Unknown affordance: ${affordanceId}`);
    }

    const input = asObject(rawInput);
    const store = getAgentTabStore();

    switch (affordanceId) {
        case 'tabs.list':
            return { status: 200, body: { tabs: store.list(), keyRequired: false } };

        case 'tabs.create': {
            const tab = store.create({
                title: stringField(input, 'title'),
                url: stringField(input, 'url'),
                note: stringField(input, 'note')
            });
            return { status: 201, body: { tab, keyRequired: false } };
        }

        case 'tabs.read': {
            const tabId = resolveTabId(input, pathTabId);
            if (!tabId) return badRequest('tabs.read requires tabId');
            const tab = store.read(tabId);
            if (!tab) return missingTab(tabId);
            return { status: 200, body: { tab, keyRequired: false } };
        }

        case 'tabs.dispose': {
            const tabId = resolveTabId(input, pathTabId);
            if (!tabId) return badRequest('tabs.dispose requires tabId');
            const tab = store.dispose(tabId);
            if (!tab) return missingTab(tabId);
            return { status: 200, body: { disposed: tabId, keyRequired: false } };
        }

        case 'tabs.act': {
            const tabId = resolveTabId(input, pathTabId);
            if (!tabId) return badRequest('tabs.act requires tabId');
            const nestedId = stringField(input, 'affordance');
            if (!nestedId) return badRequest('tabs.act requires affordance');
            return applyLocalAct(nestedId, tabId, asObject(input.input));
        }

        case 'tab.write_note':
        case 'tab.set_url': {
            const tabId = resolveTabId(input, pathTabId);
            if (!tabId) return badRequest(`${affordanceId} requires tabId`);
            return applyLocalAct(affordanceId, tabId, input);
        }

        default:
            return badRequest(`Unknown affordance: ${affordanceId}`);
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
