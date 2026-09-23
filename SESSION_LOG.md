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
Commit: 59303e6
What: Cleared the 7 setState-in-effect and 2 exhaustive-deps warnings without disabling rules. Client mount uses `useSyncExternalStore`. Workspace blocks read stored data during render (or as the store itself). The LLM pill fetches after the effect, not by setState inside it.
Why: Derived state in an effect is a cascading render. A hydration `setHasMounted(true)` effect is the same bug with a prettier name.
Gate: tsc / lint (0 errors, 38 warnings left for items 6/9 and unused vars) / tests (172) / build / e2e — all green
Notes: Canvas memo now filters `blocks` in the function body so `blocks` is a real dependency. Resize effect lists `updatePosition`. Did not suppress anything.

## ITEM 4 — SHIPPED
Commit: 8d349d8
What: Added focused e2e specs for Crystallize, Cascade, provenance hover, provider switch, and Memory/params persistence. The golden path remains; these cover the loops shipped after it.
Why: Every shipped bug this cycle lived in the UI wiring layer unit tests cannot see. Those loops had no end-to-end proof.
Gate: tsc / lint (0 errors) / tests (172) / build / e2e (6 passed) — all green
Notes: Provenance hover asserts `data-cited` on the block card, same contract as `data-reading` on wires — not pixels. Cascade uses the Investor Analyst→Strategist wire so it does not depend on live data APIs. Persistence Apply had to be `exact: true` because dnd-kit exposes the whole World Bank card as a button whose accessible name includes "Apply".

## ITEM 5 — SHIPPED
Commit: 16466bb
What: Unit tests for personaTurn.service (fail-closed warning, isThinking cleared on throw, throttled stream + final commit, provenance from the turn not the wires), plus the previously untested llm.service, mind.engine, persona.prompts, api.service, and skin.service.
Why: personaTurn.service is on the path of every answer. A silent failure or a citation of connected-but-empty wires would look like it works.
Gate: tsc / lint (0 errors) / tests (200) / build / e2e (6) — all green
Notes: llm.service tests assert the client body has no `apiKey`. Skin tests assert unknown CSS tokens and non-colours are dropped. MindEngine.think is the Mind panel path, not persona turns.

## ITEM 6 — SHIPPED
Commit: e25bb9b
What: Retired the 31 `any`s at JSON boundaries (wire extraction, rest-list adapter, API gateway registry, Polymarket route, wire-store migrate, shell snapshot, mind engine, Canvas drag). Also typed the last suppressed Metaculus `getProb`.
Why: External JSON is where a wrong assumption becomes a runtime surprise instead of a compile error. `unknown` plus a type guard is the honest type of a response we do not control.
Gate: tsc / lint (0 errors, 7 warnings left: unused vars + img) / tests (200) / build / e2e (6) — all green
Notes: Gateway registry erases each normalizer's raw type to `ApiTypeDefinition<unknown>` at insertion — that is a heterogeneous map, not a looser fetch. Did not change extractBlockData's '(No data)' empty-array behaviour (see FINDINGS).

## ITEM 7 — SHIPPED
Commit: 8b006c5
What: Stop while thinking aborts the fetch, keeps the partial answer, and marks it stopped rather than failed. Regenerate re-runs the last turn's input. Both are block-id addressed so a cascade stops at the current persona.
Why: Reloading mid-stream was an accident that replaced a draft with an error. Stop is a user action; the partial is still theirs.
Gate: tsc / lint (0 errors) / tests (205) / build / e2e (6) — all green
Notes: AbortSignal is a fetch option, never JSON. Empty abort (no tokens) drops the draft rather than leaving a blank bubble. Cascade's loop breaks on `stopped`.

## ITEM 8 — SHIPPED
Commit: a8734bf
What: Added a Researcher shell template (OpenAlex aimed at foundation models, Hacker News, Polymarket, Memory, Researcher persona). Every shipped template must resolve to zero keyed providers.
Why: One template cannot prove the format generalises. A second, non-markets shell is the test. Memory is on the canvas and wired in — recollection stays a wire, not a hidden path.
Gate: tsc / lint (0 errors) / tests (207) / build / e2e (6) — all green
Notes: Investor stays first in the Store. E2e spawn locators now name the Investor card so two "Use this shell" buttons do not collide. OpenAlex template `params.search` is a real fetch knob and seeds the input without requiring Apply.

## ITEM 9 — SKIPPED
Commit: 40ac539
What: Left the four `<img>` warnings in place.
Why: next/image is the wrong tool here. MediaBlock renders user-chosen URLs and blob: thumbnails (no remotePatterns set can cover that). CryptoView and NewsView are 32–64px remote thumbs from CoinGecko and arbitrary publishers — an allowlist per host is the cost, and there is no LCP win on a canvas card. The warning is real for marketing sites; it is not a defect in these surfaces.
Gate: n/a (no code change)
Notes: Unused-var warnings in PersonaBlock, WireHandle, and MindPanel are leftover from earlier work; not this item.

