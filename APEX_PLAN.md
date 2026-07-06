# OMNI_OS — Apex Implementation Plan

> Created 2026-06-20. The master roadmap: from "core loop proven" to full fruition.
> Two lenses held throughout — **[ARCH]** system integrity (Architectural Engineering)
> and **[UX]** human experience (HCI / interaction design). Items tagged with the lens
> they serve; most serve both, which is the point: in this product, *context is
> architecture* — the system's structure IS the user's mental model.
>
> Governance: `DIVISION_CHARTER.md` remains the constitution (two fronts, one core,
> one active front at a time). This plan is the roadmap above the completed phase docs
> (`IMPLEMENTATION_PLAN.md` ✅ Phases 1–5, `CITADEL_SHELL_STORE_PLAN.md` ✅ 1–4,
> `CITADEL_THINK_LOOP_PLAN.md` ✅), which stay as historical record.

---

## 1 · Where we stand (grounded, verified)

**Proven working:** build/CI green (69 tests: typecheck+test+lint+build all blocking) ·
secrets server-side (`/api/llm` proxy, validated + fail-closed) · eval injection closed
(safeExpression) · Shell Store spawns the Investor shell · **the Think loop is LIVE** —
Gemini 2.5 reasoned over real wired Polymarket probabilities/volumes in-app (2026-06-20).

**Known debt (tracked):** 37 `any` + 11 `react-hooks` warnings · ~30 gateway providers
still fetch client-side with localStorage keys · dormant `llmNormalizer` second LLM path ·
three-and-a-half cognitive engines · remote `main` is an unrelated old snapshot ·
localStorage-only persistence.

**Newly discovered (2026-06-20, evidence-verified):** the codebase has **two parallel
wire systems** — and they don't talk:

| Concern | System used |
|---|---|
| Canvas wire rendering (`WireRenderer`) | `wireStore` (`DataWire`) |
| Persona context (`aggregateWireContext`) | `wireStore` (`DataWire`) |
| Drag-to-wire creation (`createWireFromDrag`) | `wireStore` (`DataWire`) |
| Shell templates (`instantiateTemplate`) | `blockStore.connections` (`BlockConnection`) |
| Shell save/load (`ShellConfig.connections`) | `blockStore.connections` |

**Consequence: the Investor shell's pre-wired connections are invisible and inert.**
They neither render nor feed personas. The live Think success worked because the user
wired manually. This is Bedrock item **A1** and the single clearest argument for this
plan's sequencing: architecture faults surface as UX betrayals.

---

## 2 · Definition of Fruition

Fruition is not a feature list — it is five scenarios passing, live, without excuses:

1. **Morning Briefing (Citadel).** Open the app → pick/resume the Investor shell → every
   wire visibly carries data (pulses, freshness) → hit Think on the Analyst → a streamed,
   source-attributed insight grounded in *today's* numbers → one click crystallizes it →
   the crystal wires into the Strategist → "what should I do this week?" produces a plan
   that cites both the crystal and live data.
2. **Weekly Reflection (Garden).** Open a life system → this week's attribute history and
   stability trend are visible (sparklines) → tune a factor via the structured editor or
   answer a survey question → the breakdown shows *why* the score moved → the System Mind
   comments on the trend with the model as context.
3. **Trust (both).** For any persona, one gesture answers "what does this mind know right
   now?" — exact sources, sizes, freshness. Every AI response carries provenance chips
   that link back to (and highlight) the contributing blocks.
4. **Resilience.** No keys → app runs on public data + clear, actionable setup states.
   No network → cached data + local model still function. Browser storage cleared →
   data survives (IndexedDB durability + one-click export/import had your back).
5. **Craft.** Canvas stays fluid while streaming (no re-render storms) · a11y baseline met
   (keyboard + palette parity for canvas ops, focus management, reduced-motion) · the
   golden path runs headless in CI · zero lint errors maintained.

---

## 3 · The Two-Lens Assessment

### [ARCH] Findings

- **F1 — Dual wire system** (see §1). One source of truth must exist for "what feeds what."
- **F2 — Persistence ceiling.** Everything lives in localStorage (~5MB, single browser, no
  history). Fatal for the Garden's "history is the value" and limiting for shell richness.
- **F3 — Cognitive engine sprawl.** `mind.engine` (shell snapshot), `systemMind` +
  `coreMind` (Garden), `persona.engine` (wired blocks), `relationModeler` — four prompt
  assemblers, four availability/streaming handlers. Divergence is already visible.
