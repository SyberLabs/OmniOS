# Findings

Things noticed during the session that were not the item in hand.

## dnd-kit block cards are buttons that swallow inner button names
Where: `src/components/blocks/BlockCard.tsx` (the `motion.div` is a dnd-kit draggable, which sets `role="button"`). Inner controls like World Bank's `Apply` then collide in the accessibility tree: Playwright saw two "Apply" buttons, one of them the entire card (`World Bank World Bank` plus the inner label).
Why it matters: keyboard and AT users get a giant button wrapping other buttons. The persistence e2e had to use `{ name: 'Apply', exact: true }` to escape it.
What I would do: stop promoting the card itself to `role="button"` (dnd-kit `role` option / drag handle only), so inner controls keep unique names.

## Empty OmniItem arrays are cited as grounding
Where: `src/core/services/wire.service.ts` ~85–86. `extractBlockData` returns the string `'(No data)'` for an empty `items` array, and `aggregateWireContext` treats any returned string as a contributing source.
Why it matters: the invariant is that a source which carried no data is not grounding and must not be cited. A connected-but-empty block would still pulse (item 1) and still get a provenance chip.
What I would do: return `null` for empty items / empty memory, matching the persona-error path that already returns null rather than propagating noise.

## Mind panel Think still snapshots the whole shell
Where: `src/core/services/mind.engine.ts` `think()` / `thinkStream()` via `captureShellSnapshot()`.
Why it matters: persona turns are wire-only. The Mind panel's Think is a second path that feeds the LLM a snapshot of every block, including ones with no wire. That is a different surface than a persona, but it is still context you cannot point at on the canvas.
What I would do: either retire Mind-panel Think in favour of persona turns, or make it consume only wired/pinned blocks so the two paths cannot diverge.

## Unused ApiConfig on the block schema
Where: `src/core/schemas/block.schema.ts` ~190. A separate `ApiConfig` with an `apiKey` field. Nothing imports it.
Why it matters: a second type named ApiConfig next to `api.schema.ts`'s is how a key field reappears by accident.
What I would do: delete the unused interface.

## Unused store lookups
Where: `PersonaBlock.tsx` ~48 `getBlock`, `WireHandle.tsx` ~61 `getBlock`, `MindPanel.tsx` ~9 `useBlockStore`.
Why it matters: lint warnings only, but they are leftovers from earlier edits.
What I would do: drop the unused bindings.

## FRED / Alpha Vantage must put the key in the upstream query string
Where: `src/core/services/server/data.providers.ts` FRED and Alpha Vantage `buildRequest`. Those APIs have no header auth.
Why it matters: the key is in a URL we send to the provider (allowed) and could appear in an undici error message (now stripped from the 502 body). Access logs on their side are theirs.
What I would do: nothing further unless a provider adds header auth.

## Turbopack compile cache can hold inlined env values
Where: `.next/cache/turbopack/**/*.sst` after `next build`. Not the client bundle (`.next/static` was clean).
Why it matters: a machine-local cache is inside the security boundary, but copying `.next` off the machine would copy it.
What I would do: keep `.next` gitignored (it is). Do not treat cache hits as a client leak.


