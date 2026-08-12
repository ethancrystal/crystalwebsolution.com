---
name: platform-e2e-verification
description: >-
  Verify the complete TTML letter lifecycle end-to-end: submission, AI pipeline, paywall, payment,
  attorney review, and claim. Use after pipeline, billing, review workflow, model, schema, or E2E
  environment changes.
---

# Skill: Platform E2E Pipeline Verification

## Purpose
Verify the complete letter lifecycle end-to-end: submission → AI pipeline → paywall → payment → attorney review → claim. This skill documents every step, known pitfalls, and exact commands so the full verification can be done quickly without rediscovery.

## When to Use
- After any pipeline, billing, or review workflow changes
- After model upgrades (Claude, GPT-4o, Perplexity)
- After schema migrations touching `letter_requests`, `letter_versions`, or status enums
- After changes to `server/rateLimiter.ts`, `server/pipeline/`, or `server/services/letters.ts`
- When onboarding a new environment and need to verify everything works

---

## Quick Start (Single Command)

Run the full lifecycle test that does everything in one shot:

```bash
DATABASE_URL="postgresql://..." \
PLAYWRIGHT_BASE_URL="http://localhost:3000" \
E2E_SUBSCRIBER_EMAIL="test.subscriber@e2e.ttml.test" \
E2E_SUBSCRIBER_PASSWORD="TestPassword123!" \
E2E_ATTORNEY_EMAIL="test.attorney@e2e.ttml.test" \
E2E_ATTORNEY_PASSWORD="TestPassword123!" \
npx playwright test e2e/platform/07-full-lifecycle.spec.ts --reporter=list
```

Or run all platform tests in sequence:
```bash
npx playwright test e2e/platform/ --reporter=list
```

---

## Prerequisites

### 1. Dev Server with Simple Pipeline
The standard 4-stage pipeline needs a separate pg-boss worker. For dev/testing, use `PIPELINE_MODE=simple` which runs Claude inline:

```bash
PORT=3000 PIPELINE_MODE=simple pnpm run dev
```

**Why**: `PIPELINE_MODE=simple` calls Claude directly in the request handler — no worker process, no pg-boss queue, no job stealing from production. The simple pipeline runs: `submitted → researching → drafting → generated_locked` in one Claude call.

### 2. Rate Limiting Bypass
Rate limiting uses Upstash Redis and blocks after 5 requests/hour. In development, the middleware is bypassed when `NODE_ENV=development`. If you hit 429s, check `server/rateLimiter.ts`:

```typescript
// In letterSubmitRateLimitMiddleware:
if (process.env.NODE_ENV === "development") { next(); return; }
// In checkTrpcRateLimit:
if (process.env.NODE_ENV === "development") return;
```

### 3. Test User Accounts
Two test accounts must exist in Supabase Auth AND the `users` table:

| Role | Email | How to Create |
|------|-------|---------------|
| Subscriber | `test.subscriber@e2e.ttml.test` | Sign up via UI or `/api/auth/signup` |
| Attorney | `test.attorney@e2e.ttml.test` | Sign up + confirm email via SQL + set role to `attorney` |

**Creating an attorney account** (attorneys are assigned, not self-signup):
```sql
-- After signing up via UI, confirm email and set role:
UPDATE auth.users SET email_confirmed_at = NOW()
WHERE email = 'test.attorney@e2e.ttml.test' AND email_confirmed_at IS NULL;

UPDATE users SET role = 'attorney'
WHERE email = 'test.attorney@e2e.ttml.test';
```

### 4. API Keys
- `ANTHROPIC_API_KEY` — Required for Claude (simple pipeline)
- `DATABASE_URL` — Direct Supabase PostgreSQL connection (for DB assertions)

### 5. Stop Production Worker
If there's a production pg-boss worker on Railway, it will steal jobs. Either stop it or use `PIPELINE_MODE=simple` (which skips the queue entirely).

---

## Step-by-Step Verification Process

### Step 1: Submit Letter (6-Step Intake Form)

**Route**: `/submit`

The form has 6 steps with specific selectors:

