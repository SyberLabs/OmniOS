# Findings

Things noticed during the session that were not the item in hand.

## dnd-kit block cards are buttons that swallow inner button names
Where: `src/components/blocks/BlockCard.tsx` (the `motion.div` is a dnd-kit draggable, which sets `role="button"`). Inner controls like World Bank's `Apply` then collide in the accessibility tree — Playwright saw two "Apply" buttons, one of them the entire card (`World Bank World Bank` plus the inner label).
Why it matters: keyboard and AT users get a giant button wrapping other buttons. The persistence e2e had to use `{ name: 'Apply', exact: true }` to escape it.
What I would do: stop promoting the card itself to `role="button"` (dnd-kit `role` option / drag handle only), so inner controls keep unique names.

## Empty OmniItem arrays are cited as grounding
Where: `src/core/services/wire.service.ts` ~85–86. `extractBlockData` returns the string `'(No data)'` for an empty `items` array, and `aggregateWireContext` treats any returned string as a contributing source.
Why it matters: the invariant is that a source which carried no data is not grounding and must not be cited. A connected-but-empty block would still pulse (item 1) and still get a provenance chip.
What I would do: return `null` for empty items / empty memory, matching the persona-error path that already returns null rather than propagating noise.
