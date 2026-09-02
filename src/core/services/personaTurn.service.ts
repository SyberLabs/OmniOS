// ============================================
// PROJECT OMNI: PERSONA TURN (block-level)
//
// Running a turn used to live inside the PersonaBlock component, which meant
// only the component rendering a persona could make it think. That is fine
// until one persona needs to run another — the cascade — so the turn moved
// here, where it is addressed by block id and needs no React at all.
//
// Layering: persona.engine assembles the prompt and streams it (pure); this
// owns the block-store side effects — draft messages, thinking state,
// provenance, throttled commits.
// ============================================

import { useBlockStore } from '@/core/stores/blockStore';
import { useWireStore } from '@/core/stores/wireStore';
import { useUIStore } from '@/core/stores/uiStore';
import { streamPersonaTurn } from './persona.engine';
import type { PersonaBlockData, ContextSource } from '@/core/schemas/wire.schema';

/**
 * How often a streaming answer is published to the store. Fast enough to read
 * as live typing, slow enough that the canvas is not re-rendered per token.
 */
export const STREAM_COMMIT_MS = 80;

export interface PersonaTurnOutcome {
    ran: boolean;
    success: boolean;
    error?: string;
}

/**
 * Run one persona's turn and stream it into its block.
 *
 * Never throws: a failure is committed into the conversation as a visible
 * warning, because a persona that silently does nothing is worse than one
 * that says why.
 */
export async function runPersonaTurn(
    instanceId: string,
    userMessage?: string
): Promise<PersonaTurnOutcome> {
    const store = useBlockStore.getState();
    const block = store.getBlock(instanceId);
    const current = block?.data as PersonaBlockData | undefined;

    if (!current) return { ran: false, success: false, error: 'Persona block not found.' };
    if (current.isThinking) return { ran: false, success: false, error: 'Already thinking.' };

    const baseMessages = userMessage
        ? [
            ...current.messages,
            {
                id: `msg-${Date.now()}`,
                role: 'user' as const,
                content: userMessage,
                timestamp: Date.now()
            }
        ]
        : current.messages;

    // Show the user message immediately + thinking state.
    store.updateData(instanceId, { ...current, messages: baseMessages, isThinking: true });

    const assistantId = `msg-${Date.now()}-a`;
    let acc = '';
    // Provenance comes from the turn itself. A wire that is connected but
    // carried no data did not feed this answer and must not be cited.
    let turnSources: ContextSource[] = [];

    const commit = (content: string, isThinking: boolean) => {
        const latest =
            (useBlockStore.getState().getBlock(instanceId)?.data as PersonaBlockData) || current;
        const withoutDraft = latest.messages.filter(m => m.id !== assistantId);
        useBlockStore.getState().updateData(instanceId, {
            ...latest,
            isThinking,
            lastContextUpdate: Date.now(),
            messages: [
                ...withoutDraft,
                {
                    id: assistantId,
                    role: 'assistant' as const,
                    content,
                    timestamp: Date.now(),
                    sourcedFrom: turnSources.map(x => x.id),
                    sources: turnSources
                }
            ]
        });
    };

    try {
        const gen = streamPersonaTurn({
            instanceId,
            personaType: current.personaType,
            customName: current.customName,
            history: current.messages,
            userMessage,
            onPrepared: (sources) => {
                const incoming = useWireStore.getState().getWiresToBlock(instanceId);
                const contributing = new Set(sources.map(s => s.id));
                useUIStore.getState().setReadingWires(
                    incoming.filter(w => contributing.has(w.sourceBlockId)).map(w => w.id)
                );
            }
        });

        // Accumulate every token, but publish on a clock. commit() writes to
        // the global block store, so a per-token commit re-rendered the whole
        // canvas once per token — hundreds of full renders per answer, felt
        // exactly when the user is watching most closely. Nothing is lost: acc
        // holds every token and the final commit below always runs.
        let lastCommit = 0;
        let result = await gen.next();
        while (!result.done) {
            acc += result.value;
            const now = Date.now();
            if (now - lastCommit >= STREAM_COMMIT_MS) {
                lastCommit = now;
                commit(acc, true);
            }
            result = await gen.next();
        }

        const final = result.value;
        turnSources = final.sources;

        if (!final.success) {
            commit(`⚠️ ${final.error}`, false);
            return { ran: true, success: false, error: final.error };
        }

        commit(final.content || acc, false);
        return { ran: true, success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Something went wrong.';
        commit(`⚠️ ${message}`, false);
        return { ran: true, success: false, error: message };
    } finally {
        useUIStore.getState().setReadingWires([]);
    }
}
