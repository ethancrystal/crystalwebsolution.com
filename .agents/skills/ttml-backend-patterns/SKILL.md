---
name: ttml-backend-patterns
description: "Backend architecture patterns for the Talk-to-My-Lawyer (TTML) platform: tRPC routers, Drizzle ORM helpers, role-based guards, 4-stage AI pipeline (Perplexity + Claude Sonnet 4), Stripe webhooks, LangGraph StateGraph, email notifications, and audit logging. Use when designing tRPC procedures, Drizzle queries, role-based authorization, pipeline orchestration, or Stripe/affiliate flows."
---

# TTML Backend Patterns

Backend architecture patterns for Talk-to-My-Lawyer — a **Vite + Express + tRPC + Drizzle ORM + Supabase PostgreSQL** monorepo. No Next.js, no API routes — the frontend is a Vite SPA and the backend is an Express server exposing tRPC.

---

## Project Structure

```
talk-to-my-lawyer/
├── client/src/            # React 19 frontend (Vite 7)
│   ├── pages/
│   │   ├── dashboard/     # Subscriber dashboard, submit, letters, billing (/dashboard)
│   │   ├── employee/      # Discount codes, commissions, payouts (/employee)
│   │   ├── attorney/      # Review queue, review detail (/attorney)
│   │   └── admin/         # Users, all letters, jobs, affiliate oversight (/admin)
│   ├── hooks/             # useLetterStream, useAuth, etc.
│   └── lib/trpc.ts        # tRPC client config (wouter + TanStack Query)
├── server/
│   ├── _core/
│   │   ├── trpc.ts        # Base tRPC context, middleware, role guards
│   │   ├── context.ts     # TrpcContext type
│   │   └── env.ts         # ENV config
│   ├── routers/           # tRPC sub-routers (directory, NOT single file)
│   │   ├── index.ts       # appRouter composition
│   │   ├── auth/
│   │   ├── letters/
│   │   ├── review/
│   │   ├── admin/
│   │   ├── affiliate/
│   │   ├── billing/
│   │   └── blog/
│   ├── db/                # Drizzle query helpers (functional, no classes)
│   ├── pipeline/          # 4-stage AI pipeline orchestration
│   │   └── orchestrator.ts
│   ├── n8nMcp.ts          # Empty deprecated stub — MCP path removed 2026-04-16 (no dependency on @modelcontextprotocol/sdk)
│   ├── n8nCallback.ts     # n8n webhook callback handler (used only when N8N_PRIMARY=true)
│   ├── pipeline/graph/    # LangGraph StateGraph (alternative to orchestrator); 4 nodes + finalize
│   │   └── nodes/         # research.ts, draft.ts, assembly.ts, vetting.ts, finalize.ts
│   ├── stripeWebhook.ts   # Stripe event handler (raw Express route)
│   ├── stripe.ts          # Stripe session helpers
│   ├── email.ts           # Resend email notifications (17 templates)
│   ├── pdfGenerator.ts    # PDFKit server-side PDF generation + Supabase Storage upload
│   ├── queue.ts           # pg-boss queue
│   ├── worker.ts          # pg-boss worker
│   └── supabaseAuth.ts    # Super admin whitelist + auth helpers
├── drizzle/
│   ├── schema.ts          # All tables, enums, types
│   └── migrations/        # SQL migration files
└── shared/
    ├── types/
    │   ├── letter.ts      # ALLOWED_TRANSITIONS, STATUS_CONFIG, letter types
    │   └── pipeline.ts    # IntakeJson, ResearchPacket, DraftOutput, PipelineError
    ├── pricing.ts         # Canonical pricing ($299 single / $299 per month for 4 letters / $2,400 per year for 8 letters); FIRST_LETTER_REVIEW_PRICE = $50
    └── const.ts           # Shared constants
```

---

## Roles

Four roles exist in the `user_role` enum: `subscriber | employee | attorney | admin` (flat — **no** `admin_sub_role`).

