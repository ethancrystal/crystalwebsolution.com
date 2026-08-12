---
name: ttml-pipeline-expert
description: "Expert in the Talk-To-My-Lawyer (TTML) legal letter generation pipeline, attorney review workflow, and status machine. Use for: managing the 4-stage AI pipeline (Perplexity → Claude Sonnet 4 → Claude Sonnet 4 → Claude Sonnet 4), handling letter status transitions, auditing review actions, and troubleshooting generation failures."
---

# TTML Pipeline & Status Expert

Procedural knowledge and business logic required to manage the lifecycle of a legal letter request within the Talk-To-My-Lawyer (TTML) platform.

> **Verified against:** 2026-04-20 — `server/pipeline/orchestrator.ts`, `server/pipeline/providers.ts`, `server/worker.ts`, `server/routers/review/*`, `shared/types/letter.ts`.

---

## 1. Pipeline Routing Gate (Orchestrator, top of `runFullPipeline`)

Before any stage runs, `server/pipeline/orchestrator.ts` branches on `PIPELINE_MODE`:

| `PIPELINE_MODE` value | Behaviour |
| :--- | :--- |
| `langgraph` | Bypass pg-boss and run the LangGraph StateGraph synchronously via `runLangGraphPipeline`. |
| `simple` | Single-stage Claude-only draft via `runSimplePipeline` — no research, no vetting. |
| *(unset / other)* | **Default**: n8n webhook-first, in-app 4-stage fallback. |

There is also a **worker-level gate** (`LANGGRAPH_PIPELINE=true` in `server/worker.ts`) that routes pg-boss jobs through the LangGraph path while keeping the job under pg-boss ownership. On LangGraph failure, the worker releases and re-acquires the lock, then falls through to the classic pipeline. Do not confuse the two gates.

> **Never**: there is no MCP tier. The `server/n8nMcp.ts` file is an empty stub deprecated on April 16, 2026. References to “n8n MCP” in older docs are stale.

---

## 2. The In-App 4-Stage AI Pipeline

When the orchestrator falls back to (or runs directly via) the in-app path, stages execute sequentially with 90-second `AbortSignal` timeouts.

| Stage | Primary Model | Failover | Source |
| :--- | :--- | :--- | :--- |
| **1. Research** | Perplexity `sonar-pro` (direct API, `baseURL: https://api.perplexity.ai`) | OpenAI `gpt-4o-search-preview` via Responses API with `webSearchPreview` tool; final fallback = Claude Sonnet 4 without web grounding (sets `researchUnverified: true`) | `server/pipeline/research.ts` |
| **2. Drafting** | **Claude Sonnet 4** (`claude-sonnet-4-20250514`) | `gpt-4o-mini` | `server/pipeline/drafting.ts` |
| **3. Assembly** | **Claude Sonnet 4** (`claude-sonnet-4-20250514`) | `gpt-4o-mini` | `server/pipeline/assembly.ts` |
| **4. Vetting** | **Claude Sonnet 4** (`claude-sonnet-4-20250514`) | `gpt-4o-mini`; final fallback = Groq `llama-3.3-70b-versatile` (free OSS) | `server/pipeline/vetting.ts` |

> **Important:** All four Claude stages use **Claude Sonnet 4**, NOT Opus. Model IDs are pinned in `server/pipeline/providers.ts` (`getDraftModel`, `getAssemblyModel`, `getVettingModel`). Pricing rows in `MODEL_PRICING` cover both the full (`claude-sonnet-4-20250514`) and short (`claude-sonnet-4`) IDs to avoid drift.

### Timeouts (all 90s)

```ts
RESEARCH_TIMEOUT_MS = 90_000;
DRAFT_TIMEOUT_MS    = 90_000;
ASSEMBLY_TIMEOUT_MS = 90_000;
```

### Pipeline Invariants

