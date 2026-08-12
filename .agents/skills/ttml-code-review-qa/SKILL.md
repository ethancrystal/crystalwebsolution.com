---
name: ttml-code-review-qa
description: Comprehensive code review checklist, testing strategies, and quality assurance standards. Use when reviewing pull requests, implementing new features, debugging issues, or ensuring production-ready code quality.
---

# Code Review & Quality Assurance

## Review Philosophy

**Target Quality Score:** 8.2-8.5/10
**Zero TypeScript Errors:** 0 errors across the monorepo
**Security-First:** All vulnerabilities fixed before production

> **Canonical stack (2026-04-20):** React 19 + Vite 7 + wouter + TanStack Query v5 + Tailwind v4 (client); Express 4.21 + tRPC 11 + Drizzle ORM 0.44/0.45 (server); Supabase Postgres + Supabase Auth (JWT → local `users` table with 30s cache); Stripe Checkout + raw-body webhook; Resend for email; **pg-boss** queue on `SUPABASE_DIRECT_URL` (IPv4); Upstash Redis `@upstash/ratelimit` for rate limits; LangGraph StateGraph (`server/pipeline/graph/`) behind `PIPELINE_MODE=langgraph` / `LANGGRAPH_PIPELINE=true`; Railway multi-service deploy (app / worker / migrate) from a single Dockerfile. **NOT** Next.js, **NOT** Vercel, **NOT** BullMQ, **NOT** Redis-for-queue.

---

## Critical Rules (MUST Follow)

1. **[SECURITY FIRST]** NEVER merge code with security vulnerabilities. Check: SQL injection, XSS, CSRF, RLS bypass, credential exposure.

2. **[TYPESCRIPT STRICT]** Zero TypeScript errors required. The gate is `pnpm check` (`tsc --noEmit`) — there is **no** `pnpm type-check` script. Fix all `any` types, missing properties, type mismatches before commit.

3. **[RLS VERIFICATION]** ALL database queries must respect Row Level Security. Test with different user roles from the flat `user_role` enum: `subscriber`, `employee`, `attorney`, `admin`. Super admin status is enforced app-side via the hardcoded whitelist `SUPER_ADMIN_EMAILS` in `server/supabaseAuth/client.ts:12` (`ravivo@homes.land`, `moizj00@gmail.com`) — it is **NOT** a separate role column and cannot be granted via UI/API. Admin procedures additionally require the `admin_2fa` cookie via `server/_core/admin2fa.ts`.

4. **[ATOMIC OPERATIONS]** Payment/subscription/entitlement operations MUST use Supabase RPC functions or Drizzle transactions. Never separate INSERT/UPDATE for related data (subscription + commission + discount code).

5. **[ERROR HANDLING]** ALL tRPC procedures must use `TRPCError` with appropriate codes (`UNAUTHORIZED`, `FORBIDDEN`, `BAD_REQUEST`, `INTERNAL_SERVER_ERROR`). Never return raw error shapes.

6. **[RATE LIMITING]** All user-facing tRPC procedures must apply rate limiting via the Upstash Redis `@upstash/ratelimit` helper before the business logic runs.

7. **[EMAIL QUEUEING]** ALL transactional emails must use the Resend + pg-boss queue helper. Never block a tRPC response on email delivery.

8. **[TEST COVERAGE]** Critical paths require tests: payment flow, letter generation pipeline, attorney review, entitlement claim.

9. **[DOCUMENTATION]** Complex logic requires inline comments. tRPC procedures need JSDoc with input schema, output shape, and error codes.

10. **[ROLLBACK PLAN]** Breaking changes require documented rollback procedure. Drizzle migrations must be reversible.

---

## Pre-Commit Checklist

### Code Quality

- [ ] Run `pnpm check` → 0 errors (`tsc --noEmit`)
- [ ] Run `pnpm test` → vitest suite green (~1300 tests)
- [ ] Run `pnpm build` → vite + 4 esbuild bundles emit cleanly (`index.js`, `worker.js`, `migrate.js`, `instrument.js`)
- [ ] Run `pnpm format` → Code formatted
- [ ] Remove `console.log` (except intentional server logging)
- [ ] Remove commented-out code
- [ ] Update imports (no unused imports)
- [ ] Fix all `// @ts-ignore` comments