- **subscriber** — Submits letters, pays to unlock, downloads approved PDFs
- **employee** — Manages discount codes, earns 5% commissions on referred sales, requests payouts (affiliate scope only — **does not** have attorney review access)
- **attorney** — Reviews, edits, approves/rejects letters
- **admin** — Full access to everything; super-admin subset is hard-coded in `server/supabaseAuth.ts`

**Procedure guards** (defined in tRPC middleware, typically under `server/routers/` or `server/_core/trpc.ts`): canonical guards are `subscriberProcedure`, `employeeProcedure`, `attorneyProcedure`, `adminProcedure`. Admin can additionally be permitted for most role procedures as an "or-admin" escape hatch, but **employee does not gain attorney review access** — that was a legacy conflation.

```typescript
const subscriberProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "subscriber" && ctx.user.role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

const employeeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "employee" && ctx.user.role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});

const attorneyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "attorney" && ctx.user.role !== "admin")
    throw new TRPCError({ code: "FORBIDDEN" });
  return next({ ctx });
});
```

**Super admin:** a subset of admins (hard-coded whitelist in `server/supabaseAuth.ts`). Super admins are the only role capable of promoting users to `attorney`. Active subscribers cannot be promoted.

---

## tRPC Router Domains (`server/routers/`)

Each domain is a sub-router; `appRouter` composes them:

| Domain | Procedure base | Key procedures |
|--------|---------------|----------------|
| `auth` | public | `me`, `logout` |
| `letters` | subscriberProcedure | `submit`, `myLetters`, `detail`, `updateForChanges`, `archive`, `uploadAttachment` |
| `review` | attorneyProcedure | `queue`, `letterDetail`, `claim`, `unclaim`, `saveEdit`, `approve`, `reject`, `requestChanges`, `requestClientApproval` |
| `admin` | adminProcedure | `stats`, `users`, `updateRole`, `allLetters`, `failedJobs`, `retryJob`, `letterJobs`, `forceStatusTransition`, `assignLetter`, `repairLetterState` |
| `notifications` | protectedProcedure | `list`, `markRead`, `markAllRead` |
| `versions` | protectedProcedure | `get` (role-aware: subscribers see only approved / locked-preview) |
| `billing` | protectedProcedure / subscriberProcedure | `getSubscription`, `checkCanSubmit`, `createCheckout`, `createBillingPortal`, `checkFirstLetterFree`, `freeUnlock`, `payToUnlock` |
| `affiliate` | employeeProcedure / adminProcedure / publicProcedure | `myCode`, `myEarnings`, `myCommissions`, `requestPayout`, `myPayouts`, `validateCode`, admin-side oversight procedures |
| `blog` | publicProcedure / adminProcedure | public blog read, admin CRUD |
| `documents` | subscriberProcedure | `analyze` (free GPT-4o doc analyzer) |

---

## Letter Status Machine

Source of truth: `shared/types/letter.ts` → `ALLOWED_TRANSITIONS`.

```
submitted         → researching | pipeline_failed
researching       → drafting | submitted | pipeline_failed
drafting          → generated_locked | submitted | pipeline_failed
generated_locked  → pending_review                     (after freeUnlock or payToUnlock $299 — or $50 first-letter-review fee)
generated_unlocked → pending_review                    (alternate unlock path; same downstream flow)
pending_review    → under_review
under_review      → approved | rejected | needs_changes | pending_review
needs_changes     → submitted | pending_review
approved          → sent | client_revision_requested | client_approval_pending
client_approval_pending → client_approved | client_revision_requested | client_declined
client_revision_requested → pending_review | under_review
client_approved   → sent
rejected          → submitted
pipeline_failed   → submitted
sent | client_declined → (terminal)
```

**Never write `UPDATE letter_requests SET status = ...` directly.** Always go through `updateLetterStatus()` which enforces `isValidTransition(from, to)`.

---

## Key Schema Tables (`drizzle/schema.ts`)

