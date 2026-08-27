This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Configuration

Omni OS is **local-first and single-user**. API keys are read server-side from
environment variables and are **never** sent to or stored in the browser.

1. Copy the example env file and fill in the keys you need:

   ```bash
   cp .env.example .env
   ```

2. Available variables (all optional — leave blank to skip a provider):

   | Variable | Purpose |
   |----------|---------|
   | `OLLAMA_BASE_URL` | Local LLM (Ollama) endpoint. Default `http://localhost:11434`. No key needed. |
   | `ANTHROPIC_API_KEY` | Claude models for the Mind / personas. |
   | `GOOGLE_API_KEY` | Gemini models for the Mind / personas. |
   | `NEWSAPI_KEY` | NewsAPI data blocks. |

   Polymarket and Metaculus use public APIs and need no key.

3. Without any keys, the app still runs against built-in **mock data** (toggle in
   Settings). The Local (Ollama) provider also works fully offline.

> ⚠️ **Hosting:** because keys are shared server-side, public/multi-user hosting
> would expose them to every visitor. Add authentication before deploying
> publicly. See `IMPLEMENTATION_PLAN.md`.

## Agent surface (no API key)

OmniOS also exposes a **keyless** affordance surface for an arbitrary agent
(`curl`, `fetch`, or another agent's HTTP client). A tab is a real disposable
browser page with an isolated context — not a JSON note, not a Citadel canvas,
and not a hosted-model chat. Each tab id gets its own Playwright context and
`storageState` directory. Cookies and `localStorage` persist across HTTP
calls on that tab only. Two tabs on the same origin do not share a session.
No API key is required.

Citadel (`/`) and Garden (`/garden`) are unchanged.

```bash
npm run dev
```

Human / browser-agent view: [http://localhost:3000/surface](http://localhost:3000/surface)

Local fixture pages (no internet): `/agent-fixture.html` and `/agent-fixture-b.html`.

| Method | Path | Affordance |
|--------|------|------------|
| `GET` | `/api/agent` | Discover named actions (id, description, input schema, what they mutate) |
| `POST` | `/api/agent` | Invoke `{ "affordance": "<id>", "input": { ... } }` |
| `GET` | `/api/agent/tabs` | `tabs.list` |
| `POST` | `/api/agent/tabs` | `tabs.create` — `{ "url" }` loads the page |
| `GET` | `/api/agent/tabs/{id}` | `tabs.read` — title, URL, visible text, `actions[]` refs |
| `POST` | `/api/agent/tabs/{id}/act` | `tab.navigate` / `tab.click` / `tab.type` (prefer `ref`) |
| `DELETE` | `/api/agent/tabs/{id}` | `tabs.dispose` — context gone |

```bash
# 1. Discover (no key)
curl http://localhost:3000/api/agent

# 2. Open a URL — the create body IS the snapshot (title / text / actions[])
curl -X POST http://localhost:3000/api/agent/tabs \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:3000/agent-fixture.html"}'
# → { "tab": { "title":"Agent Fixture A", "actions":[
#      {"ref":"e2","role":"button","name":"Persist session","actions":["click"]}
#    ]}, "keyRequired": false }

# 3. Act by ref — the act body is a FRESH snapshot (no extra GET)
curl -X POST http://localhost:3000/api/agent/tabs/TAB_ID/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.click","input":{"ref":"e2"}}'
# → tab.text includes "session: alive / persisted"
# → tab.actions now also includes { "ref":"e5", "name":"Reveal next" }

curl -X POST http://localhost:3000/api/agent/tabs/TAB_ID/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.type","input":{"ref":"e3","text":"Ada"}}'

# 4. Navigate — also returns a fresh snapshot
curl -X POST http://localhost:3000/api/agent/tabs/TAB_ID/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.navigate","input":{"url":"http://localhost:3000/agent-fixture-b.html"}}'

# 5. Dispose — later read/act return 404
curl -X DELETE http://localhost:3000/api/agent/tabs/TAB_ID
```

Two tabs on the same fixture stay isolated:

```bash
# Open A and B on the same origin
curl -X POST http://localhost:3000/api/agent/tabs \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:3000/agent-fixture.html"}'
curl -X POST http://localhost:3000/api/agent/tabs \
  -H 'content-type: application/json' \
  -d '{"url":"http://localhost:3000/agent-fixture.html"}'

# Act only in A
curl -X POST http://localhost:3000/api/agent/tabs/TAB_A/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.click","input":{"ref":"e2"}}'
# → A: session: alive / persisted

# B is still clean (reload so the snapshot is not a stale open page)
curl -X POST http://localhost:3000/api/agent/tabs/TAB_B/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.navigate","input":{"url":"http://localhost:3000/agent-fixture-b.html"}}'
# → B: session: empty / empty

curl -X DELETE http://localhost:3000/api/agent/tabs/TAB_A
# B still works; A is 404
```

Same loop via one invoke endpoint:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H 'content-type: application/json' \
  -d '{"affordance":"tabs.create","input":{"url":"http://localhost:3000/agent-fixture.html"}}'
```

This surface does not call Ollama, Anthropic, Gemini, or NewsAPI. It launches
a local headless Chromium (`npx playwright install chromium`).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