### Security

- [ ] No hardcoded credentials (API keys, passwords)
- [ ] No sensitive data in logs
- [ ] SQL queries use parameterized Drizzle helpers
- [ ] User input validated with Zod schemas on tRPC `input()`
- [ ] Role gating via tRPC middleware (`subscriberProcedure`, `employeeProcedure`, `attorneyProcedure`, `adminProcedure`)
- [ ] RLS policies tested with different roles
- [ ] CORS configured correctly (Express middleware)
- [ ] Stripe webhook signatures verified

### Performance

- [ ] Database queries use indexes
- [ ] No N+1 query problems — use Drizzle `with` / joins instead of per-row lookups
- [ ] Large data sets paginated
- [ ] Expensive reads cached where appropriate (Upstash Redis)
- [ ] Long pipeline work dispatched to pg-boss workers, never run inline in a tRPC procedure
- [ ] Frontend images served via standard `<img>` / lazy loading (Vite + React; no Next.js Image)

### Testing

- [ ] Unit tests for new functions
- [ ] Integration tests for tRPC procedures via `createCaller`
- [ ] Edge cases covered (empty data, null values)
- [ ] Error scenarios tested
- [ ] Rollback procedures verified

---

## Code Review Priority Levels

### P0 - Critical (Block Merge)

**Examples:**
- Security vulnerabilities (SQL injection, XSS, credential exposure)
- Race conditions in payment processing
- Data loss scenarios
- RLS bypass vulnerabilities
- Production deploy using test-mode Stripe keys

**Action:** MUST fix before merge. No exceptions.

### P1 - High (Fix Before Release)

**Examples:**
- Missing error handling in tRPC procedures
- Unhandled edge cases in critical flows
- Performance issues (slow queries, missing indexes)
- Missing rate limiting on user procedures
- Email delivery failures not handled (unawaited queue writes)

**Action:** Fix in same PR or immediate follow-up PR.

### P2 - Medium (Technical Debt)

**Examples:**
- Code duplication
- Missing TypeScript types (`any` usage)
- Inconsistent naming conventions
- Suboptimal database queries
- Missing inline documentation

**Action:** Create issue, fix in future PR.

### P3 - Low (Nice to Have)

**Examples:**
- Code style inconsistencies
- Minor optimizations
- Better variable names
- Additional helper functions

**Action:** Optional, address if time permits.

---

## Security Review Checklist

### Authentication & Authorization

All protected server logic lives in tRPC procedures gated by middleware. Never reimplement auth checks by hand.

```typescript
// ✅ CORRECT: Use the pre-built procedure middleware
// server/routers/letters/submit.ts
import { subscriberProcedure } from '@/server/trpc'

export const submitLetter = subscriberProcedure
  .input(submitLetterSchema)
  .mutation(async ({ ctx, input }) => {
    // ctx.user is guaranteed to be an authenticated subscriber
    // ...
  })

// ❌ WRONG: Accepting userId from the client
export const submitLetter = publicProcedure
  .input(z.object({ userId: z.string(), ... }))
  .mutation(async ({ input }) => {
    // INSECURE: user controls userId
  })
```

### Row Level Security

```typescript
// ✅ CORRECT: Per-user scope + RLS-backed Supabase client
const letters = await ctx.db.query.letterRequests.findMany({
  where: eq(letterRequests.userId, ctx.user.id),
})

// ❌ WRONG: Using the service-role client for end-user queries
const letters = await supabaseAdmin
  .from('letter_requests')
  .select('*')
  .eq('user_id', userId)  // service role bypasses RLS
```

The service-role client is reserved for pipeline workers, webhooks, and admin procedures — never proxy it from a user-scoped endpoint.

### Input Validation