- **n8n default routing** (`N8N_PRIMARY=true`, `N8N_WEBHOOK_URL` set): orchestrator POSTs to the webhook with `X-Auth-Token: N8N_CALLBACK_SECRET`, using `AbortSignal.timeout(10_000)` for the ack. On HTTP error, timeout, or non-2xx ack, the orchestrator gracefully falls through to the in-app pipeline and logs `provider: "multi-provider"` in `workflow_jobs`. Stale URLs ending `ttml-legal-pipeline` are auto-corrected to `legal-letter-submission`.
- **Research grounding**: Perplexity primary; `gpt-4o-search-preview` secondary; Claude Sonnet 4 (ungrounded) last. `researchUnverified` must be surfaced on the letter for attorney acknowledgment at approval time.
- **Intermediate content registry**: `_intermediateContentRegistry` retains the best draft produced so far so the worker can recover a partial output if a later stage crashes.
- **Vetting retry loop**: critical issues (jurisdiction mismatch, hallucinated citations, factual errors) trigger re-assembly. Max 2 retries. After that, the letter is flagged `qualityDegraded` with `qualityWarnings` and still promoted to `generated_locked` for attorney correction.
- **Workflow logging**: every execution step MUST log to `workflow_jobs` via `server/db/pipeline-records.ts`, including token usage and `pipelineCostSummary`. **Log-label drift**: the in-app fallback stages array is hardcoded to `["perplexity-sonar-research", "openai-gpt4o-mini-draft", "openai-gpt4o-mini-assembly", "anthropic-sonnet-vetting"]` even though draft/assembly actually resolve to Claude Sonnet 4. Reading the label alone is misleading; confirm provider from the Drizzle row’s `provider` column.
- **Error capture**: Sentry. Retries initiated via `retryPipelineFromStage`. Job queue is **pg-boss** (PostgreSQL-native — no Redis/BullMQ).
- **pg-boss on Supabase** requires `SUPABASE_DIRECT_URL` on port **5432** (not the pooler). The worker forces IPv4 DNS (`dns.setDefaultResultOrder("ipv4first")`) at the top of `server/worker.ts` because Railway’s IPv6 egress fails against Supabase.

---

## 3. The Status Machine

All transitions validated against `ALLOWED_TRANSITIONS` in `shared/types/letter.ts`. Use `isValidTransition()` — never hardcode status strings.

### Canonical Workflow

1. `submitted` → `researching` (pipeline start)
2. `researching` → `drafting`
3. `drafting` → `generated_locked` (draft blurred/locked behind paywall)
4. `generated_locked` → `pending_review` (after confirmed Stripe payment **or** entitlement consumed from active subscription)
5. `pending_review` → `under_review` (attorney claims letter)
6. `under_review` → `approved` (attorney finalizes edit)
7. `approved` → `client_approval_pending` (optional; attorney requests subscriber review)
8. `client_approval_pending` → `client_approved` | `client_revision_requested` | `client_declined`
9. `client_approved` → `sent` (final delivery via `sendToRecipient`)

### Loopbacks & Recovery

- **`needs_changes`**: attorney flags for correction; transitions back to `submitted` when subscriber supplies more context, triggering a full pipeline re-run.
- **`pipeline_failed`**: terminal failure in AI stages; admin can reset to `submitted` for retry.
- **`rejected`**: attorney rejects entirely; subscriber can re-submit.
- **Admin override**: `forceStatusTransition` (in `server/routers/admin/letters.ts`, requires `admin_2fa` cookie) can bypass the state machine for recovery, provided the target state is consistent with the letter’s content versions.

---

## 4. Attorney Review Workflow

Located in `server/routers/review/`, gated by `attorneyProcedure` in `server/_core/trpc.ts`.

### Core Procedures

| Procedure | Effect |
| :--- | :--- |
| `queue` | Lists letters with status `pending_review`. |
| `claim` | Assigns the letter to the current attorney; transitions to `under_review`. |
| `unclaim` | Releases the letter back to `pending_review`; clears assignment. |
| `saveEdit` | Persists attorney progress as a new `attorney_edit` version. Never overwrites. |
| `approve` | Creates `final_approved` version, triggers server-side PDFKit render, uploads to Supabase Storage with a signed URL, notifies subscriber, feeds recursive-learning pipeline. Requires explicit acknowledgment when `researchUnverified === true`. |
| `requestChanges` | Moves letter to `needs_changes` and prompts subscriber for more info. |
| `reject` | Moves letter to `rejected` with a documented reason. |
| `requestClientApproval` | Moves `approved` letter to `client_approval_pending`. |

### Review Invariants

- **Version immutability**: `ai_draft` is immutable. Always create a new `LetterVersion` via `server/db/letter-versions.ts` for every edit (`attorney_edit`, `final_approved`). Never mutate.
- **Audit trail**: every transition and review action MUST be logged in `review_actions` via `logReviewAction` in `server/db/review-actions.ts`, specifying `internal` or `user_visible` visibility.
- **Role gating**: attorney actions are gated by `attorneyProcedure` — flat `user_role = 'attorney'` (no sub-roles). Admin is a strict whitelist in `SUPER_ADMIN_EMAILS` (hard-coded in `server/supabaseAuth.ts`).
- **Session invalidation**: after role changes, call `invalidateUserCache()` so the next tRPC call re-syncs Supabase identity → local `users` row.

