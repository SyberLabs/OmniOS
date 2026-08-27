'use client';

// ============================================
// PROJECT OMNI: AGENT SURFACE — HUMAN VIEW
// Thin local page: tabs + named affordances. No API key.
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

export default function AgentSurfacePage() {
    const [discovery, setDiscovery] = useState<Discovery | null>(null);
    const [tabs, setTabs] = useState<AgentTab[]>([]);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [urls, setUrls] = useState<Record<string, string>>({});
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
        setNotes((prev) => {
            const next = { ...prev };
            for (const tab of listed.tabs ?? []) {
                if (next[tab.id] == null) next[tab.id] = tab.note ?? '';
            }
            return next;
        });
        setUrls((prev) => {
            const next = { ...prev };
            for (const tab of listed.tabs ?? []) {
                if (next[tab.id] == null) next[tab.id] = tab.url ?? '';
            }
            return next;
        });
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

    function createTab(event: FormEvent) {
        event.preventDefault();
        void run(async () => {
            const res = await fetch('/api/agent/tabs', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim() || undefined,
                    url: url.trim() || undefined
                })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Create failed');
            setTitle('');
            setUrl('');
        });
    }

    function writeNote(tabId: string) {
        void run(async () => {
            const res = await fetch(`/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    affordance: 'tab.write_note',
                    input: { text: notes[tabId] ?? '' }
                })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Write note failed');
        });
    }

    function setTabUrl(tabId: string, nextUrl: string) {
        void run(async () => {
            const res = await fetch(`/api/agent/tabs/${tabId}/act`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    affordance: 'tab.set_url',
                    input: { url: nextUrl }
                })
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error || 'Set URL failed');
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
                        OmniOS · agent surface
                    </p>
                    <h1 className="text-xl font-semibold mt-1">
                        {discovery?.name ?? 'Local tabs + affordances'}
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-2xl">
                        {discovery?.description ??
                            'Persistent browser/session state an arbitrary agent can act on.'}
                    </p>
                    <p className="text-xs text-[var(--truth-green)] mt-2">
                        No API key required{discovery?.keyRequired === false ? ' · keyRequired: false' : ''}.
                    </p>
                </div>
                <nav className="flex gap-3 text-xs text-[var(--text-secondary)] shrink-0">
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
                    <h2 className="text-sm font-medium mb-3">Tabs</h2>
                    <form onSubmit={createTab} className="flex flex-col gap-2 mb-4">
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Tab title"
                            className="bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-md px-3 py-2 text-sm"
                        />
                        <input
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="URL / session locator (optional)"
                            className="bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-md px-3 py-2 text-sm"
                        />
                        <button
                            type="submit"
                            disabled={busy}
                            className="self-start px-3 py-1.5 text-xs rounded-md bg-[var(--citadel-primary)] text-white disabled:opacity-50"
                        >
                            Create tab
                        </button>
                    </form>

                    {tabs.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">
                            No tabs yet. Create one here or POST /api/agent/tabs.
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
                                            <p className="text-sm font-medium">{tab.title}</p>
                                            <code className="text-[10px] text-[var(--text-muted)]">{tab.id}</code>
                                            <p className="text-xs text-[var(--text-muted)] mt-1 break-all">
                                                persisted: {tab.url || 'no url'}
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
                                    <input
                                        value={urls[tab.id] ?? tab.url ?? ''}
                                        onChange={(e) =>
                                            setUrls((prev) => ({ ...prev, [tab.id]: e.target.value }))
                                        }
                                        placeholder="URL / session locator"
                                        className="mt-2 w-full bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-md px-2 py-1.5 text-sm"
                                    />
                                    <textarea
                                        value={notes[tab.id] ?? tab.note ?? ''}
                                        onChange={(e) =>
                                            setNotes((prev) => ({ ...prev, [tab.id]: e.target.value }))
                                        }
                                        placeholder="Local note"
                                        rows={3}
                                        className="mt-2 w-full bg-[var(--citadel-elevated)] border border-[var(--citadel-border)] rounded-md px-2 py-1.5 text-sm"
                                    />
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => writeNote(tab.id)}
                                            className="px-2 py-1 text-[11px] rounded-md border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] disabled:opacity-50"
                                        >
                                            Write note
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => setTabUrl(tab.id, urls[tab.id] ?? '')}
                                            className="px-2 py-1 text-[11px] rounded-md border border-[var(--citadel-border)] hover:border-[var(--citadel-primary)] disabled:opacity-50"
                                        >
                                            Set URL
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    );
}