```typescript
// ✅ CORRECT: Validate with Zod on the tRPC input
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  letterType: z.enum(['demand-letter', 'cease-and-desist']),
})

export const createThing = subscriberProcedure
  .input(schema)
  .mutation(async ({ input }) => {
    // input is fully typed and validated
  })

// ❌ WRONG: Accepting `z.any()` or parsing raw JSON
```

### SQL Injection Prevention

```typescript
// ✅ CORRECT: Parameterized Drizzle query
const rows = await ctx.db.query.letterRequests.findMany({
  where: eq(letterRequests.letterType, letterType),
})

// ❌ WRONG: String interpolation into raw SQL
await ctx.db.execute(
  sql.raw(`SELECT * FROM letter_requests WHERE letter_type = '${letterType}'`)
) // SQL injection
```

Use `sql` template literals with interpolation placeholders, never `sql.raw` with user input.

### Credential Management

```typescript
// ✅ CORRECT: Environment variables loaded once at startup
const stripeKey = process.env.STRIPE_SECRET_KEY!

// Production guard
if (process.env.NODE_ENV === 'production' && stripeKey.startsWith('sk_test_')) {
  throw new Error('Test-mode Stripe key in production!')
}

// ❌ WRONG: Hardcoded credentials
const stripeKey = 'sk_test_abc123'
```

Railway injects environment variables at container start — confirm required keys are set on the service before deploy.

---

## Common Code Smells

### 1. Race Conditions

**Smell:**
```typescript
// Check allowance, then deduct — two round-trips, not atomic.
// Also uses a column that does NOT exist: there is no `remainingLetters`.
const sub = await ctx.db.query.subscriptions.findFirst({
  where: eq(subscriptions.userId, userId),
})

if (sub && sub.lettersUsed < sub.lettersAllowed) {
  await ctx.db.update(subscriptions)
    .set({ lettersUsed: sub.lettersUsed + 1 })
    .where(eq(subscriptions.userId, userId))
}
```

**Fix:**
```typescript
// Atomic helper — UPDATE ... WHERE letters_used < letters_allowed RETURNING id.
// Returns false if the row did not update (out of allowance or lost race).
import { incrementLettersUsed } from "@/server/stripe/subscriptions";

const claimed = await incrementLettersUsed(ctx.user.id);
if (!claimed) {
  throw new TRPCError({ code: "FORBIDDEN", message: "No allowance remaining" });
}
// Free-first-letter path uses claimFreeTrialSlot(userId) from server/db/users.ts
// (atomic UPDATE ... WHERE free_review_used_at IS NULL).
```

### 2. N+1 Queries

**Smell:**
```typescript
const letters = await ctx.db.query.letterRequests.findMany({ columns: { id: true, userId: true } })

for (const letter of letters) {
  const user = await ctx.db.query.users.findFirst({
    where: eq(users.id, letter.userId),
  })
  ;(letter as any).userName = user?.fullName
}
```

**Fix:**
```typescript
// Use Drizzle relational query with `with`
const letters = await ctx.db.query.letterRequests.findMany({
  with: { user: { columns: { fullName: true } } },
})
```

### 3. Missing Error Handling

**Smell:**
```typescript
export const createLetter = subscriberProcedure
  .input(schema)
  .mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(letterRequests).values({ ... }).returning()
    return { success: true, id: row.id }
  })
```

**Fix:**
```typescript
import { TRPCError } from '@trpc/server'

export const createLetter = subscriberProcedure
  .input(schema)
  .mutation(async ({ ctx, input }) => {
    try {
      const [row] = await ctx.db.insert(letterRequests).values({ ... }).returning()
      if (!row) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create letter' })
      }
      return { success: true, id: row.id }
    } catch (err) {
      ctx.logger.error({ err }, 'letters.create failed')
      if (err instanceof TRPCError) throw err
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create letter' })
    }
  })
```

### 4. Blocking on Email Delivery

**Smell:**
```typescript
// Synchronous send — blocks the procedure response
await sendEmail('user@example.com', 'Welcome', { ... })
return { success: true }
```

