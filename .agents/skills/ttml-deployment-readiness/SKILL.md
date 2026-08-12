---
name: ttml-deployment-readiness
description: Full deployment readiness audit for the TTML (Talk-to-My-Lawyer) app before pushing to Railway production. Use AGGRESSIVELY whenever Moiz says "is this deployment ready", "check the repo before deploy", "audit the app", "is it safe to ship", "pre-deploy check", or any variant of wanting confidence before a Railway deploy. Covers TypeScript compilation, vitest suite, esbuild bundles, Railway config, Dockerfile, env vars, Supabase migrations (Drizzle journal), and LangGraph code correctness. Finds and fixes deployment-blocking bugs before they hit production.
license: MIT
metadata:
  version: "2.0.0"
---

# TTML Deployment Readiness

Audit TTML (`moibftj/ttml-app`) before a Railway deploy. Stack is Vite 7 + Express 4.21 + tRPC v11 + Drizzle ORM 0.44/0.45 + Supabase PostgreSQL, packaged via a multi-stage Dockerfile. Three Railway services (**app**, **worker**, **migrate**) share one image.

Trigger words: *deployment ready*, *check the repo before deploy*, *audit the app*, *is it safe to ship*, *pre-deploy check*.

---

## The Validation Gate

Every deploy must pass, in order:

```bash
pnpm check   # tsc --noEmit — zero errors required
pnpm test    # vitest run — ~1300 tests, 54 files
pnpm build   # vite (client → dist/public) + 4 esbuild bundles:
             #   dist/index.js   (server entry)
             #   dist/worker.js  (pg-boss worker)
             #   dist/migrate.js (Drizzle migrator, one-shot)
             #   dist/instrument.js (Sentry boot)
```

Fail-closed. If any step errors, the deploy is NOT ready. Do not bypass. There is **no** separate `type-check` script — `pnpm check` is the gate.

---

## Build Layout

- **Client:** `vite build` → `dist/public/` (served by Express in production via `server/_core/vite.ts:serveStatic`).
- **Server:** `esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist` → `dist/index.js`.
- **Worker:** `esbuild server/worker.ts ...` → `dist/worker.js`.
- **Migrator:** `esbuild server/migrate.ts ...` → `dist/migrate.js`.
- **Sentry instrumentation:** `esbuild server/instrument.ts ...` → `dist/instrument.js`, loaded via `node --import ./dist/instrument.js`.

All `node --dns-result-order=ipv4first` — required so pg-boss connects to `SUPABASE_DIRECT_URL` over IPv4 (Supabase's DB hostname resolves to IPv6 first on Railway, and Railway's egress does not route IPv6).

---

## Railway Service Matrix (`railway.toml` + `Dockerfile`)

| Service | startCommand | Needs Domain | Needs Healthcheck |
|---------|--------------|--------------|-------------------|
| **app (web)** | `node --dns-result-order=ipv4first --import ./dist/instrument.js dist/index.js` | ✅ | `/api/health`, 60s timeout, `ON_FAILURE` × 3 |
| **worker** | `node --dns-result-order=ipv4first --import ./dist/instrument.js dist/worker.js` | ❌ | ❌ (daemon) |
| **migrate** | `node --dns-result-order=ipv4first dist/migrate.js` | ❌ | One-shot per deploy |

Image: `FROM node:25-alpine` in two stages (builder + production). `pnpm@10.4.1` installed via `npm install -g` — **not** corepack prepare (corepack OOMs on Railway builds, exit code 137). Stage-1 install uses `--no-frozen-lockfile` so `pnpm-lock.yaml` can regenerate against drifted `package.json`; stage-2 prod install uses `--frozen-lockfile` against the lockfile emitted from stage 1.

Legacy single-container mode: `startCommand = "./start.sh"` runs migrate + worker + web in one process. Only use when the platform can't do multi-service.

---

## Blocker Checklist

