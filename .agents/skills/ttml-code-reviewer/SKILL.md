---
name: ttml-code-reviewer
description: Review TTML code diffs for correctness, security, and performance against the canonical Vite + Express + tRPC + Drizzle + Supabase stack. Flag data leaks, anti-patterns, and provide focused patch suggestions.
license: MIT
metadata:
  version: "2.0.0"
---

# TTML Code Reviewer

Review code diffs in the **Talk-to-My-Lawyer** monorepo (`moibftj/ttml-app`) — a Vite SPA + Express + tRPC v11 + Drizzle ORM + Supabase PostgreSQL stack. **Not Next.js**, not App Router.

---

## Stack Cheat-Sheet (what to assume when reading a diff)

| Layer | Canonical |
|-------|-----------|
| Frontend | Vite 7 + React 19 + wouter + TanStack Query v5 + Tailwind v4 (no `tailwind.config.js`; `@theme inline` in `client/src/index.css`) |
| Backend | Express 4.21 + tRPC 11 (domain sub-routers in `server/routers/`) |
| DB | Drizzle 0.44/0.45 on Supabase PostgreSQL; schema split across `drizzle/schema/` |
| Auth | Supabase Auth → JWT → server syncs to local `users` table (30s cache). JWT read from `Authorization` header OR `sb_session` httpOnly cookie |
| Pipeline | 4 stages: Perplexity `sonar-pro` → Claude Sonnet 4 (`claude-sonnet-4-20250514`) draft → Sonnet 4 assembly → Sonnet 4 vetting. **Not Opus.** OpenAI `gpt-4o-search-preview` failover for Stage 1. |
| Queue | pg-boss on `SUPABASE_DIRECT_URL` (IPv4 forced); worker in `server/worker.ts`. No Redis/BullMQ. |
| Payments | Stripe Checkout + raw-body webhook at `/api/stripe/webhook`; idempotency via `processed_stripe_events` |
| Pricing | `$299` single / `$299`/mo (4 letters) / `$2,400`/yr (8 letters); `FIRST_LETTER_REVIEW_PRICE = $50`. Import from `shared/pricing.ts` — never hardcode. |

---

## High-Signal Things to Flag

### 1. Invariant violations (from `CLAUDE.md`)
- Hardcoded pricing strings (`$200`, `$2000`, `$20`) anywhere other than `shared/pricing.ts`.
- Hardcoded letter-status strings — import from `shared/types/letter.ts` (`ALLOWED_TRANSITIONS`, `STATUS_CONFIG`).
- Direct `db.update(letterRequests).set({ status: ... })` — must go through `updateLetterStatus()` which enforces `isValidTransition(from, to)`.
- Client-only RBAC — server must re-check via one of `publicProcedure`, `protectedProcedure`, `emailVerifiedProcedure`, `subscriberProcedure`, `verifiedSubscriberProcedure`, `employeeProcedure`, `attorneyProcedure`, `adminProcedure` (base in `server/_core/trpc.ts`; role-specific variants in `server/routers/_shared.ts`).
- Any UI or API that assigns the `admin` role dynamically — the `admin` role is gated by the hard-coded whitelist `SUPER_ADMIN_EMAILS = ["ravivo@homes.land", "moizj00@gmail.com"]` in `server/supabaseAuth/client.ts`. Admin endpoints additionally require the `admin_2fa` cookie (`server/_core/admin2fa.ts`).
- Mutating an `ai_draft` `letter_versions` row — that version is immutable. Create a new `attorney_edit` version instead.
- Missing `logReviewAction` on a status change.

### 2. Drizzle & schema
- Arrays: `text().array()` — not `array(text())`.
- Subscription allowance columns are `letters_allowed` and `letters_used`. **No** `remaining_letters` column exists — flag any reference as stale.
- `user_role` enum is flat: `subscriber | employee | attorney | admin`. **No** `admin_sub_role` column. Super admin is enforced in code, not in a column.
- DB logic lives in `server/db/<domain>.ts` — never write raw Drizzle inside tRPC routers.

### 3. tRPC correctness
- Object-form queries only: `useQuery({ queryKey: [...] })`.
- Do not write a `queryFn` for tRPC — the default fetcher is preconfigured.
- Every mutation should invalidate relevant TanStack Query keys.
- Use `TRPCError` with a correct code (`NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST`, `UNAUTHORIZED`) — never raw `Error`.

### 4. Pipeline & worker
- New AI work must flow through `server/pipeline/orchestrator.ts` or the LangGraph StateGraph in `server/pipeline/graph/` (`nodes/{research,draft,assembly,vetting,finalize}.ts`). Never call pipeline stages from a tRPC router.
- `generateText` / `generateObject` calls must pass an `AbortSignal` with the correct timeout constant (`RESEARCH_TIMEOUT_MS = 90_000`, `DRAFT_TIMEOUT_MS = 90_000`, `ASSEMBLY_TIMEOUT_MS = 90_000`) from `server/pipeline/providers.ts`.
- Any new `workflow_jobs` write should include `jobType`, `provider`, `status`, token counts, and `estimatedCostUsd`.
- `server/n8nMcp.ts` is an **empty deprecated stub** (2026-04-16). Any import from it is a red flag and will fail TS.
- The two LangGraph env gates are distinct: `PIPELINE_MODE=langgraph` selects the graph in the orchestrator; `LANGGRAPH_PIPELINE=true` gates the worker path. Don't conflate them.

### 5. Payment & Stripe
- Stripe webhook must validate the signature with `STRIPE_WEBHOOK_SECRET` **before** any DB write.
- Idempotency via `processed_stripe_events` (event.id PK).
- Never trust subscription counts from the client — read from `subscriptions.letters_allowed` / `letters_used`.
- Commission writes should be inside a transaction with the subscription update. Rate: `500` bps (5%) in cents; stored in `commission_ledger.commission_amount`.

### 6. Security / data leakage
- `versions.get` must truncate content for a subscriber when status is `generated_locked` and they haven't paid (server-side gate — frontend blur is defense-in-depth only).
- Email + PDF side effects must be fire-and-forget with `.catch()` — never block the mutation response.
- No PII (email, address, full intake JSON) in unstructured logs — use `server/logger.ts`.
- No service keys shipped to the browser; `VITE_*`-prefixed env vars only.

### 7. Tests & CI
- New behavior in `server/**/*.ts` should have a `server/phaseNN-*.test.ts` vitest case.
- Migrations must be paired with a Drizzle journal entry in `drizzle/meta/_journal.json`.
- `pnpm check && pnpm test && pnpm build` must all pass — there is no separate `type-check` script.

---

## Output Format

- **Blocking Issues** — invariant violations, security bugs, data leaks, broken builds. Each entry: file path + line range + one-sentence problem + patch.
- **Correctness & Edge Cases** — logic bugs, missing `NOT_FOUND` guards, race conditions, missing cache invalidation.
- **Consistency** — deviations from `server/routers/` conventions, `server/db/` helpers, `shared/types/letter.ts` enums.
- **Performance** — missing indexes, N+1 Drizzle calls, unnecessary `await` on side effects.
- **Suggested Patches** — diff-style snippets, minimal and focused. Prefer one patch per concern.

Keep it terse. Order blocking issues by risk (security → data loss → user-visible breakage → code quality).