| Step | Field | Selector |
|------|-------|----------|
| 1. Letter Type | Demand Letter card | `getByTestId("button-letter-type-demand-letter")` |
| 1. Subject | Text input | `getByTestId("input-subject")` |
| 2. Jurisdiction | State dropdown (shadcn Radix combobox) | `getByRole("combobox").first()` → `getByRole("option", { name: /California/i })` |
| 3. Sender Name | Input | `page.locator("#senderName")` |
| 3. Sender Address | Input | `getByTestId("input-senderAddress")` |
| 3. Recipient Name | Input | `page.locator("#recipientName")` |
| 3. Recipient Address | Input | `getByTestId("input-recipientAddress")` |
| 4. Description | Textarea | `getByTestId("input-description")` |
| 5. Desired Outcome | Textarea | `page.locator("#desiredOutcome")` |
| 6. Exhibits | Skip — just submit | `getByRole("button", { name: /submit letter/i })` |

**Navigation**: Each step uses `getByRole("button", { name: /next/i }).click()`

**After submit**: App redirects to `/dashboard` or `/letters/{id}`

### Step 2: Verify AI Pipeline Generates Draft

**Poll the database** for status transitions:
```sql
SELECT id, status, subject, intake_json, current_ai_draft_version_id
FROM letter_requests
WHERE subject = 'E2E...'
ORDER BY created_at DESC LIMIT 1;
```

**Expected status flow**: `submitted` → `researching` → `drafting` → `generated_locked`

**Poll timing**: Check every 3 seconds, up to 60 seconds total. With `PIPELINE_MODE=simple`, it typically completes in 10-30 seconds.

### Step 3: Verify AI Content in Database

```sql
SELECT lv.id, lv.version_type, length(lv.content_html) AS html_length
FROM letter_versions lv
JOIN letter_requests lr ON lr.current_ai_draft_version_id = lv.id
WHERE lr.id = {LETTER_ID};
```

**Assertions**:
- `version_type` = `'ai_draft'`
- `content_html` length > 100 chars (real letters are 1000+)
- Content contains legal markers: "Dear", "Sincerely", "demand", "pursuant"

### Step 4: Verify Paywall (Subscriber View)

**Route**: `/letters/{id}` (NOT `/dashboard/letters/{id}`)

**Known gotcha**: An onboarding modal appears on first dashboard visit. Dismiss with:
```typescript
const skipButton = page.getByRole("button", { name: /skip/i });
if (await skipButton.isVisible({ timeout: 3000 }).catch(() => false)) {
  await skipButton.click();
}
```
The modal may reappear after navigation — dismiss it twice.

**Paywall UI elements** (from `LetterPaywall.tsx`):
- Draft preview (blurred): `getByTestId("text-draft-preview")`
- $50 one-time button: `getByTestId("button-pay-first-letter-review")`
- Subscription submit: `getByTestId("button-subscription-submit")`
- Text: "$50 for Attorney Review", "Subscribe & Get This Free"

**Screenshot**: Save to `test-results/paywall-view.png` for visual verification.

### Step 5: Simulate Payment

Stripe payments can't be tested without test mode. Simulate by SQL transition:

```sql
UPDATE letter_requests
SET status = 'pending_review',
    last_status_changed_at = NOW(),
    updated_at = NOW()
WHERE id = {LETTER_ID}
  AND status = 'generated_locked';
```

This mimics what the Stripe webhook handler does after successful payment.

### Step 6: Verify Notification (Paywall Email)

The notification is cron-based (`server/paywallEmailCron.ts`):
- Runs every 5 minutes
- Sends email 10-15 minutes after letter creation
- Only for `generated_locked` letters where `initial_paywall_email_sent_at IS NULL`
- This is by design — NOT immediate. Don't expect instant email.

### Step 7: Attorney Review Queue

**Route**: `/review/queue`

**Login**: Use the auth fixture `attorneyPage` or manually log in as attorney.

**UI structure**:
- Header: "Review Queue" with "{N} letters pending"
- Letter cards: `data-testid="card-letter-{id}"`
- Subject text: `data-testid="text-subject-{id}"`
- Status badge: `data-testid="status-badge-{id}"` showing "Awaiting Review" / "New"
- **Clicking a card opens a ReviewModal overlay** (does NOT navigate — URL stays `/review/queue`)

