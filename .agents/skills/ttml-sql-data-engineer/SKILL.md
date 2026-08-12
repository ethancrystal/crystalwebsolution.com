---
name: ttml-sql-data-engineer
description: Write Supabase/Postgres SQL for analytics and product needs. Include indexes and notes on RLS-safe views/materialized views.
license: MIT
metadata:
  version: "1.1.0"
---
# TTML SQL Data Engineer

## Deliverables
- **Queries** (well-commented)
- **Indices** (CREATE INDEX recommendations)
- **Views** (RLS-safe if needed — canonical schema uses flat `user_role` enum; super admin is enforced app-side via `server/supabaseAuth.ts` whitelist, not a column)
- **Validation** (what each column means)

## Canonical tables
Defined in `drizzle/schema.ts` (do not invent parallel tables):

- **`users`** — identity + `role` enum (`subscriber | employee | attorney | admin`), Supabase `open_id`, profile fields
- **`letter_requests`** — one row per letter lifecycle; `status` uses `letter_status` enum from `shared/types/letter.ts`; holds `intakeJson`, `pipelineLockedAt`, `qualityDegraded`, `researchUnverified`, `currentVersionId`
- **`letter_versions`** — versioned content (`versionTypeEnum`: `ai_draft` immutable, `attorney_edit`, `final_approved`)
- **`review_actions`** — attorney audit trail (status transitions, edits, approvals)
- **`workflow_jobs`** — pg-boss pipeline job records; columns include `jobType`, `provider`, `status`, token counts, `estimatedCostUsd`
- **`research_runs`** — Perplexity research artifacts + KV cache provenance
- **`subscriptions`** — Stripe subscription rows (monthly $299 for 4 letters, yearly $2,400 for 8 letters; columns `letters_allowed` / `letters_used` — never `remaining_letters`; per-letter flow at $299 one-time does not use this table). Canonical pricing in `shared/pricing.ts`.
- **`commission_ledger`** — employee 5% commission (500 bps, stored in cents)
- **`discount_codes`** — employee-owned promotional codes; `discountPercent` is arbitrary per code
- **`document_analyses`** — free GPT-4o analyzer output
- **`pipeline_lessons`** — vetting feedback loop input
- **`blog_posts`** — SEO content

## RLS cheatsheet
Policies live in Supabase migrations. Cross-user analytics must run under `service_role` (server-only), never under an authenticated user role — RLS will filter rows otherwise.

## Index opportunities (common)
- `letter_requests(user_id, created_at desc)` — user timelines
- `letter_requests(status)` partial index where `status in ('pending_review','under_review')` — attorney queue
- `workflow_jobs(letter_request_id, created_at desc)` — per-letter pipeline history
- `review_actions(letter_request_id, created_at desc)` — audit viewers
- `commission_ledger(employee_id, created_at desc)` — commission dashboards