```typescript
// ─── Enums ───
letterStatusEnum: covers all the statuses in the machine above, plus pipeline_failed
letterTypeEnum:   "demand-letter" | "cease-and-desist" | "contract-breach" | "eviction-notice" | "employment-dispute" | "consumer-complaint" | "general-legal"
versionTypeEnum:  "ai_draft" | "attorney_edit" | "final_approved"
actorTypeEnum:    "system" | "subscriber" | "employee" | "attorney" | "admin"
jobTypeEnum:      "research" | "draft_generation" | "generation_pipeline" | "retry" | "vetting" | "assembly"
userRoleEnum:     "subscriber" | "employee" | "attorney" | "admin"

// ─── Canonical Tables ───
users             — id, openId, name, email, role, isActive, createdAt
letterRequests    — id, userId, letterType, subject, issueSummary, jurisdictionState, intakeJson, status, assignedReviewerId, currentAiDraftVersionId, currentFinalVersionId, pdfUrl, priority, archivedAt, pipelineLockedAt, researchUnverified, qualityDegraded, qualityWarnings
letterVersions    — id, letterRequestId, versionType, content, createdByType, createdByUserId, metadataJson (ai_draft IMMUTABLE)
reviewActions     — id, letterRequestId, reviewerId, actorType, action, noteText, noteVisibility, fromStatus, toStatus
workflowJobs      — id, letterRequestId, jobType, provider, status, attemptCount, errorMessage, requestPayloadJson, responsePayloadJson, promptTokens, completionTokens, estimatedCostUsd
researchRuns      — id, letterRequestId, workflowJobId, provider, status, cacheHit, cacheKey, queryPlanJson, resultJson
attachments       — id, letterRequestId, uploadedByUserId, storagePath, storageUrl, fileName, mimeType, sizeBytes
notifications     — id, userId, type, title, body, link, readAt
subscriptions     — id, userId, stripeCustomerId, stripeSubscriptionId, plan, status, lettersAllowed, lettersUsed
discountCodes     — id, employeeId, code, discountPercent, isActive, usageCount, maxUses, expiresAt
commissionLedger  — id, employeeId, letterRequestId, subscriberId, discountCodeId, saleAmount, commissionRate, commissionAmount, status
payoutRequests    — id, employeeId, amount, paymentMethod, paymentDetails, status, processedAt, rejectionReason
pipelineLessons   — id, category, lesson, createdAt
documentAnalyses  — id, userId, filename, analysisJson, createdAt
blogPosts         — id, slug, title, body, publishedAt
```

---

## Drizzle DB Helpers (`server/db/`)

All helpers are exported async functions — no classes, no repositories.

```typescript
// ─── DB Connection (singleton, lazy) ───
export async function getDb() {
  const dbUrl = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!_db && dbUrl) {
    const client = postgres(dbUrl, { ssl: 'require', max: 10, idle_timeout: 20 });
    _db = drizzle(client);
  }
  return _db;
}

// ─── Fetch single ───
export async function getLetterRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(letterRequests).where(eq(letterRequests.id, id)).limit(1);
  return result[0];
}

// ─── Fetch for subscriber (ownership check built in) ───
export async function getLetterRequestSafeForSubscriber(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(letterRequests)
    .where(and(eq(letterRequests.id, id), eq(letterRequests.userId, userId))).limit(1);
  return result[0];
}

// ─── Status transition (ENFORCES ALLOWED_TRANSITIONS) ───
export async function updateLetterStatus(id: number, status: LetterStatus, extra?: Partial<...>) {
  // validates isValidTransition(from, to) against shared/types/letter.ts
  // inserts a review_actions row
}

// ─── Audit log ───
export async function logReviewAction(data: {
  letterRequestId: number;
  reviewerId?: number;
  actorType: ActorType;
  action: string;
  noteText?: string;
  noteVisibility?: "internal" | "user_visible";
  fromStatus?: string;
  toStatus?: string;
}) { ... }
```

---

## tRPC Router Patterns