### 1. TypeScript / esbuild

- `pnpm check` clean.
- `pnpm build` emits **all four** bundles (`index.js`, `worker.js`, `migrate.js`, `instrument.js`) without warnings.
- No import from `server/n8nMcp.ts` — it is an **empty deprecated stub** (15 lines, `export {};`) since 2026-04-16. Importing anything from it breaks the build.
- `@ai-sdk/*` and `@langchain/*` packages are marked `external` via `--packages=external`; verify no accidental `external:` override reintroduces them.

### 2. Drizzle / Supabase migrations

- Every new SQL file in `drizzle/NNNN_*.sql` has a matching entry in `drizzle/meta/_journal.json`. Hand-editing the journal is forbidden.
- Latest migration as of this skill version: `0046_new_tables_and_blog_review.sql`. Verify via `ls drizzle/*.sql | tail -3`.
- Migrator connects via `SUPABASE_DIRECT_URL` (direct DB, IPv4). The pooler URL (`DATABASE_URL`) cannot run DDL.
- Run `pnpm db:check-migrations` locally to detect drift between `drizzle/meta/_journal.json` and the `__drizzle_migrations` table.
- Storage buckets / RLS policies in new migrations must be idempotent (`CREATE ... IF NOT EXISTS`, `DROP POLICY IF EXISTS`).

### 3. Env vars (must be set on each Railway service)

**App + worker:**
- `DATABASE_URL` (Supabase pooler — 6543 pgbouncer) — for normal queries
- `SUPABASE_DIRECT_URL` (Supabase direct — 5432) — for pg-boss and migrations
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (raw-body signature validation)
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GROQ_API_KEY` (pipeline providers)
- `SENTRY_DSN` (optional but `instrument.js` is always loaded)
- `APP_URL` / `PUBLIC_URL` for client-portal link construction
- `ADMIN_2FA_SECRET` for the `admin_2fa` cookie signer
- `AFFILIATE_WORKER_URL` / `AFFILIATE_WORKER_SECRET` (Cloudflare Worker allowlist sync — optional, fire-and-forget)

**Feature gates:**
- `PIPELINE_MODE=langgraph` selects the LangGraph StateGraph inside the orchestrator.
- `LANGGRAPH_PIPELINE=true` gates the worker's LangGraph path.
- These two flags are **distinct** — do not conflate them.

**Frontend (built into the Vite bundle at build time — already baked in):**
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_PUBLISHABLE_KEY`)
- `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_SENTRY_DSN` (optional)
- Only `VITE_`-prefixed vars ship to the browser. Never expose service-role keys via `VITE_`.

### 4. LangGraph pipeline (`server/pipeline/graph/`)

Nodes (`server/pipeline/graph/nodes/`): `research.ts`, `draft.ts`, `assembly.ts`, `vetting.ts`, `finalize.ts`. State machine in `graph/state.ts`; topology in `graph/index.ts`.

Audit hot spots:
- Every `generateText` / `generateObject` call passes `AbortSignal.timeout(...)` using the constants from `server/pipeline/providers.ts`: `RESEARCH_TIMEOUT_MS = 90_000`, `DRAFT_TIMEOUT_MS = 90_000`, `ASSEMBLY_TIMEOUT_MS = 90_000`.
- Stages 2/3/4 use `anthropic("claude-sonnet-4-20250514")` — **not** Opus. The `claude-opus-4-5` entry in the pricing table is legacy.
- Stage 1 failover chain: Perplexity `sonar-pro` → OpenAI `gpt-4o-search-preview` (Responses API + webSearchPreview tool) → Claude Sonnet 4 non-web-grounded.
- Stages 2-4 failover chain: primary Sonnet 4 → OpenAI `gpt-4o-mini` → Groq `llama-3.3-70b-versatile`.
- `finalize` and `fail` nodes must both be reachable from `routeAfterVetting`. Verify no orphan edges after a topology edit.
- Streaming writes go to `pipeline_stream_chunks` via Supabase Realtime — the frontend `useLetterStream` hook reads from there. A vetting retry loop should not duplicate-stream tokens.

