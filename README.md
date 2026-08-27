# OmniOS

OmniOS is a **keyless agent surface**. An arbitrary agent (`curl`, `fetch`,
or a human) discovers named affordances and acts on local disposable browser
tabs. No API key.

## Run

```bash
npm install
npm run dev
```

- Product (human / browser-agent): [http://localhost:3000/surface](http://localhost:3000/surface)
- Contract (discover): [http://localhost:3000/api/agent](http://localhost:3000/api/agent)

Needs local **Chrome / Chromium / Edge** on the machine running OmniOS
(or `OMNI_CHROME_PATH`). Call `runtime.ensure` — it reuses an already-debuggable
Chrome or launches one. You do not need to remember `--remote-debugging-port`.
**Playwright** is a **test adapter** only (`OMNI_TAB_RUNTIME=playwright` in
CI / Vitest). It is not the product path. Playwright can be removed later
without the HTTP API changing.

Local fixtures (no internet): `/agent-fixture.html` and `/agent-fixture-b.html`.

## Product contract

`GET /api/agent` is the frozen contract (`src/core/agent/contract.ts`).
Callers depend on named affordances and the snapshot shape
(`id`, `title`, `url`, `text`, `actions[]`, `screenshot`) plus
`keyRequired: false`. They do not depend on Chrome/CDP or Playwright.
`tabRuntime` is discovery-only (`cdp` | `playwright`). No caller-visible
`BrowserContext`, `storageState`, or CDP port.

Each tab is a **local lightweight browser state** — not a JSON note, not a
Citadel canvas, and not a hosted-model chat. OmniOS-created tabs keep cookies /
`localStorage` in `.omni/profiles/<tabId>/` and rehydrate after a process
restart. Bound pages (`tabs.bind`) stay in the user's Chrome; dispose unbinds
and does not delete that profile.

| Method | Path | Affordance |
|--------|------|------------|
| `GET` | `/api/agent` | Discover named actions (id, description, input schema, what they mutate) |
| `POST` | `/api/agent` | Invoke `{ "affordance": "<id>", "input": { ... } }` |
| `POST` | `/api/agent` | `runtime.ensure` — empty input; reuse or launch a debug Chrome and attach |
| `POST` | `/api/agent` | `runtime.attach` — `{ "cdpUrl" }` or `{ "port" }` points at a specific open Chrome |
| `POST` | `/api/agent` | `runtime.targets` — list already-open pages as `{id, title, url}` |
| `GET` | `/api/agent/tabs` | `tabs.list` — OmniOS tabs (not the user's other Chrome pages) |
| `POST` | `/api/agent/tabs` | `tabs.create` — `{ "url" }` loads a **new** page (attached Chrome or new profile) |
| `POST` | `/api/agent` | `tabs.bind` — `{ "targetId" }` adopts an already-open page as an OmniOS tab |
| `GET` | `/api/agent/tabs/{id}` | `tabs.read` — title, URL, visible text, `actions[]` refs, `screenshot` |
| `GET` | `/api/agent/tabs/{id}/screenshot` | `tab.screenshot` — live PNG (`image/png`) |
| `POST` | `/api/agent/tabs/{id}/act` | `tab.navigate` / `tab.click` / `tab.type` (prefer `ref`) |
| `DELETE` | `/api/agent/tabs/{id}` | `tabs.dispose` — unbinds a bound page (user page stays); closes an OmniOS-created page (does not quit Chrome) |

Closed loop on the product page (not a fixture):

```bash
# 1. Discover (no key)
curl http://localhost:3000/api/agent
# → keyRequired: false, affordances[], contract.version

# 2. Open /surface — create body IS the snapshot (title / text / actions[] / screenshot)
curl -X POST http://localhost:3000/api/agent/tabs \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:3000/surface"}'
# note TAB_ID and the ref whose name is "Mark ready"

# 3. Act by ref — the act body is a FRESH snapshot (no extra GET)
curl -X POST http://localhost:3000/api/agent/tabs/TAB_ID/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.click","input":{"ref":"eN"}}'
# → tab.text includes "loop: ready"

# 4. Screenshot
curl -o shot.png http://localhost:3000/api/agent/tabs/TAB_ID/screenshot

# 5. Dispose — later read is 404
curl -X DELETE http://localhost:3000/api/agent/tabs/TAB_ID
```

Isolation / persist fixtures (`/agent-fixture.html`) still exist for cookie tests. Same loop via one invoke endpoint:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H 'content-type: application/json' \
  -d '{"affordance":"tabs.create","input":{"url":"http://localhost:3000/surface"}}'
```

Without `runtime.ensure` / `runtime.attach`, `tabs.create` still launches a
disposable local profile.

## Open a debuggable Chrome

The product path is `runtime.ensure` (`GET /api/agent` lists it). An agent
does not remember a CLI flag. Empty input: reuse an already-debuggable
Chrome if one is up, otherwise launch Chrome/Chromium/Edge with remote
debugging (dedicated `.omni/chrome-debug` profile) and attach.

```bash
# no --remote-debugging-port for the agent
curl -X POST http://localhost:3000/api/agent \
  -H 'content-type: application/json' \
  -d '{"affordance":"runtime.ensure","input":{}}'
# → { "attached": true, "launched": true|false, "tabRuntime": "cdp", ... }

curl -X POST http://localhost:3000/api/agent \
  -H 'content-type: application/json' \
  -d '{"affordance":"runtime.targets","input":{}}'
# → { "targets": [{ "id": "TARGET_ID", "title": "...", "url": "..." }], ... }

curl -X POST http://localhost:3000/api/agent \
  -H 'content-type: application/json' \
  -d '{"affordance":"tabs.bind","input":{"targetId":"TARGET_ID"}}'
# note TAB_ID and a ref from tab.actions[]

curl -X POST http://localhost:3000/api/agent/tabs/TAB_ID/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.click","input":{"ref":"eN"}}'

curl -o shot.png http://localhost:3000/api/agent/tabs/TAB_ID/screenshot

curl -X DELETE http://localhost:3000/api/agent/tabs/TAB_ID
# bound page stays open; OmniOS tab is gone. Chrome stays up.
```

Optional companion if you want a Chrome window first (then `runtime.ensure`
attaches to it):

```bash
npm run chrome:debug
```

`runtime.attach` remains for a specific `{ "cdpUrl" }` or `{ "port" }`.
The common path does not need it.

`runtime.targets` is the already-open pages in that Chrome — not OmniOS
`tabs.list`. `tabs.bind` makes one of those pages an OmniOS tab (snapshot,
refs, screenshot, act-by-ref). `tabs.dispose` on a **bound** tab **unbinds**
and does **not** close the user page.

`tabs.create` after ensure/attach still opens a **new OmniOS page/target** in
that Chrome (isolated context). `tabs.dispose` of that created page closes that
target only. It does **not** quit Chrome — not the user's process, and not a
Chrome that `runtime.ensure` launched. Dispose of the last tab leaves that
process up. Never `Browser.close`.

Launching a new disposable profile remains available: skip ensure/attach
and call `tabs.create` as usual.

`OMNI_CDP_URL` is an optional process default. Prefer `runtime.ensure` so an
agent can get a debug Chrome without a flag or an OmniOS restart.

This surface does not call Ollama, Anthropic, Gemini, or NewsAPI.

## Also in this repo

Citadel (`/`) and Garden (`/garden`) are an older canvas / persona workspace.
They are **not** this product. `/` is unchanged and is not redirected.

Those pages may use optional server-side keys (unused by `/api/agent`):

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `OLLAMA_BASE_URL` | Local LLM (Ollama). Default `http://localhost:11434`. |
| `ANTHROPIC_API_KEY` | Claude for Citadel Mind / personas. |
| `GOOGLE_API_KEY` | Gemini for Citadel Mind / personas. |
| `NEWSAPI_KEY` | NewsAPI data blocks. |

Without keys, Citadel still runs against built-in mock data. Do not host that
canvas publicly with shared keys. See `IMPLEMENTATION_PLAN.md`.