**Fix:**
```typescript
// Enqueue into pg-boss — worker dispatches via Resend
await queueTemplateEmail('welcome', 'user@example.com', { ... })
return { success: true }
```

### 5. Unhandled Promise Rejections

**Smell:**
```typescript
notifyAdmins(letterId) // fire-and-forget, no catch
return { success: true }
```

**Fix:**
```typescript
notifyAdmins(letterId).catch((err) =>
  ctx.logger.error({ err, letterId }, '[notifyAdmins] failed')
)
// OR enqueue via pg-boss if the work is critical
```

---

## Testing Strategies

### Unit Tests

**Test Pure Functions:**
```typescript
import { calculateCommission, formatCurrency } from '@/lib/utils'

describe('Commission Calculation', () => {
  it('calculates 5% commission correctly', () => {
    expect(calculateCommission(100)).toBe(5)
    expect(calculateCommission(239.20)).toBeCloseTo(11.96)
  })

  it('returns 0 for zero amount', () => {
    expect(calculateCommission(0)).toBe(0)
  })

  it('handles negative amounts', () => {
    expect(() => calculateCommission(-100)).toThrow()
  })
})
```

### Integration Tests (tRPC)

**Test Procedures via `createCaller`:**
```typescript
import { appRouter } from '@/server/routers'
import { createTestContext } from '@/server/test-utils'

describe('letters.submit', () => {
  it('requires authentication', async () => {
    const caller = appRouter.createCaller(createTestContext({ authenticated: false }))
    await expect(caller.letters.submit({ letterType: 'demand-letter', intakeData: {} as any }))
      .rejects.toMatchObject({ code: 'UNAUTHORIZED' })
  })

  it('enforces rate limiting', async () => {
    const caller = appRouter.createCaller(createTestContext({ userId: 'u_1' }))

    // 11 requests — limit is 10
    for (let i = 0; i < 10; i++) {
      await caller.letters.submit({ letterType: 'demand-letter', intakeData: validIntake })
    }
    await expect(
      caller.letters.submit({ letterType: 'demand-letter', intakeData: validIntake })
    ).rejects.toMatchObject({ code: 'TOO_MANY_REQUESTS' })
  })

  it('validates intake data', async () => {
    const caller = appRouter.createCaller(createTestContext({ userId: 'u_1' }))
    await expect(
      caller.letters.submit({ letterType: 'invalid-type' as any, intakeData: {} })
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })
})
```

### E2E Tests (Critical Paths)

**Payment Flow:**
```typescript
describe('Payment Flow E2E', () => {
  it('completes full checkout to subscription activation', async () => {
    const caller = appRouter.createCaller(createTestContext({ userId: 'u_1' }))

    // 1. Create checkout session
    const { url } = await caller.billing.createCheckout({
      planType: 'per-letter',
      discountCode: 'EMP-TEST123',
    })
    expect(url).toMatch(/checkout\.stripe\.com/)

    // 2. Simulate Stripe payment (test mode)
    const sessionId = extractSessionId(url)
    await completeStripePayment(sessionId)

    // 3. Webhook activates subscription
    await waitForWebhook(sessionId)

    // 4. Verify subscription active
    const sub = await getSubscription('u_1')
    expect(sub.status).toBe('active')
    expect(sub.lettersAllowed).toBe(4)   // monthly $299 plan: 4 letters
    expect(sub.lettersUsed).toBe(0)

    // 5. Verify commission ledger entry (5% of $299 = $14.95 in cents)
    const commission = await getCommission(employeeId)
    expect(commission.subscriptionId).toBe(sub.id)
    expect(commission.commissionAmount).toBe(1495)
    expect(commission.commissionRate).toBe(500) // 500 bps == 5%
  })
})
```

---

## Performance Optimization

### Database Query Optimization

**Before:**
```sql
-- Slow: no index on status
SELECT * FROM letter_requests WHERE status = 'pending_review';
```

**After:**
```sql
-- Partial index keeps the queue hot path fast
CREATE INDEX idx_letter_requests_queue
  ON letter_requests(status)
  WHERE status IN ('pending_review', 'under_review');
```

