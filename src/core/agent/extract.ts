// ============================================
// Shared in-page extract for refs. String so CDP and
// the Playwright test adapter can both evaluate it.
// ============================================

import type { Actionable, PageLink } from './types';

export const EXTRACT_ACTIONS_SOURCE = `(() => {
    const nodes = [
        ...document.querySelectorAll('a[href], button, input:not([type="hidden"]), textarea, select')
    ].filter((el) => {
        const node = el;
        if (node.hidden || node.getAttribute('hidden') !== null) return false;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        return true;
    });

    const escape = (value) =>
        typeof CSS !== 'undefined' && CSS.escape
            ? CSS.escape(value)
            : value.replace(/[^a-zA-Z0-9_-]/g, '\\\\$&');

    function roleOf(el) {
        const tag = el.tagName.toLowerCase();
        const type = (el.getAttribute('type') || '').toLowerCase();
        if (tag === 'a') return 'link';
        if (tag === 'button' || type === 'button' || type === 'submit') return 'button';
        if (type === 'checkbox') return 'checkbox';
        if (tag === 'select') return 'combobox';
        return 'textbox';
    }

    function nameOf(el) {
        const aria = el.getAttribute('aria-label');
        if (aria) return aria.trim();
        if (el.id) {
            const labelled = document.querySelector('label[for="' + el.id + '"]');
            if (labelled && labelled.textContent) return labelled.textContent.trim();
        }
        const wrapped = el.closest('label');
        if (wrapped) {
            const clone = wrapped.cloneNode(true);
            clone.querySelectorAll('input, textarea, select, button').forEach((n) => n.remove());
            const labelText = clone.textContent && clone.textContent.trim();
            if (labelText) return labelText;
        }
        const placeholder = el.getAttribute('placeholder');
        if (placeholder) return placeholder.trim();
        const text = el.textContent && el.textContent.trim();
        if (text) return text.slice(0, 80);
        return el.getAttribute('name') || el.id || el.tagName.toLowerCase();
    }

    function selectorOf(el, index) {
        if (el.id) return '#' + escape(el.id);
        const name = el.getAttribute('name');
        const tag = el.tagName.toLowerCase();
        if (name) return tag + '[name="' + escape(name) + '"]';
        return tag + '[data-omni-ref="e' + index + '"]';
    }

    return nodes.slice(0, 40).map((el, i) => {
        const ref = 'e' + (i + 1);
        el.setAttribute('data-omni-ref', ref);
        const role = roleOf(el);
        const actions = role === 'textbox' ? ['type'] : ['click'];
        const href = el.tagName.toLowerCase() === 'a' ? el.href : '';
        const value = 'value' in el ? String(el.value || '') : '';
        return {
            ref: ref,
            role: role,
            name: nameOf(el),
            href: href,
            value: value,
            actions: actions,
            selector: selectorOf(el, i + 1)
        };
    });
})()`;

type RawAction = {
    ref: string;
    role: Actionable['role'];
    name: string;
    href: string;
    value: string;
    actions: Array<'click' | 'type'>;
    selector: string;
};

export function actionsFromRaw(raw: RawAction[]): Actionable[] {
    return raw.map((item) => {
        const action: Actionable = {
            ref: item.ref,
            role: item.role,
            name: item.name,
            actions: item.actions,
            selector: item.selector
        };
        if (item.href) action.href = item.href;
        if (item.value) action.value = item.value;
        return action;
    });
}

export function linksFromActions(actions: Actionable[]): PageLink[] {
    return actions
        .filter((action) => action.role === 'link' && action.href)
        .map((action) => ({ href: action.href as string, text: action.name }));
}
