# Session log

Autonomous session. One entry per backlog item.

## ITEM 1 — SHIPPED
Commit: (this commit)
What: When a persona takes a turn, wires that actually contributed pulse source → target for the duration of the turn. Connected wires that carried no data stay dark.
Why: The product's claim is that context is inspectable architecture. A static colour on every connected wire overstates evidence; pulsing only contributing wires is the honest signal. Reduced-motion keeps a static emphasis so the information survives when animation does not.
Gate: tsc / lint (0 errors) / tests (169) / build / e2e — all green
Notes: `onPrepared` fires synchronously after `preparePersonaTurn` and before the first token. `readingWireIds` is ephemeral UI state (not persisted) and is cleared in `finally`. Cascade needs no special case — each turn sets and clears its own set.