## AUDIT — SHIPPED
Commit: 7e2706b
What: Removed the client `apiKey` path (apiStore, settings leftovers, dashboard input, gateway injection). 502s from keyed providers no longer echo `error.message`. Every keyed provider has a test that the browser-facing body does not contain the key. Client bundle scan of `.next/static` for env values: PASS.
Why: The dashboard still offered a key field for a custom-provider path nothing shipped uses, and stored it in localStorage in the clear. That is an affordance that cannot be honoured honestly. Encrypting it would have been XOR theatre again.
Gate: tsc / lint (0 errors) / tests (215) / build / e2e (6) — all green
Notes: FRED and Alpha Vantage still put the key in the *upstream* URL because those APIs have no header auth. Turbopack's local compile cache can inline an env value; that is not the client bundle. Settings store gained `version: 1` so the dead `apiKeys` bag is dropped on migrate.

## INFERENCE LEDGER — SHIPPED
Commit: 9950fd0 (shipped together with RUN LINEAGE)
What: Two Postgres tables (`inference_run`, `inference_source`) written at `/api/llm` and read at `/api/inference-runs`. Provider, model, status, timestamps, latency, token counts, request/output excerpts, and which wired sources actually fed the turn. Migration + runner (`npm run db:migrate`), `DATABASE_URL` read in one server-only module, a CI job against a real `postgres:16`.
Why: The canvas belongs to the person at the keyboard and stays in IndexedDB. A run belongs to the server — the only party that held the key, called the provider, and timed it. That knowledge existed only in a `console.error` line. Postgres earns this one boundary and nothing else.
Gate: tsc / lint (0 errors, same 7 pre-existing warnings) / tests (274, +59) / build / e2e (6) — all green. The 12 Postgres integration tests were SKIPPED locally (no Postgres or Docker on this machine); they run in the new CI job.
Notes: Postgres is optional — no `DATABASE_URL` means a no-op handle, not a branch at the call site. Two writes per run so a crashed process leaves a visible 'running' row; the closing UPDATE carries `WHERE status = 'running'` so the first terminal state wins. Streaming is metered through a pass-through wrapper, never buffered, and a consumer cancel is recorded as `canceled` — matching the canvas, which already treats a stopped turn as a kept partial rather than an error. A failed open pauses the ledger 30s so an unreachable database cannot tax every inference. Stored text is scrubbed against the server's own env values, because rows are served back to the browser.

## RUN LINEAGE — SHIPPED
Commit: 9950fd0 (shipped together with INFERENCE LEDGER)
What: `inference_source.parent_run_id` turns the ledger into a DAG: when one persona feeds another, the edge names the RUN whose answer was consumed. `GET /api/inference-runs/:id/lineage` walks it with a recursive CTE — every upstream run, the chip it was cited under, and the raw sources at every level. `/api/llm` now returns `X-Omni-Run-Id`, which the kernel carries into `TurnResult`, personaTurn stores on the answer, and `aggregateWireContext` reads back as `ContextSource.parentRunId`.
Why: The canvas answers "what does this persona know?" one hop deep. In a cascade the real grounding is several hops back, and it is unrecoverable afterwards — block data is live and the upstream evidence has been overwritten by the time you ask. The server kept the snapshot; nothing could reach it.
Gate: tsc / lint (0 errors, same 7 pre-existing warnings) / tests (299, +26) / build / e2e (6) — all green. The 23 Postgres integration tests were SKIPPED locally (still no Postgres or Docker on this machine); the CI ledger job runs them, including a real chain, diamond and cycle.
Notes: Run id travels as a HEADER, not a body field — the streaming response is plain text and adding a field would change the contract llm.service and the golden path depend on. Cycle safety is an explicit `path` array rather than SQL-standard `CYCLE ... SET ... USING`, which needs PG 14; a version bump is a poor price for syntax sugar, and `planCascade` proves cycles are real. `wire.service` picks the cited run with the same `lastPersonaAnswer()` helper that picks the sent text, so citing run A while sending answer B is structurally impossible. `parent_run_id` is `ON DELETE SET NULL`, not CASCADE: losing an upstream run must not erase the downstream run's record of having consumed something. 002 guards its `ADD CONSTRAINT`s on `pg_constraint`, since those have no IF NOT EXISTS.

## SUMMARY
Shipped: items 1–8, item 9 skipped (img), security audit a–d, inference ledger + run lineage.
Blocked: none.
Next: the empty-array `'(No data)'` citation in `wire.service.ts` is the remaining honesty bug — a connected-but-empty source still pulses and still gets a chip. After that, stop treating the whole-shell Mind snapshot as a second context path. The ledger's next step is a UI that reads it — the lineage tree behind a source chip.

## LEDGER PROVENANCE NOTE
The two ledger entries above share one commit. Only the final state was gated
green; splitting them afterwards would have recorded an intermediate commit
that was never actually verified.



