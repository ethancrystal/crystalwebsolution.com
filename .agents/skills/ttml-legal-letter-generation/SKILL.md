---
name: ttml-legal-letter-generation
description: |
  End-to-end workflow for generating professional legal letters with AI + attorney
  review on the Talk-to-My-Lawyer platform. Use when creating demand letters,
  cease-and-desist notices, contract breach letters, eviction notices, employment
  disputes, or any legal correspondence requiring professional review. Verified
  baseline: 2026-04-20.
---

# Legal Letter Generation Workflow

End-to-end walkthrough of how a letter travels from intake form to signed PDF
on Talk-to-My-Lawyer. This skill is the domain-level map; for the
implementation companion skills see `ttml-pipeline-orchestrator` (orchestrator
wiring), `ttml-langgraph-pipeline` (StateGraph), and
`ttml-payment-subscription-management` (Stripe + entitlement).

---

## Workflow Overview

1. **Phase 1: User Intake** — collect letter requirements, validate eligibility.
2. **Phase 2: Allowance Claim** — atomic entitlement check against `subscriptions`.
3. **Phase 3: AI Pipeline** — Perplexity research → Claude Sonnet 4 draft → Claude Sonnet 4 assembly → Claude Sonnet 4 vetting (see §3 for mode switches).
4. **Phase 4: Paywall / Unlock** — blur `ai_draft` at `generated_locked` until the user pays (per-letter flow) or a subscription submission is credited.
5. **Phase 5: Attorney Review Queue** — `pending_review → under_review → approved | rejected | needs_changes`.
6. **Phase 6: PDF Generation** — PDFKit inside the Node server, signed Supabase Storage URLs.
7. **Phase 7: Client Approval & Send** — `approved → client_approval_pending → client_approved → sent`.

**Pipeline primary path is the in-app 4-stage pipeline.** n8n is **webhook-only**
(the former MCP tier is gone) and runs first only when `N8N_PRIMARY=true`
with an HTTPS `N8N_WEBHOOK_URL`. `PIPELINE_MODE=langgraph` and
`PIPELINE_MODE=simple` are alternative entry points that bypass n8n entirely.

---

## Critical Rules (MUST Follow)