```typescript
// ─── Mutation with ownership check + audit log + non-blocking side effects ───
// File: server/routers/letters/submit.ts
export const submit = subscriberProcedure
  .input(z.object({ ... }))
  .mutation(async ({ ctx, input }) => {
    const result = await createLetterRequest({ userId: ctx.user.id, ...input });
    const letterId = (result as any)?.insertId;

    await logReviewAction({
      letterRequestId: letterId,
      reviewerId: ctx.user.id,
      actorType: "subscriber",
      action: "letter_submitted",
      toStatus: "submitted",
    });

    // Non-blocking: email via Resend
    if (ctx.user.email) sendLetterSubmissionEmail({ ... })
      .catch(err => console.error("[Email] Submission failed:", err));

    // Non-blocking: enqueue pg-boss pipeline job
    await enqueuePipelineJob({ type: "runPipeline", letterId, intake: input.intakeJson, userId: ctx.user.id, appUrl, label: "submit" });

    return { letterId, status: "submitted" };
  });

// ─── Query with NOT_FOUND guard ───
export const letterDetail = attorneyProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    const letter = await getLetterRequestById(input.id);
    if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
    const [versions, actions, jobs, research] = await Promise.all([
      getLetterVersionsByRequestId(input.id, true),
      getReviewActions(input.id, true),
      getWorkflowJobsByLetterId(input.id),
      getResearchRunsByLetterId(input.id),
    ]);
    return { letter, versions, actions, jobs, research };
  });

// ─── Admin force status with audit ───
export const forceStatusTransition = adminProcedure
  .input(z.object({
    letterId: z.number(),
    newStatus: z.enum([...LETTER_STATUSES]),
    reason: z.string().min(5),
  }))
  .mutation(async ({ ctx, input }) => {
    const letter = await getLetterRequestById(input.letterId);
    if (!letter) throw new TRPCError({ code: "NOT_FOUND" });
    await updateLetterStatus(input.letterId, input.newStatus);
    await logReviewAction({
      letterRequestId: input.letterId,
      reviewerId: ctx.user.id,
      actorType: "admin",
      action: "admin_force_status_transition",
      noteText: `Forced from ${letter.status} to ${input.newStatus}. Reason: ${input.reason}`,
      noteVisibility: "internal",
      fromStatus: letter.status,
      toStatus: input.newStatus,
    });
    return { success: true };
  });
```

---

## Error Handling in tRPC

Always use `TRPCError`, never raw `Error`:

```typescript
if (!letter) throw new TRPCError({ code: "NOT_FOUND", message: "Letter not found" });
if (letter.userId !== ctx.user.id && ctx.user.role !== "admin")
  throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this letter" });
if (letter.status !== "generated_locked")
  throw new TRPCError({ code: "BAD_REQUEST", message: "Letter is not ready for unlock" });
```

---

## AI Pipeline (`server/pipeline/orchestrator.ts`)

**Four** stages run sequentially with AbortSignal timeouts. Exact model pins live in `server/pipeline/providers.ts`; refer to brands here.

```
Stage 1: Perplexity sonar-pro (RESEARCH_TIMEOUT_MS = 90s)
         ↓ ResearchPacket (validated)
Stage 2: Claude Sonnet 4 — claude-sonnet-4-20250514 (DRAFT_TIMEOUT_MS = 90s)  — drafting
         ↓ DraftOutput
Stage 3: Claude Sonnet 4 — claude-sonnet-4-20250514 (ASSEMBLY_TIMEOUT_MS = 90s) — assembly / formatting
         ↓ assembled letter
Stage 4: Claude Sonnet 4 (VETTING) — vetting / anti-hallucination
         ↓ final letter string → letter_versions (ai_draft) → status: generated_locked
```

