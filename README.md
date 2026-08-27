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
(`curl`, `fetch`, or another agent's HTTP client). A tab is a local,
lightweight, persistent browser/session state record — not a Citadel canvas
and not a hosted-model chat. No API key is required. Do not send
`Authorization` or provider keys.

Citadel (`/`) and Garden (`/garden`) are unchanged.

```bash
npm run dev
```

Human / browser-agent view: [http://localhost:3000/surface](http://localhost:3000/surface)

| Method | Path | Affordance |
|--------|------|------------|
| `GET` | `/api/agent` | Discover named actions (id, description, input schema, what they mutate) |
| `POST` | `/api/agent` | Invoke `{ "affordance": "<id>", "input": { ... } }` |
| `GET` | `/api/agent/tabs` | `tabs.list` |
| `POST` | `/api/agent/tabs` | `tabs.create` |
| `GET` | `/api/agent/tabs/{id}` | `tabs.read` |
| `POST` | `/api/agent/tabs/{id}/act` | `tabs.act` (`tab.write_note`, `tab.set_url`) |
| `DELETE` | `/api/agent/tabs/{id}` | `tabs.dispose` |

```bash
# 1. Discover (no key)
curl http://localhost:3000/api/agent

# 2. Create a tab
curl -X POST http://localhost:3000/api/agent/tabs \
  -H 'content-type: application/json' \
  -d '{"title":"research","url":"https://example.com"}'

# 3. Act (write a local note) — replace TAB_ID
curl -X POST http://localhost:3000/api/agent/tabs/TAB_ID/act \
  -H 'content-type: application/json' \
  -d '{"affordance":"tab.write_note","input":{"text":"follow the citations"}}'

# 4. Read persisted state
curl http://localhost:3000/api/agent/tabs/TAB_ID

# 5. Dispose
curl -X DELETE http://localhost:3000/api/agent/tabs/TAB_ID
```

Same loop via one invoke endpoint:

```bash
curl -X POST http://localhost:3000/api/agent \
  -H 'content-type: application/json' \
  -d '{"affordance":"tabs.create","input":{"title":"research"}}'
```

Seeded acts are local only. This surface does not call Ollama, Anthropic,
Gemini, or NewsAPI.

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
