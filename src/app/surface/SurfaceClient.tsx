'use client';

// ============================================
// PROJECT OMNI: AGENT SURFACE — HUMAN VIEW
// Thin local page: live tabs + named affordances. No API key.
// ============================================

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import type { Affordance, AgentTab } from '@/core/agent/types';

type Discovery = {
    name?: string;
    description?: string;
    keyRequired?: boolean;
    affordances?: Affordance[];
};

const FIXTURE = '/agent-fixture.html';

export default function AgentSurfacePage() {
    const [discovery, setDiscovery] = useState<Discovery | null>(null);
    const [tabs, setTabs] = useState<AgentTab[]>([]);
    const [url, setUrl] = useState(FIXTURE);
    const [types, setTypes] = useState<Record<string, string>>({});
    const [navs, setNavs] = useState<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        const [catalogRes, tabsRes] = await Promise.all([
            fetch('/api/agent'),
            fetch('/api/agent/tabs')
        ]);
        const catalog = (await catalogRes.json()) as Discovery;
        const listed = (await tabsRes.json()) as { tabs?: AgentTab[]; error?: string };
        if (!catalogRes.ok) throw new Error('Failed to discover affordances');
        if (!tabsRes.ok) throw new Error(listed.error || 'Failed to list tabs');
        setDiscovery(catalog);
        setTabs(listed.tabs ?? []);
    }, []);

    useEffect(() => {
        refresh().catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Failed to load surface');
        });
    }, [refresh]);

    async function run(task: () => Promise<void>) {
        setBusy(true);
        setError(null);
        try {
            await task();
            await refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed');
        } finally {
            setBusy(false);
        }
    }

    function openTab(event: FormEvent) {
        event.preventDefault();
        void run(async () => {
            const target = url.trim();
            const absolute = target.startsWith('/')
                ? `${window.location.origin}${target}`
                : target;
            const res = await fetch('/api/agent/tabs', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ url: absolute })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Open failed');
        });
    }

    function act(tabId: string, affordance: string, input: Record<string, string>) {
        void run(async () => {
            const res = await fetch(`/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ affordance, input })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Act failed');
        });
    }

    function disposeTab(tabId: string) {
        void run(async () => {
            const res = await fetch(`/api/agent/tabs/${tabId}`, { method: 'DELETE' });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Dispose failed');
        });
    }

    return (
        <div className="min-h-screen bg-[var(--citadel-void)] text-[var(--text-primary)]">
            <header className="border-b border-[var(--citadel-border)] px-6 py-4 flex items-start justify-between gap-6">
                <div>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
                        OmniOS · product
                    </p>
                    <h1 className="text-xl font-semibold mt-1">Keyless agent surface</h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl">
                        This is the product: local tabs, action refs, and a PNG screenshot.
                        An agent or a human can create, read, act, and dispose. No API key.
                    </p>
                    <p className="text-xs text-[var(--truth-green)] mt-2">
                        Contract:{' '}
                        <a href="/api/agent" className="underline hover:text-[var(--text-primary)]">
                            GET /api/agent
                        </a>
                        {discovery?.keyRequired === false ? ' · keyRequired: false' : ''}.
                    </p>
                </div>
                <nav className="flex gap-3 text-xs text-[var(--text-secondary)] shrink-0">
                    <a href="/api/agent" className="hover:text-[var(--text-primary)]">
                        Discover
                    </a>
                    <Link href="/" className="hover:text-[var(--text-primary)]">
                        Citadel
                    </Link>
                    <Link href="/garden" className="hover:text-[var(--text-primary)]">
                        Garden
                    </Link>
                </nav>
            </header>

            {error && (
                <div className="mx-6 mt-4 text-sm text-[var(--truth-red)] border border-[var(--truth-red)]/40 rounded-md px-3 py-2">
                    {error}
                </div>
            )}

            <main className="grid gap-8 lg:grid-cols-2 px-6 py-6">
                <section>
                    <h2 className="text-sm font-medium mb-3">Affordances</h2>
                    <ul className="space-y-2">
                        {(discovery?.affordances ?? []).map((affordance) => (
                            <li
                                key={affordance.id}
                                className="rounded-lg border border-[var(--citadel-border)] bg-[var(--citadel-surface)] px-3 py-2"
                            >
                                <div className="flex items-baseline justify-between gap-3">
                                    <code className="text-xs text-[var(--citadel-secondary)]">
                                        {affordance.id}
                                    </code>
                                    <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                                        {affordance.method} {affordance.path}
                                    </span>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    {affordance.description}
                                </p>
                                <p className="text-[11px] text-[var(--text-muted)] mt-1">
                                    mutates: {affordance.mutates.length ? affordance.mutates.join(', ') : 'none'}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section>
                    <h2 className="text-sm font-medium mb-3">Live tabs</h2>
                    <form onSubmit={openTab} className="flex flex-col gap-2 mb-4">
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://… or /agent-fixture.html"
                            className="bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-md px-3 py-2 text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="submit"
                                disabled={busy || !url.trim()}
                                className="px-3 py-1.5 text-xs rounded-md bg-[var(--citadel-primary)] text-white disabled:opacity-50"
                            >
                                Open URL
                            </button>
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => setUrl(FIXTURE)}
                                className="px-3 py-1.5 text-xs rounded-md border border-[var(--citadel-border)]"
                            >
                                Use local fixture
                            </button>
                        </div>
                    </form>

                    {tabs.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">
                            No live pages yet. Open a URL or POST /api/agent/tabs.
                        </p>
                    ) : (
                        <ul className="space-y-3">
                            {tabs.map((tab) => (
                                <li
                                    key={tab.id}
                                    className="rounded-lg border border-[var(--citadel-border)] bg-[var(--citadel-surface)] p-3"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium">{tab.title || '(untitled page)'}</p>
                                            <code className="text-[10px] text-[var(--text-muted)]">{tab.id}</code>
                                            <p className="text-xs text-[var(--citadel-secondary)] mt-1 break-all">
                                                {tab.url}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => disposeTab(tab.id)}
                                            className="text-[11px] text-[var(--truth-red)] hover:underline disabled:opacity-50"
                                        >
                                            Dispose
                                        </button>
                                    </div>
                                    {tab.screenshot && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={tab.screenshot}
                                            alt={tab.title || 'Tab screenshot'}
                                            className="mt-2 w-full rounded-md border border-[var(--citadel-border)] bg-[var(--citadel-elevated)]"
                                        />
                                    )}
                                    <pre className="mt-2 whitespace-pre-wrap text-xs text-[var(--text-secondary)] bg-[var(--citadel-elevated)] rounded-md px-2 py-2 max-h-40 overflow-auto">
                                        {tab.text || '(no visible text)'}
                                    </pre>
                                    <ul className="mt-2 space-y-1">
                                        {(tab.actions ?? []).map((action) => (
                                            <li
                                                key={action.ref}
                                                className="flex flex-wrap items-center gap-2 text-[11px] bg-[var(--citadel-elevated)] rounded-md px-2 py-1.5"
                                            >
                                                <code className="text-[var(--citadel-secondary)]">{action.ref}</code>
                                                <span className="text-[var(--text-muted)]">{action.role}</span>
                                                <span className="text-[var(--text-primary)] truncate">
                                                    {action.name}
                                                </span>
                                                {action.actions.includes('click') && (
                                                    <button
                                                        type="button"
                                                        disabled={busy}
                                                        onClick={() =>
                                                            act(tab.id, 'tab.click', { ref: action.ref })
                                                        }
                                                        className="ml-auto px-2 py-0.5 rounded border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] disabled:opacity-50"
                                                    >
                                                        Click
                                                    </button>
                                                )}
                                                {action.actions.includes('type') && (
                                                    <>
                                                        <input
                                                            value={types[`${tab.id}:${action.ref}`] ?? ''}
                                                            onChange={(e) =>
                                                                setTypes((prev) => ({
                                                                    ...prev,
                                                                    [`${tab.id}:${action.ref}`]: e.target.value
                                                                }))
                                                            }
                                                            placeholder="text"
                                                            className="ml-auto w-28 bg-[var(--citadel-void)] border border-[var(--citadel-border)] rounded px-1 py-0.5"
                                                        />
                                                        <button
                                                            type="button"
                                                            disabled={busy}
                                                            onClick={() =>
                                                                act(tab.id, 'tab.type', {
                                                                    ref: action.ref,
                                                                    text: types[`${tab.id}:${action.ref}`] ?? ''
                                                                })
                                                            }
                                                            className="px-2 py-0.5 rounded border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] disabled:opacity-50"
                                                        >
                                                            Type
                                                        </button>
                                                    </>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    <input
                                        value={navs[tab.id] ?? tab.url}
                                        onChange={(e) =>
                                            setNavs((prev) => ({ ...prev, [tab.id]: e.target.value }))
                                        }
                                        placeholder="Navigate to URL"
                                        className="mt-2 w-full bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-md px-2 py-1.5 text-sm"
                                    />
                                    <button
                                        type="button"
                                        disabled={busy || !(navs[tab.id] ?? tab.url)}
                                        onClick={() =>
                                            act(tab.id, 'tab.navigate', { url: navs[tab.id] ?? tab.url })
                                        }
                                        className="mt-2 px-2 py-1 text-[11px] rounded-md border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] disabled:opacity-50"
                                    >
                                        Navigate
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    );
}
