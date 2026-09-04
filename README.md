# OmniOS

A canvas for thinking with AI over live data. Drop **blocks** that pull real
numbers: prediction markets, economic series, crypto, news, research: wire
them into **personas**, and ask a question that is answered from what the
wires are actually carrying.

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without any keys the canvas still runs: public sources (Polymarket, Metaculus,
HackerNews, World Bank) work as-is, and everything else falls back to built-in
mock data.

## The idea

A block is a live view of one source. A wire says *this feeds that*. A persona
is a mind whose entire context is what its incoming wires carry, so the
question "what does this thing actually know?" has a literal answer you can
point at on screen.

Shells are saved canvases. The Shell Store spawns pre-wired ones; the
**Investor** shell arrives with its blocks and wires already connected.

## Configuration

Keys are read **server-side** from `process.env` and are never sent to the
browser. Copy the example and fill in only what you need:

```bash
cp .env.example .env
```

| Variable | Purpose |
|----------|---------|
| `OLLAMA_BASE_URL` | Local LLM (Ollama). Default `http://localhost:11434`. No key. |
| `ANTHROPIC_API_KEY` | Claude for Mind / personas. |
| `GOOGLE_API_KEY` | Gemini for Mind / personas. |
| `NEWSAPI_KEY` | NewsAPI blocks. |

> **Hosting:** this is local-first and single-user. Keys are shared
> server-side, so public hosting would hand them to every visitor. Add
> authentication first. The dev and start scripts bind `127.0.0.1`.

## Development

```bash
npm run typecheck   # tsc, 0 errors
npm run lint        # eslint, 0 errors (warnings are tracked debt)
npm test            # vitest
npm run test:e2e    # playwright golden path (needs npm run build first)
npm run build
```

CI runs all five on every push and pull request.

## Not in this repo

- **The agent surface**: keyless local browser automation, `/surface` and
  `/api/agent`: moved to
  [SyberLabs/omni-agent](https://github.com/SyberLabs/omni-agent) on
  2026-09-01. It shared no module with the canvas.
- **The Garden and the life OS**: `/garden`, life-system domains, stability
  and equilibrium modelling: deleted on 2026-09-01. It was a second product
  in the same repo, ~15k lines whose value was gated on history that was
  never built. See `APEX_PLAN.md` §5.

The canvas is the product.

## Docs

`APEX_PLAN.md` is the live roadmap. `vision.md` is the north star.
`WIRE_SYSTEM_GUIDE.md`, `TYPED_PORT_SYSTEM.md` and `MEMORY_ARCHITECTURE.md`
cover the wire, port and memory layers.