1. **[ENTITLEMENT REQUIRED]** Never allow letter generation without an entitlement. Either an active `subscriptions` row with `letters_used < letters_allowed` (or the subscription's `credits_remaining > 0` for per-letter purchases), or the per-letter Stripe checkout for this specific letter must have completed. Enforce in the tRPC `letters.submit` procedure. The columns are `letters_allowed` / `letters_used` — there is no `remaining_letters` column anywhere in the current schema.

2. **[ATOMIC CLAIM]** Deduct the allowance atomically — a Drizzle transaction with `FOR UPDATE` or a single-statement increment. Never check-then-deduct in two round-trips.

3. **[PIPELINE ROUTING]** Letter generation runs in-app under pg-boss via `server/pipeline/orchestrator.ts` by default. Set `PIPELINE_MODE=langgraph` or `PIPELINE_MODE=simple` to bypass the default path. Set `N8N_PRIMARY=true` to route through n8n webhook first (in-app pipeline still acts as graceful fallback).

4. **[STATUS TRANSITIONS]** Letter status follows the strict state machine in `shared/types/letter.ts` (`ALLOWED_TRANSITIONS`). Canonical path:

   ```
   submitted → researching → drafting → generated_locked
           → pending_review → under_review
           → approved → client_approval_pending → client_approved → sent
   ```

   Loopbacks: `needs_changes → submitted`, `pipeline_failed → submitted`, `rejected → submitted`. Every transition MUST be logged via `logReviewAction` into `review_actions`.

5. **[VERSION IMMUTABILITY]** The `ai_draft` version in `letter_versions` is immutable. Attorney edits create a new `attorney_edit` row; final sign-off creates a `final_approved` row.

6. **[TIMEOUT PROTECTION]** All AI-SDK stages run under `AbortSignal.timeout(90_000)`. Failed stages retry from the failed stage via `enqueueRetryFromStageJob` (pg-boss). Letters stuck mid-pipeline are recoverable via the admin `repairLetterState` procedure.

7. **[ATOMIC REFUNDS]** Terminal failure (`pipeline_failed`) or attorney rejection without retry MUST call `refundFreeTrialSlot` / `refundLetterAllowance` to restore the user's entitlement.

8. **[ATTORNEY NOTIFICATION]** On entry to `pending_review`, enqueue a Resend email to all users with `role = 'attorney'` via the pg-boss email queue. Never block the transition on email delivery.

9. **[SERVER-SIDE PDF]** Final PDF is rendered with PDFKit in the Node server, **not** with jsPDF in the browser. PDF generation is non-blocking on approval — approval succeeds even if PDF fails, and a worker retries.

10. **[INTAKE VALIDATION]** All intake is validated with Zod at the tRPC procedure boundary. Reject invalid data with detailed `BAD_REQUEST` errors.

11. **[RATE LIMITING]** `letters.submit` is rate-limited via Upstash Redis (`@upstash/ratelimit`). Typical budget: 10 submissions per 10 minutes per user.

---

## tRPC Procedure Structure

Source: `server/routers/letters/submit.ts` and `server/services/letters.ts`.

Pre-flight checks in order:

```ts
export const submit = subscriberProcedure
  .input(letterSubmitSchema)
  .mutation(async ({ ctx, input }) => {
    // 1. Rate limit
    const rl = await ctx.rateLimit.letterSubmit.limit(`letter-submit:${ctx.user.id}`);
    if (!rl.success) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Slow down…" });
    }

    // 2. Atomic entitlement claim (letters_used++ if letters_used < letters_allowed)
    const claim = await claimLetterEntitlement(ctx.db, ctx.user.id);
    if (!claim.success) {
      throw new TRPCError({ code: "FORBIDDEN", message: claim.error });
    }

    // 3. Create letter_request + enqueue pipeline job (or run inline for PIPELINE_MODE=simple)
    const letterId = await createLetterRequest(ctx.db, ctx.user.id, input);

    if (process.env.PIPELINE_MODE === "simple") {
      // server/services/letters.ts fires the simple pipeline inline
      void runSimplePipelineAsync(letterId, input.intakeData, ctx.user.id);
    } else {
      await ctx.pgBoss.send("pipeline.run", { letterRequestId: letterId, stage: "research" });
    }

    return { letterRequestId: letterId, status: "submitted" };
  });
```

Role gating lives in the tRPC middleware (`subscriberProcedure`,
`attorneyProcedure`, `adminProcedure`). Do NOT re-check roles inside the
procedure body.

---

## Letter Types & Required Fields

| Letter type         | Required intake fields                                                                                                       | Jurisdiction notes                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| demand-letter       | senderName, senderAddress, recipientName, recipientAddress, amountOwed, deadlineDate, incidentDescription                    | Payment deadline varies by state                |
| cease-and-desist    | senderName, senderAddress, recipientName, recipientAddress, violationDescription, demandedAction, deadlineDate               | IP laws vary by jurisdiction                   |
| contract-breach     | senderName, senderAddress, recipientName, recipientAddress, contractDate, breachDescription, remedySought                    | Statute of limitations varies                  |
| eviction-notice     | landlordName, landlordAddress, tenantName, tenantAddress, propertyAddress, reasonForEviction, noticePeriod                   | State-specific notice periods (3–90 days)      |
| employment-dispute  | employeeName, employeeAddress, employerName, employerAddress, disputeDescription, resolutionSought                           | At-will vs contract employment                 |
| consumer-complaint  | consumerName, consumerAddress, businessName, businessAddress, complaintDescription, resolutionSought                         | State consumer protection laws                 |

Zod schema example (`shared/types/letter.ts`):

```ts
export const letterSubmitSchema = z.object({
  letterType: z.enum([
    "demand-letter", "cease-and-desist", "contract-breach",
    "eviction-notice", "employment-dispute", "consumer-complaint",
  ]),
  intakeData: z.object({
    senderName: z.string().min(2).max(200),
    senderAddress: z.string().min(10).max(500),
    recipientName: z.string().min(2).max(200),
    recipientAddress: z.string().min(10).max(500),
    // Type-specific fields via a discriminated union
  }).passthrough(),
  jurisdiction: z.string().regex(/^[A-Z]{2}$/).optional(),
});
```

---

## Phase 3: The AI Pipeline

### 3a. Default Path (no `PIPELINE_MODE` set)

All stages orchestrated in `server/pipeline/orchestrator.ts` and logged to
`workflow_jobs`. Each stage can be retried independently via
`enqueueRetryFromStageJob`.

| Stage        | Model                            | Failover              | Output                                                  |
| ------------ | -------------------------------- | --------------------- | ------------------------------------------------------- |
| 1. Research  | Perplexity `sonar-pro`           | `gpt-4o-search-preview` → Claude Sonnet 4 (sets `researchUnverified=true`) → Groq llama | `research_runs` row + `ResearchPacket` |
| 2. Drafting  | Anthropic **Claude Sonnet 4**    | `gpt-4o-mini` → Groq llama | intermediate `DraftOutput`                             |
| 3. Assembly  | Anthropic **Claude Sonnet 4**    | `gpt-4o-mini` → Groq llama | `letter_versions` row (`version_type = 'ai_draft'`, v1) |
| 4. Vetting   | Anthropic **Claude Sonnet 4**    | `gpt-4o-mini` → Groq llama | vetting report + (potentially) redraft loop            |

Model pins live in `server/pipeline/providers.ts` as
`claude-sonnet-4-20250514`. Do not reference Claude Opus anywhere — it is
not used in any active stage as of 2026-04-20.

Pipeline invariants:

- **Research grounding.** Perplexity is the primary. If it fails the system
  falls back through `gpt-4o-search-preview` (web-grounded) → Claude Sonnet 4
  (non-grounded, `researchUnverified=true`) → Groq llama. The attorney review
  UI surfaces the `researchUnverified` flag and requires an explicit
  acknowledgment at approve time.
- **Intermediate content registry.** The pipeline keeps the best draft seen
  so far in an in-memory registry (`orchestrator.ts` `_intermediateContentRegistry`) so a later-stage failure can degrade to the previous stage's output.
- **Vetting loop.** Stage 4 can trigger re-assembly if it catches critical
  issues. After N retries the letter is flagged `qualityDegraded=true` and
  proceeds to `generated_locked` with warnings — attorney is expected to
  correct.
- **Workflow logging.** Every run writes `workflow_jobs` rows via
  `server/db/pipeline-records.ts` with token counts and `estimatedCostUsd`.
- **Queue.** pg-boss (Postgres-native, no Redis/BullMQ). Requires
  `SUPABASE_DIRECT_URL` on port 5432 (session pooler).
- **Timeouts.** All AI-SDK stages use `AbortSignal.timeout(90_000)`.

### 3b. n8n Webhook Path (`N8N_PRIMARY=true`)

When `N8N_PRIMARY=true` and `N8N_WEBHOOK_URL` starts with `https://`, the
orchestrator POSTs the intake to n8n and awaits a 10-second ack. On ack,
letter generation happens in n8n and the result arrives at
`POST /api/pipeline/n8n-callback`. On non-ack or error, the orchestrator
**gracefully falls through to the in-app 4-stage pipeline** (see
`ttml-n8n-workflow-integration` for the full contract).

There is **no MCP tier.** `server/n8nMcp.ts` is an empty deprecated stub.

### 3c. LangGraph Path (`PIPELINE_MODE=langgraph` or `LANGGRAPH_PIPELINE=true`)

Two env gates route through the LangGraph StateGraph:

- `PIPELINE_MODE=langgraph` — orchestrator-level bypass, fires before the
  n8n/in-app logic. No pg-boss worker involvement.
- `LANGGRAPH_PIPELINE=true` — worker-level route inside `server/worker.ts`.
  pg-boss still owns the job; LangGraph runs first, with graceful
  fall-through to the classic in-app pipeline on failure.

All four nodes (research/draft/assembly/vetting) resolve to Claude Sonnet 4.
See `ttml-langgraph-pipeline` for the full graph topology and state
contract.

### 3d. Simple Path (`PIPELINE_MODE=simple`)

Single-stage Claude-only pipeline. `intake → Claude Sonnet 4 → letter`.
No research, no vetting, no pg-boss warmup. Used for smoke tests and very
simple letter types. See `server/pipeline/simple.ts`.

---

## Phase 4: Paywall & Unlock

At the end of Stage 4 (or the last successful stage in a degraded run),
the letter transitions to `generated_locked`. Content is truncated
server-side in `server/routers/versions.ts` (~100 chars) while in
`generated_locked`; the frontend blurs the remainder via
`client/src/components/LetterPaywall.tsx`.

- **Subscription submission path:** an active subscription with remaining
  allowance auto-transitions `generated_locked → pending_review` immediately
  after the allowance is claimed — the paywall never shows.
- **Per-letter path:** Stripe checkout for a single letter ($299); on
  `checkout.session.completed` the `unlockLetterForReview` handler in
  `server/stripeWebhook/handlers/checkout.ts` transitions
  `generated_locked → pending_review`.
- **First-letter review fee:** a $50 one-time fee gates the first letter
  instead of being free (constant `FIRST_LETTER_REVIEW_PRICE_CENTS = 5000`
  in `shared/pricing.ts`).

Never rely on the client to advance past `generated_locked` — the
transition is server-side after a verified entitlement.

---

## Phase 5: Attorney Review Queue

The review router lives in `server/routers/review/`:

- `queue` — lists `pending_review` letters, FIFO
- `claim` — `pending_review → under_review`, stamps `assigned_attorney_id`
- `unclaim` — releases back to `pending_review`
- `saveEdit` — creates a new `attorney_edit` version (never overwrites)
- `approve` — creates `final_approved`, enqueues PDF generation, transitions
  to `approved`; requires explicit acknowledgment when `researchUnverified = true`
- `requestChanges` — `under_review → needs_changes`, prompts user for more info
- `reject` — `under_review → rejected`, records reason, triggers refund
- `requestClientApproval` — `approved → client_approval_pending`

Role gating: `attorneyProcedure` tRPC middleware checks `user_role = 'attorney'`.
The role enum is flat — `subscriber | employee | attorney | admin`. Super
admins have attorney capabilities by virtue of the hardcoded whitelist in
`server/supabaseAuth.ts` (`SUPER_ADMIN_EMAILS`).

### Auto-notification on `pending_review`

```ts
const attorneys = await ctx.db.query.users.findMany({
  where: eq(users.role, "attorney"),
  columns: { id: true, email: true, fullName: true },
});

await Promise.all(
  attorneys.map((attorney) =>
    ctx.emailQueue.enqueue("new-letter-for-review", attorney.email, {
      attorneyName: attorney.fullName ?? "Attorney",
      letterType: letterRequest.letterType,
      userName: user.fullName,
      userEmail: user.email,
      letterId: letterRequest.id,
      reviewUrl: `${APP_BASE_URL}/attorney/letters/${letterRequest.id}`,
      createdAt: new Date().toLocaleDateString(),
    }).catch((err) => ctx.logger.error({ err, attorneyId: attorney.id }, "notify failed"))
  )
);
```

Emails are sent via Resend, enqueued into pg-boss — never block the
transition on send confirmation.

### Approve (sketch)

```ts
export const approve = attorneyProcedure
  .input(z.object({ letterRequestId: z.string().uuid(), reviewNotes: z.string().max(5000).optional() }))
  .mutation(async ({ ctx, input }) => {
    const updated = await ctx.db.transaction(async (tx) => {
      const [version] = await tx.insert(letterVersions).values({
        letterRequestId: input.letterRequestId,
        versionType: "final_approved",
        contentMarkdown: ctx.pendingEdit?.markdown ?? currentAiDraftMarkdown,
        createdBy: ctx.user.id,
      }).returning();

      const [row] = await tx.update(letterRequests)
        .set({
          status: "approved",
          assignedAttorneyId: ctx.user.id,
          reviewedAt: new Date(),
          approvedAt: new Date(),
          reviewNotes: input.reviewNotes ?? null,
          currentVersionId: version.id,
        })
        .where(and(
          eq(letterRequests.id, input.letterRequestId),
          eq(letterRequests.status, "under_review"),
        ))
        .returning();

      if (!row) throw new TRPCError({ code: "CONFLICT", message: "Letter is not under review." });

      await tx.insert(reviewActions).values({
        letterRequestId: input.letterRequestId,
        actorId: ctx.user.id,
        actionType: "approve",
        fromStatus: "under_review",
        toStatus: "approved",
        visibility: "user_visible",
        notes: input.reviewNotes ?? null,
      });

      return row;
    });

    // Non-blocking side effects
    await ctx.pgBoss.send("letters.generatePdf", { letterRequestId: updated.id });
    await ctx.emailQueue.enqueue("letter-approved", user.email, { ... });

    return { success: true };
  });
```

### Reject (sketch)

```ts
export const reject = attorneyProcedure
  .input(z.object({
    letterRequestId: z.string().uuid(),
    rejectionReason: z.string().min(20).max(5000),
  }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.transaction(async (tx) => {
      const [row] = await tx.update(letterRequests)
        .set({ status: "rejected", reviewedAt: new Date(), rejectionReason: input.rejectionReason })
        .where(and(
          eq(letterRequests.id, input.letterRequestId),
          eq(letterRequests.status, "under_review"),
        ))
        .returning();

      if (!row) throw new TRPCError({ code: "CONFLICT", message: "Letter is not under review." });

      await tx.insert(reviewActions).values({
        letterRequestId: row.id,
        actorId: ctx.user.id,
        actionType: "reject",
        fromStatus: "under_review",
        toStatus: "rejected",
        visibility: "user_visible",
        notes: input.rejectionReason,
      });
    });

    // Refund + user email — non-blocking
    await refundLetterAllowance(ctx.db, ctx.user.id, input.letterRequestId);
    await ctx.emailQueue.enqueue("letter-rejected", user.email, { ... });

    return { success: true };
  });
```

---

## Phase 6: PDF Generation (PDFKit, server-side)

PDF generation runs in a dedicated pg-boss worker using PDFKit inside the
Node server. No browser-side jsPDF, no external PDF microservice.

```ts
import PDFDocument from "pdfkit";

export async function renderLetterPdf(opts: {
  markdown: string;
  letterType: string;
  userName: string;
  attorneyName?: string | null;
  reviewedAt?: Date | null;
  letterId: string;
}): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 72 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  doc.fontSize(10).text("Talk-to-My-Lawyer", { align: "left" });
  doc.text("Professional Legal Correspondence");
  doc.moveDown();

  doc.fontSize(12).text(opts.markdown, { lineGap: 6 });

  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).text(
      `Attorney Reviewed${opts.attorneyName ? `: ${opts.attorneyName}` : ""}` +
      `${opts.reviewedAt ? ` on ${opts.reviewedAt.toLocaleDateString()}` : ""}`,
      72, 720,
    );
  }

  doc.end();
  return Buffer.concat(await new Promise<Buffer[]>((resolve) => doc.on("end", () => resolve(chunks))));
}
```

Storage: upload the buffer to Supabase Storage under a user-scoped path,
then persist the path on the `letter_requests` row or a dedicated column on
the `final_approved` version. Downloads use signed URLs (1-hour expiry).
Never expose a raw public URL for letter PDFs — they contain PII and legal
claims.

---

## Phase 7: User Dashboard & Delivery

Route: `/dashboard/letters` (subscriber area). Attorneys use
`/attorney/letters`; admins use `/admin/letters`.

```ts
const letters = await ctx.db.query.letterRequests.findMany({
  where: eq(letterRequests.userId, ctx.user.id),
  orderBy: desc(letterRequests.createdAt),
  with: { currentVersion: { columns: { contentMarkdown: true, versionType: true } } },
});
```

Signed PDF download:

```ts
export const getDownloadUrl = subscriberProcedure
  .input(z.object({ letterRequestId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const row = await ctx.db.query.letterRequests.findFirst({
      where: and(
        eq(letterRequests.id, input.letterRequestId),
        eq(letterRequests.userId, ctx.user.id),
      ),
    });
    if (!row?.pdfStoragePath) {
      throw new TRPCError({ code: "NOT_FOUND", message: "PDF not yet available." });
    }
    const { data } = await ctx.supabase.storage
      .from("letters")
      .createSignedUrl(row.pdfStoragePath, 3600);
    return { url: data?.signedUrl };
  });
```

---

## Error Handling & Recovery

### Allowance refund on terminal failure

```ts
try {
  await runPipelineStage(...);
} catch (err) {
  await ctx.db.update(letterRequests)
    .set({ status: "pipeline_failed", errorMessage: String(err) })
    .where(eq(letterRequests.id, letterId));

  await ctx.db.insert(reviewActions).values({
    letterRequestId: letterId,
    actorId: null,
    actionType: "status_transition",
    fromStatus: prevStatus,
    toStatus: "pipeline_failed",
    visibility: "internal",
    metadata: { error: String(err) },
  });

  await refundLetterAllowance(ctx.db, userId, letterId);
  await ctx.emailQueue.enqueue("letter-generation-failed", userEmail, { ... });
  throw err;
}
```

### Recovery procedures

- Identify the failed stage in `workflow_jobs`.
- Resume with `enqueueRetryFromStageJob(letterId, failedStage)` via pg-boss.
- If the state machine is wedged, admins use `repairLetterState` or
  `forceStatusTransition` (both gated by `adminProcedure` + super-admin
  whitelist where required).
- Monitor the pipeline-worker logs in Railway.

---

## Monitoring & Alerts

Critical metrics:

- Generation success rate (target: >95%)
- Perplexity availability (target: >99%)
- Claude Sonnet 4 error rate (target: <2%)
- Average attorney review time (target: <24h)
- PDF generation success rate (target: >99%)
- pg-boss queue depth

Alert conditions:

- Generation failures >5% in 1 hour → page on-call
- Perplexity unavailable >5 minutes → alert DevOps; pipeline will degrade
  through `gpt-4o-search-preview` then Claude Sonnet 4 (non-grounded) and
  mark `researchUnverified`
- Anthropic rate-limits / 5xx spike → check API quota, consider temporary
  capacity bump
- No attorney reviews in 48 hours → alert legal team
- PDF worker backlog >50 jobs → check Supabase Storage quota

---

## Testing Checklist

Unit tests:

- Intake validation rejects invalid data formats
- Allowance check prevents generation with 0 letters remaining
- Rate limiting enforces the configured threshold
- Status transitions follow `ALLOWED_TRANSITIONS`
- PDFKit renderer produces valid output for all letter types
- Email queue retries on Resend transient failures

Integration tests (tRPC + pg-boss):

- End-to-end: submit → research → draft → assembly → vetting →
  generated_locked → [paywall/unlock] → pending_review → approve → PDF →
  download
- Perplexity failure degrades cleanly through `gpt-4o-search-preview` →
  Claude Sonnet 4 (`researchUnverified = true`) → Groq
- Vetting re-assembly loop triggers on simulated hallucinated citation
- Attorney approval creates an immutable `final_approved` version
- Attorney rejection refunds allowance (commission ledger unaffected)
- PDF storage returns a valid signed URL

Load tests:

- Concurrent submissions from N subscribers all claim entitlement correctly
  (no over-deduction)
- Rate limiting prevents resource exhaustion
- Supabase connection pool doesn't saturate
- Anthropic / Perplexity rate-limit handling
- Storage bandwidth for PDF downloads

---

## Security Considerations

Input sanitisation:

- Strip HTML from free-form text fields at the Zod layer
- Escape special characters before they reach any prompt
- Validate email format for sender/recipient
- Cap text-field lengths

Access control:

- RLS enforces `user_id` scope on `letter_requests`
- `attorneyProcedure` gates review endpoints; super-admin checks happen
  app-side via `SUPER_ADMIN_EMAILS` in `server/supabaseAuth.ts`
- PDF URLs are signed with short expiry (1 hour)
- Every download is logged for audit

Audit trail:

- Every status transition → `review_actions` row
- Every attorney edit → new `letter_versions` row, never an overwrite
- Every pipeline stage → `workflow_jobs` row with token counts + cost

Data protection:

- Intake JSON is encrypted at rest (Supabase)
- All HTTP is TLS
- PDFs contain PII — never log their contents
- Retention policy: rejected letters pruned after 90 days per policy

---

## Pricing Touch-Points

Pricing is the single source of truth in `shared/pricing.ts`. Never
hardcode these values.

- **Single letter:** $299 one-time (1 letter, `SINGLE_LETTER_PRICE_CENTS = 29900`)
- **Monthly:** $299/month (4 letters, `MONTHLY_PRICE_CENTS = 29900`)
- **Yearly:** $2,400/year (8 letters total, `YEARLY_PRICE_CENTS = 240000`)
- **First letter review fee:** $50 (`FIRST_LETTER_REVIEW_PRICE_CENTS = 5000`)
- **Affiliate discount:** 20% (`AFFILIATE_DISCOUNT_PERCENT = 20`)

See `ttml-payment-subscription-management` for the full Stripe and
commission-tracking contract.

---

## Verification Baseline (2026-04-20)

Verified against:

- `server/pipeline/orchestrator.ts`
- `server/pipeline/providers.ts`
- `server/pipeline/graph/` (LangGraph)
- `server/pipeline/simple.ts`
- `server/services/letters.ts`
- `server/routers/letters/`
- `server/routers/review/`
- `server/stripeWebhook/handlers/checkout.ts`
- `shared/pricing.ts`
- `shared/types/letter.ts` (`ALLOWED_TRANSITIONS`)
- `drizzle/schema/billing.ts` (`letters_allowed` / `letters_used`)

If these change materially, re-verify and update this skill in the same PR.
