# OMNI_OS — Division of Labor Charter

> Created 2026-06-19. Purpose: let one person work **one front at a time** without
> the other front's mental model intruding. This is a focus tool, not a code split.
> The two fronts share a common core and live in one repo (see "Shared Core" below).

---

## Why two fronts

OMNI_OS contains two products that optimize for genuinely different things. Trying to
hold both in mind at once is the source of the "hazy vision" feeling. They share a
*substrate* (canvas, blocks, wires, gateway, Mind engine) but not a *purpose*.

| | **The Citadel** | **The Garden** |
|---|---|---|
| **One-line purpose** | Think *with* AI over live external data | Model & reflect on the interplay of your own life-systems |
| **Optimization target** | Latency-to-insight on real-time data | Fidelity of the self-model over time |
| **Direction** | Outward (markets, news, forecasts, crypto) | Inward (health, finance, relationships, time…) |
| **Time horizon** | Momentary — the world *right now* | Longitudinal — trends across weeks/months |
| **State philosophy** | Ephemeral; refresh aggressively, discard freely | Accumulative; **history is the value, never lose it** |
| **Core UX verb** | Wire data → ask → decide | Author a model → tune factors → reflect |
| **UX language** | Dashboard + conversation | Authoring + reflection |
| **AI role** | Persona reasons over connected live blocks | System Mind reflects on a stability model |
| **"Good" looks like** | "I opened it and immediately saw + understood the world's state" | "I noticed a real pattern in how my factors interact" |
| **Success metric (draft)** | Time-to-first-useful-insight; does a real morning-briefing loop feel effortless? | Can I author/tune a system model and learn something true about myself from it? |

**The tension to respect:** a choice that's right for one is often wrong for the other.
"Refresh and discard stale state" is correct for the Citadel and *destructive* for the
Garden. Judge each front by its own metric, never the other's.

---

## Shared Core (touch deliberately — changes here affect BOTH fronts)

These are the chassis. Do not fork them; do not let one front grow a private copy.

- `src/canvas/*` — canvas, wires, wire rendering
- `src/core/gateway/*` — API gateway, normalizers, adapters
- `src/core/registry/*` — block & view registries
- `src/core/schemas/block.schema.ts`, `wire.schema.ts`, `shell.schema.ts`
- `src/core/services/llm.service.ts` + `src/app/api/llm/*` + `src/core/services/server/*`
- `src/core/services/port.service.ts`, `wire.service.ts`, `shell.snapshot.ts`
- `src/core/stores/index.ts` (block/shell/UI/settings stores), `wireStore.ts`
- `src/core/debug.ts`, `src/lib/*`

**Rule of thumb:** if you're editing shared core, you're editing both products — slow down,
and check the change makes sense for *both* the outward and inward use cases.

---

## Front A — The Citadel (outward / live-data)

**Owns:**
- Route: `/` (`src/app/CitadelApp.tsx`)
- Truth/data blocks: `src/blocks/truth/*` + their views in `src/components/blocks/*`
- Personas: `src/blocks/persona/*`, `src/components/mind/*`, `src/core/services/mind.engine.ts`,
  `persona.prompts.ts`
- Data routes: `src/app/api/{polymarket,news,metaculus}/route.ts`

**Status:** the stabilize-and-secure arc (Phases 1–5) landed here. LLM path server-side,
graceful degradation verified, tests cover normalizers/ports/snapshot.

**⭐ ACTIVE FRONT (since 2026-06-19).**

**Current focus: Shell Store** — preconfigured, opinionated shell templates that solve the
blank-canvas problem and make the Citadel valuable on first open. First template: **Investor
Shell** (ships on existing blocks). Plan: `CITADEL_SHELL_STORE_PLAN.md`.

**Backlog (unordered):**
- Shell Store templates beyond Investor: Researcher (needs arxiv block), Creative (needs
  interactive-tool block kind). See the "ladder" in the plan.
- Make ONE complete loop excellent end-to-end (the Investor shell *is* this loop's first form).
- Memory crystallization (insight → new wired block) — still unfinished from vision.md.
- Persona-to-persona wiring.
- Port UI visualization (indicators, type colors, tooltips).

---

## Front B — The Garden (inward / life-systems)

**Owns:**
- Routes: `/garden`, `/garden/system/[id]`
- Domain/system model: `src/core/blocks/*.blocks.ts`, `src/core/schemas/{core,domain,stability,equilibrium,graphPool}.schema.ts`,
  `src/core/schemas/safeExpression.ts`
- System UI: `src/components/{SystemEditor,SystemMindChat}.tsx`, `src/components/domains/*`,
  `src/components/EquilibriumDashboard.tsx`, `src/components/graph/*`
- System AI/engine: `src/core/services/{coreMind,systemMind}.engine.ts`, `ruleEngine.service.ts`,
  `relationModeler.service.ts`, `trackerBridge.service.ts`
- Stores: `coreStore`, `domain.store`, `stabilityStore`, `equilibrium.store`, `graphPool.store`

**Status (mapped 2026-06-19):** ~80% built. Stability engine complete (`computeStability`:
weighted effects + rules → score + breakdown + alerts). `SYSTEM_SURVEY` is the
**already-wired no-code authoring path** (plain-language Q → `effectModifier` rewrites the
math). Eval/`new Function` security flaw fixed (safe parser).

**💤 PARKED (since 2026-06-19)** — Citadel is the active front. Backlog held here, out of head.

**Current focus:** _(parked — resume by setting active)_

**Backlog (unordered):**
- **Authoring-UI gap:** `SystemEditor` only tunes; add structured add/remove effect + rule
  controls (pickers + condition-builder over the schema — no raw expressions).
- Surface `SYSTEM_SURVEY` prominently as the primary authoring experience.
- Longitudinal view: track stability/attributes over time (history is the Garden's value).

---

## Cross-tendrils to trim later (optional, low priority for focus)

Drawing these cuts makes "work in one front without seeing the other" cleaner. Not urgent
for solo focus; do when convenient:
- `CitadelApp.tsx` imports `EquilibriumDashboard` (a Garden component) — the only feature-level
  Citadel→Garden import.
- Shared `Sidebar` / `BlockRegistry` surface each other's blocks (Garden domain blocks appear
  in the Citadel armory and vice-versa).

## Open architectural question (decide on purpose, not now)

**Two Mind engines exist** — `mind.engine.ts` (Citadel) vs `coreMind`/`systemMind.engine.ts`
(Garden). They overlap. Eventually: converge to one engine with two modes, or keep two
deliberately. This is the place the fronts are most tangled; revisit when one front's work
forces the question.

---

## Working rule

1. Pick the **active front**. The other goes to "parked" — its backlog stays here, out of your head.
2. Work only the active front's owned paths + shared core.
3. Touching shared core = a conscious "this affects both" checkpoint.
4. Switch fronts deliberately (a clean stopping point + commit), not mid-thought.