---

## 5. Paywall & Entitlement Gate

Between `generated_locked` and `pending_review`, payment or entitlement must be consumed:

- **Single letter**: $299 (`29900¢`) via Stripe Checkout — `server/routers/stripe.ts`.
- **First-letter review fee**: $50 (`FIRST_LETTER_REVIEW_PRICE_CENTS = 5000`) applies on the subscriber’s first letter under some campaigns.
- **Subscription tiers** (columns `letters_allowed`, `letters_used` on `subscriptions` — **never** `remaining_letters`):
  - Monthly: $299/mo, `letters_allowed = 4`
  - Annual: $2400/yr, `letters_allowed = 8`
- **Affiliate discount**: `AFFILIATE_DISCOUNT_PERCENT = 20`.
- **Stripe idempotency**: `processedStripeEvents` table with `onConflictDoNothing()` guards webhook replays.

All pricing lives in `shared/pricing.ts`. Never hardcode a cents value elsewhere.

Letter content is truncated server-side (~100 chars) in `server/routers/versions.ts` when status is `generated_locked`. Frontend paywall blur is cosmetic (`client/src/components/LetterPaywall.tsx`) — never trust the client.

---

## 6. Troubleshooting & Maintenance

### Common Issues

- **Stuck in `researching`/`drafting`**: a `workflow_job` errored without a content version. Run admin `repairLetterState` to reset to `submitted`.
- **Stuck after n8n webhook**: check whether `X-Auth-Token` matches `N8N_CALLBACK_SECRET` and whether the n8n workflow is returning a callback to `/api/pipeline/n8n-callback` with `x-ttml-callback-secret`. If not, the orchestrator would have already fallen through to in-app; verify in `workflow_jobs.provider`.
- **Stuck in LangGraph path**: check `LANGGRAPH_PIPELINE` env, then `pipeline_stream_chunks` for streamed tokens, then `pipeline_failed` status. LangGraph failures release the lock and fall through to the classic pipeline under the same pg-boss job.
- **Quota exhaustion**: Perplexity, Anthropic, or OpenAI rate limits — check `workflow_jobs.error_message`.
- **PDF missing after approval**: PDFKit runs server-side in `server/pdf/pdfGenerator.ts`. Approval is non-blocking — check Sentry; user can re-trigger via `getDownloadUrl` which regenerates on demand.
- **Payment + status mismatch**: confirm the Stripe webhook fired and `processedStripeEvents` has the event. Look in `workflow_jobs` for the orchestrator’s `generated_locked → pending_review` transition.

### Recovery Playbook

1. Identify the failed stage in `workflow_jobs` (match by `letter_id`, sort by `created_at` desc).
2. Use `retryJob` (admin) or `enqueueRetryFromStageJob` to resume from the failed stage via pg-boss.
3. If the state machine is stuck, use `repairLetterState` or `forceStatusTransition` (admin + 2FA) to reset.
4. Monitor the **pipeline-worker** logs in Railway for pg-boss activity.
5. For LangGraph-specific debugging, stream `pipeline_stream_chunks` via Supabase Realtime — the `useLetterStream` React hook on the client surfaces tokens live.

---

## 7. Quick Reference

- **Orchestrator gate**: `PIPELINE_MODE` = `langgraph` | `simple` | (default n8n→in-app).
- **Worker gate**: `LANGGRAPH_PIPELINE=true` routes pg-boss jobs through LangGraph.
- **n8n webhook only**: MCP removed April 16, 2026.
- **Models**: Perplexity `sonar-pro`; Claude **Sonnet 4** (`claude-sonnet-4-20250514`) for draft/assembly/vetting; `gpt-4o-mini` failover; Groq `llama-3.3-70b-versatile` OSS last resort.
- **Timeouts**: 90s per AI stage; 10s n8n ack.
- **Queue**: pg-boss on `SUPABASE_DIRECT_URL:5432` with IPv4 DNS forced.
- **Columns**: `letters_allowed` / `letters_used` (NOT `remaining_letters`).
- **Pricing**: $299 / $299/mo / $2400/yr in `shared/pricing.ts`.
- **Transitions**: `ALLOWED_TRANSITIONS` in `shared/types/letter.ts`; never hardcode strings.
- **Audit**: `logReviewAction` on every transition.