**Model fallback chain (`server/pipeline/providers.ts`):**
- Stage 1 primary: Perplexity `sonar-pro`. Failover 1: OpenAI `gpt-4o-search-preview` via Responses API + `webSearchPreview` tool. Failover 2 (if no Perplexity key): Claude Sonnet 4 (non-web-grounded — sets `researchUnverified=true`).
- Stages 2/3/4 primary: Claude Sonnet 4 (`claude-sonnet-4-20250514`). Failover: OpenAI `gpt-4o-mini`. Last resort OSS: Groq `llama-3.3-70b-versatile` (requires `GROQ_API_KEY`).
- OpenAI GPT-4o is **also** used outside the pipeline for the free `documents.analyze` analyzer.

**Key exports:**
- `runFullPipeline(letterId, intakeJson)` — runs all 4 stages (with optional n8n fallback chain when `N8N_PRIMARY=true`)
- `retryPipelineFromStage(letterId, intakeJson, stage: "research" | "drafting")` — resumes from a specific stage

**On completion:** Sets status to `generated_locked`, sends `sendLetterReadyEmail` to subscriber.

**On failure:** Transitions to `pipeline_failed`; user can retry which transitions back to `submitted`.

Every stage logs a `workflow_jobs` row (with `requestPayloadJson`, `responsePayloadJson`, token counts, cost) and every status change gets a `logReviewAction` call.

**Orchestration:** Enqueued via pg-boss from the `letters.submit` mutation; processed by `server/worker.ts`.

---

## n8n Callback (`server/n8nCallback.ts`) — dormant path

Active only when `N8N_PRIMARY=true`. Registered as raw Express route:

```typescript
// POST /api/pipeline/n8n-callback
// Headers: x-ttml-callback-secret  (validated against N8N_CALLBACK_SECRET)
// Body: { letterId, success, researchPacket?, draftOutput?, assembledLetter?, vettedLetter?, vettingReport?, error? }

// On success: persists version, transitions through researching → drafting → generated_locked
// On failure: marks pipeline_failed
```

Acknowledge immediately with `res.json({ received: true })`, then process async.

---

## Stripe Webhook (`server/stripeWebhook.ts`)

Raw Express route at `POST /api/stripe/webhook`. Validates Stripe signature via `STRIPE_WEBHOOK_SECRET` before processing. Idempotency via Stripe event `id`.

Key events handled:
- `checkout.session.completed` (mode: `payment`) → per-letter unlock ($299 single-letter or $50 first-letter-review) → `updateLetterStatus(letterId, "pending_review")` + commission tracking
- `checkout.session.completed` (mode: `subscription`) → activate subscription plan ($299/mo for 4 letters or $2,400/yr for 8 letters)
- `customer.subscription.updated/deleted` → update subscription record
- `invoice.paid` → refresh subscription status

**Discount code flow on payment:**
1. Read `metadata.discount_code` from session
2. `getDiscountCodeByCode(code)` → get `employeeId`
3. `createCommission({ employeeId, letterRequestId, saleAmount, commissionRate: 500, ... })` — 5%, stored in cents
4. `incrementDiscountCodeUsage(discountCodeId)`

All writes inside the webhook handler run in a single Drizzle transaction for atomicity.

---

## Email Notifications (`server/email.ts`)

Uses Resend SDK (17 templates). All emails are fire-and-forget wrapped in `.catch()`. Never block API responses for email.

```typescript
sendLetterSubmissionEmail({ to, name, subject, letterId, letterType, jurisdictionState, appUrl })
sendLetterReadyEmail({ to, name, subject, letterId, appUrl })
sendLetterUnlockedEmail({ to, name, subject, letterId, appUrl })
sendLetterApprovedEmail({ to, name, subject, letterId, appUrl, pdfUrl? })
sendLetterRejectedEmail({ to, name, subject, letterId, reason, appUrl })
sendNeedsChangesEmail({ to, name, subject, letterId, attorneyNote, appUrl })
sendNewReviewNeededEmail({ to, name, letterSubject, letterId, letterType, jurisdiction, appUrl })
sendStatusUpdateEmail({ to, name, subject, letterId, newStatus, appUrl })
sendJobFailedAlertEmail({ to, name, letterId, jobType, errorMessage, appUrl })
// ... plus client-approval, payout, affiliate, welcome, password-reset, etc.

// Pattern for non-blocking:
sendLetterReadyEmail({ ... })
  .catch(e => console.error("[Email] Ready notification failed:", e));
```