- **F4 — Client-side gateway keys.** ~30 providers fetch from the browser with
  localStorage keys (`apiStore`); plus the dormant `llmNormalizer` path to `api.openai.com`.
- **F5 — Model-ID rot.** Two live failures from deprecated model ids (claude-3-haiku,
  gemini-2.0-flash-exp). Model names are config *data* and decay; they need a registry.
- **F6 — Testing gap at the interaction layer.** 69 unit tests, yet all three shipped bugs
  this cycle lived in UI wiring (canvas binding, hydration, fake handlers). The pyramid
  has no middle or top.
- **F7 — No failure isolation.** One block component throwing can take down the canvas;
  no error boundaries. Streaming commits per-token through the global block store
  (re-render storm risk = perf debt that reads as UX debt).
- **F8 — Repo endgame pending.** Real work lives on `fix/build-and-security`; remote
  `main` is an unrelated old snapshot with 40 dependabot alerts.

### [UX] Findings

- **U1 — The wires are dead.** The vision promises "pulses flow along the wire; context is
  visible architecture." Today wires are static lines with no ports, no compatibility
  feedback during drag, no life. This is the product's soul, unshipped.
- **U2 — The trust question is unanswerable.** Nothing shows "what does this persona see
  right now?" — the defining question of a context tool. `sourcedFrom` exists in data but
  not in the UI.
- **U3 — First-run lands on an empty root canvas.** The Shell Store solved blank-canvas but
  isn't the front door; keyed blocks fail quietly instead of *inviting setup*.
