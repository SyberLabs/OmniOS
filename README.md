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
(or `OMNI_CHROME_PATH` / `OMNI_CDP_URL`). **Playwright** is a **test adapter**
only (`OMNI_TAB_RUNTIME=playwright` in CI / Vitest). It is not the product
path. Playwright can be removed later without the HTTP API changing.

Local fixtures (no internet): `/agent-fixture.html` and `/agent-fixture-b.html`.

## Product contract

`GET /api/agent` is the frozen contract (`src/core/agent/contract.ts`).
Callers depend on named affordances and the snapshot shape
(`id`, `title`, `url`, `text`, `actions[]`, `screenshot`) plus
`keyRequired: false`. They do not depend on Chrome/CDP or Playwright.
`tabRuntime` is discovery-only (`cdp` | `playwright`). No caller-visible
`BrowserContext`, `storageState`, or CDP port.

Each tab is a **local lightweight browser state** — not a JSON note, not a
Citadel canvas, and not a hosted-model chat. Cookies / `localStorage` live in
`.omni/profiles/<tabId>/`. The same tab id rehydrates after an OmniOS process
restart. `tabs.dispose` deletes that profile.

| Method | Path | Affordance |
|--------|------|------------|
| `GET` | `/api/agent` | Discover named actions (id, description, input schema, what they mutate) |
| `POST` | `/api/agent` | Invoke `{ "affordance": "<id>", "input": { ... } }` |
| `GET` | `/api/agent/tabs` | `tabs.list` |
| `POST` | `/api/agent/tabs` | `tabs.create` — `{ "url" }` loads the page |
| `GET` | `/api/agent/tabs/{id}` | `tabs.read` — title, URL, visible text, `actions[]` refs, `screenshot` |
| `GET` | `/api/agent/tabs/{id}/screenshot` | `tab.screenshot` — live PNG (`image/png`) |
| `POST` | `/api/agent/tabs/{id}/act` | `tab.navigate` / `tab.click` / `tab.type` (prefer `ref`) |
| `DELETE` | `/api/agent/tabs/{id}` | `tabs.dispose` — context gone |

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

Optional attach to an already-running browser:

```bash
# chrome --remote-debugging-port=9222
# export OMNI_CDP_URL=http://127.0.0.1:9222
npm run dev
```

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