---

## IntakeJson Schema

The full intake shape required by `letters.submit` and the pipeline (`shared/types/pipeline.ts`):

```typescript
interface IntakeJson {
  schemaVersion: string;          // "1.0"
  letterType: string;             // matches LETTER_TYPES enum
  sender: { name: string; address: string; email?: string; phone?: string };
  recipient: { name: string; address: string; email?: string; phone?: string };
  jurisdiction: { country: string; state: string; city?: string };
  matter: { category: string; subject: string; description: string; incidentDate?: string };
  financials?: { amountOwed?: number; currency?: string };
  desiredOutcome: string;
  deadlineDate?: string;
  additionalContext?: string;
  tonePreference?: "firm" | "moderate" | "aggressive";
}
```

---

## Affiliate / Commission System

```
Employee creates discount code (auto-generated on first myCode query)
  → Subscriber uses code at checkout
  → Stripe webhook fires → createCommission() logged to commission_ledger
  → Employee views myEarnings (pending/paid totals)
  → Employee requests payout (minimum $10.00 / 1000 cents)
  → Admin reviews and processes (completed → marks commissions paid | rejected → rejectionReason)
```

Commission rate: 500 basis points = 5% of sale amount. Stored in cents via `commission_ledger.commission_amount`. Base single-letter price is `$299` per `shared/pricing.ts` — so per-letter commission is $14.95 (1495 cents). Idempotency on `stripe_payment_intent_id` (unique index).

---

## Express Routes (Non-tRPC)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/stripe/webhook` | POST | Stripe signature | Payment events |
| `/api/pipeline/n8n-callback` | POST | `x-ttml-callback-secret` | n8n pipeline results (dormant path) |
| `/api/health` | GET | none | Railway healthcheck |

---

## Audit Trail Rules

**Every status change must have a `logReviewAction` call.** Required fields:
- `letterRequestId`
- `actorType` (from `ctx.user.role` or `"system"` for pipeline)
- `action` (descriptive string)
- `fromStatus` + `toStatus` (when transitioning)

Internal notes use `noteVisibility: "internal"`. User-visible notes use `noteVisibility: "user_visible"` and appear in the subscriber's letter timeline.

---

## Non-Blocking Side Effects Pattern

```typescript
// ✅ Correct — never await emails, PDFs, or pipeline triggers in mutation response
await updateLetterStatus(letterId, "pending_review");

sendLetterUnlockedEmail({ ... })
  .catch(e => console.error("[freeUnlock] Email error:", e));

return { success: true };
```

PDF generation (PDFKit, server-side) is the exception — it runs as part of the `review.approve` mutation but any failure is caught and logged without blocking the approval response.

---

## Payment Gate

Per CLAUDE.md invariant #7: full letter content is locked at `generated_locked`. Enforcement:
- **Server side**: `versions.get` truncates content for subscribers when status is `generated_locked` and they haven't unlocked
- **Client side**: frontend blurs the truncated preview — defense in depth, not the primary gate
- **Unlock paths**: `freeUnlock` (active subscription with `letters_used < letters_allowed`) or `payToUnlock` ($299 single-letter Stripe Checkout → webhook), or the `$50` first-letter attorney-review fee when applicable

---

## Helper: `getAppUrl`

Used throughout routers for building email CTA URLs:

```typescript
function getAppUrl(req: { protocol: string; headers: Record<string, string | string[] | undefined> }): string {
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:3000";
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
  return `${proto}://${host}`;
}
```

Pass `ctx.req` from the tRPC context wherever `appUrl` is needed. Railway provides `x-forwarded-host` and `x-forwarded-proto` automatically.