### Step 8: Attorney Claim

**Inside the ReviewModal**:
1. Click a letter card/row → modal opens with tabs (Intake, Research, History)
2. **Wait 5 seconds** for draft content to load (async fetch)
3. Find "Claim for Review" button:
   - Try `getByTestId("button-claim")` (EditorToolbar)
   - Fallback: `getByRole("button", { name: /claim for review/i })`
4. Click claim → button shows "Claiming..." spinner

**DB verification after claim**:
```sql
SELECT id, status, assigned_reviewer_id, last_status_changed_at
FROM letter_requests
WHERE id = {LETTER_ID};
```

**Expected**:
- `status` = `'under_review'`
- `assigned_reviewer_id` = attorney's user ID
- `last_status_changed_at` = recent timestamp

---

## Known Pitfalls & Solutions

| Problem | Cause | Fix |
|---------|-------|-----|
| 429 Too Many Requests | Rate limiter hit (5/hour) | Add `NODE_ENV=development` bypass in `server/rateLimiter.ts` |
| 404 on Claude model | Deprecated model string | Update model to `claude-sonnet-4-20250514` in `server/pipeline/simple.ts`, `assembly.ts`, `vetting.ts` |
| Worker not processing jobs | pg-boss worker not started in dev | Use `PIPELINE_MODE=simple` instead |
| Production worker steals jobs | Railway worker running | Stop Railway worker or use simple pipeline |
| Onboarding modal blocks clicks | First-visit popup | Dismiss with `getByRole("button", { name: /skip/i })` before interactions |
| Attorney login fails | No auth.users entry | Create via signup API, confirm email via SQL, set role to attorney |
| Wrong letter detail URL | `/dashboard/letters/:id` 404s | Use `/letters/:id` (subscriber) or `/admin/letters/:id` (admin) |
| Claim button not found | Looking for button instead of card | Letters are clickable rows; click text/card to open modal, THEN find claim button |
| Draft not loaded in modal | Screenshot taken too early | Wait 5 seconds after modal opens for async draft fetch |
| Duplicate test users | Multiple signup attempts | Check for existing user before creating; dedupe by email |

---

## File Reference

### Platform E2E Tests
- `e2e/platform/01-pipeline-submission.spec.ts` — 6-step form + pipeline poll
- `e2e/platform/02-ai-content-verification.spec.ts` — letter_versions DB check
- `e2e/platform/03-paywall-verification.spec.ts` — locked draft + payment options
- `e2e/platform/04-payment-simulation.spec.ts` — SQL transition to pending_review
- `e2e/platform/05-attorney-review-queue.spec.ts` — queue visibility
- `e2e/platform/06-attorney-claim.spec.ts` — modal + claim + DB verification
- `e2e/platform/07-full-lifecycle.spec.ts` — all-in-one (runs everything above)
- `e2e/platform/helpers/db.ts` — shared DB utilities

### Key Server Files
- `server/pipeline/simple.ts` — Simple Claude pipeline (PIPELINE_MODE=simple)
- `server/pipeline/orchestrator.ts` — Pipeline mode router
- `server/services/letters.ts` — Letter submission + pipeline dispatch
- `server/rateLimiter.ts` — Rate limiting middleware
- `server/paywallEmailCron.ts` — Paywall notification emails
- `server/routers/review/actions.ts` — review.claim tRPC endpoint

### Key Client Files
- `client/src/components/LetterPaywall.tsx` — Paywall UI with payment buttons
- `client/src/pages/attorney/ReviewQueue.tsx` — Review queue with clickable cards
- `client/src/components/shared/ReviewModal/index.tsx` — Review modal with claim button

### DB Tables
- `letter_requests` — Main letter table (status, assigned_reviewer_id, etc.)
- `letter_versions` — AI drafts + attorney edits (content_html, version_type)
- `users` — User accounts (role, email)

### Status Machine
```
submitted → researching → drafting → generated_locked → pending_review → under_review → approved
                                                                                      → rejected
                                                                                      → needs_changes
```
