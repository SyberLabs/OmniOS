# Deployment

**Status: CI is production-grade. CD is deliberately not built yet.**

This records the decision so it does not get re-argued from scratch, and lists
what has to be true before OmniOS is reachable from anywhere but your own
machine.

## The decision

When OmniOS is deployed, it goes on a **private network** - Tailscale,
WireGuard, or an IP allowlist - not on a public URL.

That is not caution for its own sake. OmniOS has **no application
authentication**. The only `Authorization` headers in the codebase are outbound
to data providers. Every route is open to whoever can reach the port:

| Route | What an anonymous visitor gets |
|-------|-------------------------------|
| `POST /api/llm` | Spends your Anthropic / Google credits, unmetered |
| `GET /api/data?provider=` | Spends your FRED / BLS / NewsAPI / Alpha Vantage quota |
| `GET /api/inference-runs` | Reads `prompt_excerpt` and `output_excerpt` from every run |
| `GET /api/inference-runs/:id/lineage` | Reads whole cascades, several hops deep |

The last two are newer than the rest. Before the inference ledger, a public
deploy leaked API credits; now it also leaks the content of past conversations.
The ledger made the exposure worse, which is exactly why it is written down
here rather than left as a footnote.

`npm run dev` and `npm start` bind `127.0.0.1` for this reason. A container
deployment binds `0.0.0.0` inside the container and is exposed only on the
private network - the app's own posture does not change.

## Before any public URL

All four, not three:

- [ ] **Authentication.** Next middleware gating `/` and `/api/:path*` on a
      signed session cookie, with the password compared against a
      `scrypt`/`argon2` hash in env. Single-user is fine; absent is not.
- [ ] **Rate limiting on `/api/llm`.** Auth stops strangers, not a stolen
      cookie or your own runaway cascade. Cost is unbounded without it.
- [ ] **An identity column on `inference_run`.** The ledger records what the
      server did, not who asked - honest for one user, wrong for several.
      See `INFERENCE_LEDGER.md`, *Limitations*. It goes in **with** auth, never
      before: a `user_id` with nothing to populate it is a fiction.
- [ ] **A `running`-row reaper.** A crashed process leaves `running` rows by
      design. Nothing reaps them today; unbounded, that is a slow leak.

## What CI already guarantees

Every push and PR, four jobs (`.github/workflows/ci.yml`):

| Job | Guarantees |
|-----|-----------|
| **Typecheck, Test & Build** | tsc, vitest, eslint (0 errors), `next build`, Playwright golden path |
| **Client bundle carries no secrets** | Builds with a canary value for every secret env var, then fails if any reaches `.next/static` |
| **Inference Ledger (Postgres)** | Migrations apply and re-apply cleanly against `postgres:16`; CHECK constraints, foreign keys, cascade and the recursive lineage walk all execute |
| **Dependency audit** | Production dependencies block on `high`; dev-only advisories are reported, not blocking |

The bundle scan is the one worth understanding, because it guards the property
the whole server-proxy architecture exists for. It does not grep for variable
*names* - a name proves nothing, and CI has no real keys. It builds with
`ANTHROPIC_API_KEY=OMNI-CANARY-ANTHROPIC_API_KEY-<run id>` and friends, then
looks for those exact values in what a browser is served. A canary in
`.next/static` means a real key would have been there too.

Run it locally against your own `.env`:

```bash
npm run build
npm run scan:bundle
```

It exits `2` rather than `0` if it could not have failed - no bundle, or no
secrets set. A scan that proves nothing does not get to report a pass.

## When CD is built

Whatever the target, these carry over:

- **Migrations run before the new version serves traffic**, as a release step
  that fails the deploy. `npm run db:migrate` is idempotent and records applied
  files in `schema_migrations`, so a re-run is a no-op.
- **`DATABASE_URL` is a deploy secret**, never baked into an image. It is in
  `SECRET_ENV_VARS`, so the bundle scan already covers it.
- **The image needs `output: 'standalone'`** in `next.config.ts` - not set
  today, because nothing needs it yet.
- **Ollama reachability decides the target.** `provider: 'local'` is
  first-class in this app and needs to reach `localhost:11434`. A serverless
  deploy silently breaks it; a container on a host that can see Ollama does
  not. That is the main reason a Docker image beats Vercel here, despite
  Vercel being the obvious answer for a Next app.