**Composite Index:**
```sql
-- For user-scoped listings ordered by time
CREATE INDEX idx_letter_requests_user_recent
  ON letter_requests(user_id, created_at DESC);
```

### Caching Strategy

TTML's **only** shared cache is Upstash Redis, and it is reserved for the `@upstash/ratelimit` sliding-window rate limiters wired up in `server/rateLimiter.ts`. There is no Redis-backed domain cache; do not invent one. Short-lived per-request memoization happens in process:

**User session cache (in-process, 30s):**
```typescript
// server/supabaseAuth/user-cache.ts — maps a Supabase open_id to the local
// users row and the derived role. 30-second TTL so role changes land quickly
// after invalidateUserCache() is called.
import { invalidateUserCache } from "@/server/supabaseAuth";

export async function promoteToAttorney(userId: number, openId: string) {
  await updateUserRole(userId, "attorney"); // server/db/users.ts
  invalidateUserCache(openId);              // next request re-reads from DB
}
```

**When you genuinely need a warm read (e.g., Perplexity research provenance),** store it in the `research_runs` table with a KV-cache key rather than Redis. This keeps the cache under RLS and survives worker restarts.

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing (unit + integration)
- [ ] Type check: 0 errors
- [ ] Lint check: No violations
- [ ] Drizzle migrations generated and reviewed
- [ ] Environment variables configured on the Railway service
- [ ] Rollback plan documented

### Production Deployment (Railway)

- [ ] Apply database migrations first — the `migrate` Railway service runs `dist/migrate.js` as a one-shot against `SUPABASE_DIRECT_URL` (IPv4 via `--dns-result-order=ipv4first`)
- [ ] Railway deploys three services from the same image: `app` (web), `worker` (pg-boss), `migrate` (one-shot) — see `railway.toml`
- [ ] Confirm the new deployment is `SUCCESS` in Railway before routing traffic
- [ ] Run smoke tests against the public URL
- [ ] Monitor error rates (first 10 minutes) in Sentry
- [ ] Check critical metrics (subscriptions, letters, payments)
- [ ] Verify integrations (Stripe webhook, Perplexity, Anthropic, Resend)

### Post-Deployment

- [ ] Monitor logs for errors (Railway log tail + Sentry)
- [ ] Check performance metrics
- [ ] Verify the `worker` service is processing pg-boss jobs (check `workflow_jobs` status transitions)
- [ ] Verify the email queue is draining (Resend enqueues via pg-boss)
- [ ] Test critical user flows
- [ ] Alert team of deployment completion

### Rollback Triggers

**Automatic Rollback If:**
- Error rate >5% in first 10 minutes
- Database query failures >10%
- Payment processing failures >2%
- Critical procedure timeout rate >20%

**Manual Rollback Process:**
```bash
# 1. Revert the code deployment on Railway — redeploy the previous SUCCESS build
#    via the Railway dashboard (or the Railway MCP `redeploy` tool). All three
#    services (app / worker / migrate) share one image; only redeploy app + worker.

# 2. Drizzle migrations are forward-only. If the new migration was destructive
#    (column drop, NOT NULL add), author a follow-up migration to restore shape
#    — never run `drizzle-kit drop` or `supabase db reset` against production.

# 3. Bust the in-process user cache if role/auth shape changed by calling
#    invalidateUserCache() on affected users — do NOT FLUSHALL the shared
#    Upstash Redis instance (it also holds rate-limit state).

# 4. Notify team
# 5. Investigate root cause
```

---

## Documentation Standards

### tRPC Procedure Documentation