- **U4 — Think output is raw.** No markdown rendering, no stop/regenerate, no model badge,
  no path from insight → memory (crystallization is the vision's loop-closer).
- **U5 — Multiple minds don't collaborate.** Analyst→Strategist is wired structurally but
  nothing flows; the "plural minds" promise is single-player.
- **U6 — Garden reflection lacks time.** The stability engine computes *now* but shows no
  *trend* — reflection without history is a snapshot, not a mirror. (Gated on F2.)
- **U7 — No interaction grammar.** Status dots, error states, block hierarchy, density are
  ad hoc per block. Four aesthetic themes exist; none is finished.
- **U8 — Keyboard/a11y untouched.** Palette exists but lacks parity; canvas is
  mouse-only; modals unaudited.

---

## 4 · North-Star Architecture

Five layers, dependencies point strictly downward. Product surfaces stay thin.

```
L4  PRODUCT SURFACES      Citadel (/)            Garden (/garden)
     [thin, no cross-imports, both import only L0–L3]
L3  SPATIAL PLANE         Canvas · Blocks · ONE wire system · Shells/Store
L2  COGNITION PLANE       Cognition Kernel: TurnRunner + ContextAssemblers
                          (wired | snapshot | system-model) + Personas + Memory pools
L1  DATA PLANE            Gateway (server-proxied) · Normalizers → OmniData · Model registry
L0  PERSISTENCE           OmniVault: IndexedDB adapter + schema versions + export/import
```

---

## 5 · Horizons

Sizing: **S** ≤ 1 session · **M** 1–3 sessions · **L** 3+. Every horizon ends shippable.

### Horizon A — BEDROCK *(make the base honest; everything else stands on this)*

| # | Item | Lens | Size | Detail |
|---|------|------|------|--------|
| A1 | **One wire system** | ARCH→UX | M | Unify on `wireStore`/`DataWire` as the single truth. Templates + shell save/load migrate to it (fixes the inert Investor pre-wiring — the live bug). `BlockConnection` becomes derived/legacy, then deleted. Regression test: *spawned template's wires render AND feed personas.* |
| A2 | **OmniVault (persistence)** | ARCH | M–L | IndexedDB adapter (idb/Dexie) behind the existing zustand `persist` interface; schema `version` + migrations; one-click JSON export/import. Migrate omni-blocks/shells/mind first; Garden history lands here in C1. |
| A3 | **Golden-path CI** | ARCH | M | Playwright (chromium): spawn Investor → blocks render → wires visible → mock-LLM Think (`/api/llm` test double via `OMNI_E2E=1`) → streamed response renders with sources. Plus 3–5 Testing-Library component tests for PersonaBlock/ShellPanel. *Institutionalizes this cycle's lesson: our bugs live in the wiring layer.* |
| A4 | **Cognition Kernel** | ARCH | M | One `TurnRunner` (availability → assemble → stream → commit) with pluggable `ContextAssembler`s: `wiredContext` (persona blocks), `shellSnapshot` (Mind panel), `systemModel` (Garden). `mind.engine`, `systemMind`, `persona.engine` become thin callers; `coreMind`/`relationModeler` follow. Resolves the parked two-engines question: **one engine, three context sources.** |
| A5 | **Model registry + block error boundaries** | ARCH→UX | S | `models.ts`: current ids, deprecated→replacement map (extends the existing self-heal), startup ping surfacing a status pill. React error boundary per BlockCard so one block can't kill the canvas. |

### Horizon B — CITADEL APEX *(the active front, to excellence)*

| # | Item | Lens | Size | Detail |
|---|------|------|------|--------|
| B1 | **Living Wires** | UX | M | Ports visible on hover; drag shows live type-compatibility (uses existing `validateWire`); invalid targets dim; **data pulses** animate on refresh; wire select/delete; freshness tint. *Requires A1.* |
| B2 | **Context Lens + provenance** | UX | M | On any persona: one gesture reveals exactly what it sees (sources, char sizes, freshness — `preparePersonaTurn` already computes this). Responses render source chips → hover highlights the contributing block + wire. Answers U2 permanently. |
| B3 | **Think UX** | UX | S–M | Markdown rendering; stop/regenerate; model+provider badge on responses; streaming perf fix (buffer locally, throttle store commits ~80ms — kills the per-token global re-render). |
| B4 | **Crystallization** | UX→ARCH | M | "Crystallize" on any assistant message → creates a Memory Crystal block (insight text + sources + timestamp) wired *from* the persona; wireable onward. Closes the vision's knowledge loop; crystals persist via OmniVault. |
| B5 | **Persona cascade** | UX | M | Persona→persona wires carry the upstream's latest output as context (assembler already merges; needs the output published as wire data). MVP: "Run chain" on the downstream; then per-wire auto-trigger toggle. *Requires A4.* |
| B6 | **Arrival experience** | UX | S–M | First-run = Shell Store as the front door ("choose your first environment / start empty"). Keyed blocks show calm setup cards (which env var, copy-snippet, docs link) instead of quiet failure. Investor shell ships pre-wired *for real* (A1). |
| B7 | **Researcher shell + gateway batch 1** | BOTH | M | arXiv block (lane-1 normalizer) → Researcher template. Server-proxy exactly the providers live shells use (fred/bls/alpha_vantage/newsapi already server-side or keyed; move remaining used-keyed ones); delete the dormant `llmNormalizer` + unused catalog LLM entries. |

### Horizon C — GARDEN APEX *(unpark deliberately; switch active front at a clean commit)*

| # | Item | Lens | Size | Detail |
|---|------|------|------|--------|
| C1 | **Longitudinal spine** | ARCH→UX | M | OmniVault history table `{systemId, ts, attributes, stabilityResult}`; write on change/daily; sparklines + trend deltas in SystemEditor and Garden overview. *Requires A2. Unlocks U6 — reflection gains time.* |
| C2 | **Structured authoring UI** | UX | M | The mapped gap: add/remove effects via pickers (attribute · effect-type · direction · coefficient), rule condition-builder (`[attr] [op] [value] + and/or`) over safeExpression's grammar — no free-text code. Live breakdown preview as you author. |
| C3 | **Survey-first reflection loop** | UX | S–M | Surface `SYSTEM_SURVEY` (already wired end-to-end!) as each system's onboarding; answers visibly reshape the model ("you said stress compounds → here's the curve"); re-take per question anytime. |
| C4 | **System Minds on the Kernel** | ARCH | S | `systemMind`/`coreMind` become Kernel callers with the `systemModel` assembler (model + history + breakdown as context). Deletes the last duplicated engine code. |

### Horizon D — COHERENCE & SHIP *(the "OS" feeling)*

| # | Item | Lens | Size | Detail |
|---|------|------|------|--------|
| D1 | **Interaction grammar + one aesthetic** | UX | M | Codify: status-dot language, error-state anatomy, block visual hierarchy (data quiet · personas present · alerts loud), density rules. Perfect **command** (the default); demote the other three themes to experimental. |
| D2 | **A11y + keyboard parity** | UX | M | Focus management in all modals/panels; palette parity for canvas ops (add/wire/think/navigate blocks); visible focus; `prefers-reduced-motion` honored by pulses/animations; contrast audit on command theme. |
| D3 | **Hygiene endgame** | ARCH | M | `any`→typed in all files the horizons touched; refactor the 11 `react-hooks` effect warnings (block adapters → derived state); remaining gateway proxying; flip the relevant lint rules back to error. |
| D4 | **Repo endgame** | ARCH | S | PR `fix/build-and-security` → cut over as the new `main`; retire the old snapshot (tag it `archive/pre-rebuild`); resolve/re-baseline dependabot; README rewrite (product-first); tag `v0.1.0`. |

---

## 6 · Dependency map

```
A1 ─────────► B1 (living wires)  ─► B6 (pre-wired shells honest)
A2 ─────────► B4 (crystals persist) ─► C1 (history) ─► C3 (reflection)
A4 ─────────► B5 (cascade)          ─► C4 (system minds)
A3 underpins every horizon (golden path grows with each feature)
A5 protects B3/B5 (model rot, block crashes) 
D* runs after B (Citadel) and C (Garden) reach their apex
```

**Recommended order:** A1 → A3 → A5 → A2 → A4 → B1 → B3 → B2 → B6 → B4 → B5 → B7 →
*(front switch)* → C1 → C3 → C2 → C4 → D1 → D2 → D3 → D4.
Rationale: A1 first because it fixes a live user-facing bug *and* unblocks the soul
feature; A3 immediately after so every subsequent feature lands with an interaction test.

---

## 7 · Explicit non-goals (cuts that keep the apex reachable)

- **Mobile companion** (vision.md) — deferred entirely; desktop-first until both fronts apex.
- **Hosting / multi-user / auth** — out per charter; local-first single-user is the model.
- **API marketplace breadth** — no new providers except those a shipped shell needs.
- **Four aesthetic themes** — one perfected (command); others parked as experimental.
- **Creative shell** — waits for the interactive-tool block kind; not before Horizon D.
- **Real-time collaboration, plugins, block SDK** — post-v0.1 conversations.

## 8 · Working rules (unchanged, restated)

1. One active front (charter); shared-core edits = "affects both" checkpoint.
2. **Verify, don't assume** — every feature lands with its test *and* a live click-check;
   green CI ≠ works (proven three times this cycle).
3. Docs tell the truth: progress tables update when reality changes, not before.
4. Each horizon ends shippable; switch fronts only at clean commits.

## 9 · Risk register

| Risk | Exposure | Mitigation |
|---|---|---|
| Wire unification breaks saved shells | Users' persisted shells reference `BlockConnection` | A1 ships a one-time migration in the store `merge`; golden-path test covers load-old-shell |
| IndexedDB migration loses data | localStorage → vault move | Dual-write window + export prompt before migration; keep localStorage fallback one release |
| Model deprecations recur | Live 404s (hit twice) | A5 registry + startup ping + self-heal map |
| Thinking-model token opacity | Truncated/empty answers | Budget headroom (done); registry stores per-model minimums |
| Scope creep re-hazes the vision | The original failure mode | §7 cuts are binding until both fronts apex; new ideas → backlog, not plan |
| Solo-dev burnout | "Patience project" | Session-sized items (S/M); every horizon shippable; celebrate scenario passes |

---

## 10 · Progress

> ⬜ not started · 🟡 in progress · ✅ done · ⛔ blocked

| Horizon | Item | Status | Notes |
|---|---|---|---|
| A | A1 One wire system | ✅ | 2026-06-20. wireStore/DataWire is the single truth: DataWire gained optional `sourcePort`/`targetPort`; wireStore gained `removeWiresByShell`/`replaceWiresForShell`. blockStore `connections` system deleted (state+actions+persist, v1 migration strips old data); `removeBlock`/`clearShell` now clean wires (fixed two orphan-wire leaks found during the work). Shell lifecycle (`create/saveToShell/saveShell/load/duplicate/instantiate/delete`) runs on wires; `saveShell` previously fetched wires but never saved them — fixed. `ShellConfig.wires` replaces `connections` (legacy field kept deprecated; shellStore v1 migration + `loadShell` fallback convert old shells). Snapshot + Canvas migrated. Regression tests: template wires land in wireStore (render) AND data flows through them into `aggregateWireContext` (feed personas — the exact live bug), orphan cleanup on block/shell delete, legacy conversion. 73 tests / tsc / lint 0 errors / build green. |
| A | A2 OmniVault | ⬜ | |
| A | A3 Golden-path CI | ⬜ | |
| A | A4 Cognition Kernel | ⬜ | |
| A | A5 Registry + boundaries | ⬜ | Self-heal map already seeded |
| B | B1–B7 | ⬜ | Gated per §6 |
| C | C1–C4 | ⬜ | Garden parked until front switch |
| D | D1–D4 | ⬜ | |

### Changelog
- **2026-06-20** — Plan created. Dual-wire-system finding verified with evidence (§1);
  fruition defined as five scenarios (§2); horizons A–D sequenced with dependency map (§6).