### 5. Invariant smoke tests

- `shared/pricing.ts` exports `$299` single / `$299`/mo / `$2,400`/yr and `FIRST_LETTER_REVIEW_PRICE = $50`. Grep for hardcoded `$200`, `$2000`, `$20` — none should exist outside `shared/pricing.ts`.
- `SUPER_ADMIN_EMAILS = ["ravivo@homes.land", "moizj00@gmail.com"]` in `server/supabaseAuth/client.ts:12` — unchanged.
- `letter_status` and `ALLOWED_TRANSITIONS` in `shared/types/letter.ts` — 16 statuses. No raw status string literals anywhere else.
- `admin_2fa` cookie check active in `adminProcedure` (`server/_core/trpc.ts`).

### 6. Stripe webhook

- `POST /api/stripe/webhook` uses **raw body** via a dedicated middleware (NOT `express.json()`).
- Signature verified with `STRIPE_WEBHOOK_SECRET` before any DB write.
- Idempotency enforced via unique `processed_stripe_events.event_id` PK. Commissions idempotent via unique index on `commission_ledger.stripe_payment_intent_id`.

### 7. Tests & CI

- Any new behaviour in `server/**/*.ts` should have a paired `server/phaseNN-*.test.ts`.
- Run a single file when iterating: `pnpm test -- server/phase67-pricing.test.ts`.
- `test:e2e` (Playwright) is not part of the gate but should pass on main before a high-risk deploy.

---

## Common Deployment Regressions (learned the hard way)

1. **Worker hangs on pg-boss job** — usually `SUPABASE_DIRECT_URL` missing or IPv6-resolving. Check `--dns-result-order=ipv4first` is in the worker's `startCommand`.
2. **OAuth redirect loop on Railway** — `pkce_verifier` cookie missing `SameSite=None; Secure=true`. Only an issue in production (cross-site redirect from Supabase).
3. **Webhook signature failure** — `express.json()` mounted before the webhook route; raw body is lost. The Stripe route must be declared BEFORE the JSON parser.
4. **Migrate service stuck** — drift between `drizzle/meta/_journal.json` and `__drizzle_migrations`. Run `pnpm db:check-migrations` to diagnose; `pnpm db:backfill-migrations` to recover.
5. **TS build OOM (exit 137)** — caused by `corepack prepare` in the Dockerfile. Already switched to `npm install -g pnpm@10.4.1` — do not revert.
6. **Silent n8n callback 404** — n8n MCP has been removed (`server/n8nMcp.ts` is a stub). The REST endpoint `/api/pipeline/n8n-callback` still exists but only serves legacy webhook workflows; new work should go through the LangGraph graph.
7. **Sentry `instrument.js` not loaded** — must use `--import ./dist/instrument.js`, not `-r` / `--require` (ESM vs CJS).

---

## Output Format for Audit Reports

When producing a deployment readiness report, use this structure:

1. **Verdict** — one of `READY`, `READY WITH FOLLOW-UPS`, `BLOCKED`.
2. **Gate results** — `pnpm check`, `pnpm test`, `pnpm build` pass/fail.
3. **Blockers** — each with file path + one-sentence root cause + the fix.
4. **Follow-ups** — non-blocking issues to address post-deploy.
5. **Env matrix** — which env vars need to be set/rotated on each Railway service.
6. **Migrations** — list of new `drizzle/NNNN_*.sql` files to apply, and journal delta.
7. **Rollback plan** — the last-known-good commit SHA and any data-state caveats (e.g., "0045 added NOT NULL column; rollback requires a follow-up migration to drop it").

Keep it terse. Order blockers by risk (security → data loss → user-visible breakage → code quality).