```typescript
/**
 * Submit a new letter request
 *
 * Procedure: letters.submit (subscriberProcedure.mutation)
 *
 * Kicks off the 4-stage AI pipeline: Perplexity `sonar-pro` research →
 * Claude Sonnet 4 (`claude-sonnet-4-20250514`) draft → Sonnet 4 assembly →
 * Sonnet 4 vetting. (Opus is NOT used — the legacy `claude-opus-4-5` entry in
 * the pricing table is historical only.) Requires an active subscription OR
 * an available free-first-letter slot. The entitlement claim is atomic via
 * `incrementLettersUsed` / `claimFreeTrialSlot`.
 *
 * @input {SubmitLetterInput}
 *   - letterType: Type of letter (demand-letter, cease-and-desist, etc.)
 *   - intakeData:  User-provided letter details
 *   - jurisdiction: Optional state code (inferred from address if absent)
 *
 * @returns {SubmitLetterOutput}
 *   - letterRequestId: UUID of the new row
 *   - status: 'submitted' (transitions to 'researching' when worker picks it up)
 *
 * @throws TRPCError
 *   - UNAUTHORIZED   — no authenticated subscriber
 *   - FORBIDDEN      — no allowance remaining
 *   - BAD_REQUEST    — invalid intake data
 *   - TOO_MANY_REQUESTS — rate-limit exceeded (10 per 10 minutes)
 *   - INTERNAL_SERVER_ERROR — pipeline enqueue failed
 *
 * @example
 *   await trpc.letters.submit.mutate({
 *     letterType: 'demand-letter',
 *     intakeData: {
 *       senderName: 'John Doe',
 *       senderAddress: '123 Main St, Los Angeles, CA 90001',
 *       recipientName: 'Jane Smith',
 *       recipientAddress: '456 Oak Ave, Los Angeles, CA 90002',
 *       amountOwed: '5000.00',
 *       deadlineDate: '2026-03-01',
 *       incidentDescription: 'Unpaid invoice for consulting services',
 *     },
 *     jurisdiction: 'CA',
 *   })
 */
export const submit = subscriberProcedure
  .input(submitLetterSchema)
  .mutation(async ({ ctx, input }) => {
    // ...
  })
```

### Database Migration Documentation

```sql
/*
  Migration: Add Webhook Idempotency Tracking

  Purpose: Prevent duplicate processing of Stripe webhook events

  Changes:
    - Creates webhook_events table
    - Adds unique constraint on stripe_event_id
    - Adds index for fast duplicate checks
    - Creates RPC function for atomic idempotency check

  Rollback:
    DROP TABLE IF EXISTS webhook_events;
    DROP FUNCTION IF EXISTS check_and_record_webhook;
*/

CREATE TABLE webhook_events (...);
```

---

## Monitoring & Alerting

### Critical Metrics

**Application Health:**
- tRPC procedure latency (p50, p95, p99)
- Error rate (4xx, 5xx classes mapped from `TRPCError.code`)
- Request rate (requests per minute)
- Database connection pool usage

**Business Metrics:**
- Letter generation success rate (per stage in `workflow_jobs`)
- Payment processing success rate
- Attorney review turnaround time
- Subscription activation rate
- Commission ledger accuracy

**Infrastructure:**
- Supabase Postgres CPU / memory
- Supabase storage usage
- Upstash Redis request rate (rate-limit token bucket)
- Railway container CPU / memory / restart count (app + worker + migrate)

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API error rate | >2% | >5% |
| Letter generation failures | >5% | >10% |
| Payment processing failures | >1% | >2% |
| Database query time (p95) | >500ms | >1000ms |
| pg-boss job backlog | >50 | >200 |
| Perplexity availability | <98% | <95% |

---

## Code Quality Score Breakdown

### Current Score: 8.2-8.5/10

**Strengths (9-10/10):**
- Zero TypeScript errors
- Comprehensive RLS policies
- Atomic payment operations
- Security vulnerabilities fixed
- Error handling coverage

**Good (7-8/10):**
- Test coverage (critical paths)
- Documentation (tRPC procedures)
- Performance (indexed queries)
- Code organization (modular sub-routers under `server/routers/`)

**Needs Improvement (5-6/10):**
- E2E test coverage
- Load testing
- Observability (tracing)
- Sentry error tracking depth

**Target Improvements:**
- Expand E2E test suite → 8.5/10
- Add OpenTelemetry tracing → 8.7/10
- Deepen Sentry error tracking → 9.0/10
- Add load testing suite → 9.2/10
