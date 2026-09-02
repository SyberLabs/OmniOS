# Session log

Autonomous session. One entry per backlog item.

## ITEM 1 — SHIPPED
Commit: 0126c3e
What: When a persona takes a turn, wires that actually contributed pulse source → target for the duration of the turn. Connected wires that carried no data stay dark.
Why: The product's claim is that context is inspectable architecture. A static colour on every connected wire overstates evidence; pulsing only contributing wires is the honest signal. Reduced-motion keeps a static emphasis so the information survives when animation does not.
Gate: tsc / lint (0 errors) / tests (169) / build / e2e — all green
Notes: `onPrepared` fires synchronously after `preparePersonaTurn` and before the first token. `readingWireIds` is ephemeral UI state (not persisted) and is cleared in `finally`. Cascade needs no special case — each turn sets and clears its own set.

## ITEM 2 — SHIPPED
Commit: 998fc1c
What: Fixed the three React Compiler correctness errors: Canvas no longer treats a view lookup as creating a component during render; Metaculus no longer invents `Date.now()` on render; CodeBlock's `Date.now()` moved out of the component body.
Why: A component type created in render remounts the subtree every pass. A fake timestamp on render hid "never fetched". The compiler was right.
Gate: tsc / lint (0 errors, 48 warnings remaining for items 3/6/9) / tests (172) / build / e2e — all green
Notes: Canvas uses `createElement(BlockViews[id])` so the registered type stays stable. Metaculus now matches every other truth block (`lastUpdated` is the store's, or null).

## ITEM 3 — SHIPPED
Commit: (this commit)
What: Cleared the 7 setState-in-effect and 2 exhaustive-deps warnings without disabling rules. Client mount uses `useSyncExternalStore`. Workspace blocks read stored data during render (or as the store itself). The LLM pill fetches after the effect, not by setState inside it.
Why: Derived state in an effect is a cascading render. A hydration `setHasMounted(true)` effect is the same bug with a prettier name.
Gate: tsc / lint (0 errors, 38 warnings left for items 6/9 and unused vars) / tests (172) / build / e2e — all green
Notes: Canvas memo now filters `blocks` in the function body so `blocks` is a real dependency. Resize effect lists `updatePosition`. Did not suppress anything.
