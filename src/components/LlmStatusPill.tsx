'use client';

// ============================================
// PROJECT OMNI: LLM STATUS PILL (apex A5)
// Startup ping: answers "is my LLM reachable?" at a glance in the TopBar.
// Uses /api/llm mode:'ping' (key presence for cloud, live Ollama ping for
// local) — no generation, no keys exposed. Click to re-check.
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { Brain } from 'lucide-react';
import { useMindStore } from '@/core/stores/mindStore';
import { cn } from '@/lib/utils';

type PillStatus = 'checking' | 'available' | 'unavailable';

export function LlmStatusPill() {
    const llmConfig = useMindStore(state => state.llmConfig);
    const [status, setStatus] = useState<PillStatus>('checking');

    // Persisted-store reads differ between server and client on first paint;
    // render nothing until mounted (same pattern as the rest of the TopBar).
    const [hasMounted, setHasMounted] = useState(false);
    useEffect(() => { setHasMounted(true); }, []);

    const ping = useCallback(async () => {
        setStatus('checking');
        try {
            const res = await fetch('/api/llm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'ping',
                    provider: llmConfig.provider,
                    baseUrl: llmConfig.baseUrl
                })
            });
            const data = res.ok ? await res.json() : { available: false };
            setStatus(data.available === true ? 'available' : 'unavailable');
        } catch {
            setStatus('unavailable');
        }
    }, [llmConfig.provider, llmConfig.baseUrl]);

    useEffect(() => {
        if (hasMounted) void ping();
    }, [hasMounted, ping]);

    if (!hasMounted) return null;

    const hint = status === 'available'
        ? `LLM ready: ${llmConfig.provider} · ${llmConfig.model}`
        : status === 'unavailable'
            ? (llmConfig.provider === 'local'
                ? 'LLM unavailable — start Ollama (localhost:11434). Click to re-check.'
                : `LLM unavailable — set the ${llmConfig.provider} API key in .env. Click to re-check.`)
            : 'Checking LLM availability…';

    return (
        <button
            onClick={() => void ping()}
            title={hint}
            data-testid="llm-status-pill"
            className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--citadel-border)] bg-[var(--citadel-elevated)] hover:border-[var(--citadel-primary)] transition-colors"
        >
            <Brain className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span
                className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    status === 'available' && 'bg-[var(--truth-green)]',
                    status === 'unavailable' && 'bg-[var(--truth-red)]',
                    status === 'checking' && 'bg-[var(--truth-amber)] animate-pulse'
                )}
            />
            <span className="text-[10px] text-[var(--text-muted)]">{llmConfig.provider}</span>
        </button>
    );
}

export default LlmStatusPill;
