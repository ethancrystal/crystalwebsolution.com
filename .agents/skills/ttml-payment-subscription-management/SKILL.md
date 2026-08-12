---
name: ttml-payment-subscription-management
description: Stripe payment processing, subscription activation, discount-code commissions, and letter-unlock flows for the TTML (Talk-to-My-Lawyer) platform. Use when touching Stripe checkout, the /api/stripe/webhook route, handlers/checkout.ts, handlers/subscriptions.ts, the subscriptions / commission_ledger / discount_codes / processed_stripe_events tables, or any $299 / $2,400 / $50 / $20 price flow.
---

# Payment & Subscription Management — TTML (verified 2026‑04‑20)

This SKILL is aligned to the `ttml-app` repository on 2026‑04‑20. All code, tables, columns, env vars, pricing, and file paths below were verified against the monorepo at `/sessions/clever-pensive-rubin/mnt/ttml-app` on that date. Where the older April‑18 audit baseline disagreed (e.g. `$200` pricing, `remaining_letters`, a `check_and_record_webhook` RPC, `webhook_events` table), this SKILL replaces it.

---

## Architecture Overview

```
Subscriber flow:
  1. billing.createCheckout (tRPC)        → Stripe Checkout session
  2. Stripe hosted checkout              → user pays
  3. POST /api/stripe/webhook (Express)  → stripeWebhookHandler
        ├─ verify signature
        ├─ dedup via processed_stripe_events (Drizzle onConflictDoNothing)
        └─ switch(event.type)
             ├─ checkout.session.completed          → handlers/checkout.ts
             ├─ customer.subscription.created       → handlers/subscriptions.ts
             ├─ customer.subscription.updated       → handlers/subscriptions.ts
             ├─ customer.subscription.deleted       → handlers/subscriptions.ts
             ├─ invoice.paid                         → handlers/subscriptions.ts
             └─ invoice.payment_failed              → handlers/subscriptions.ts
  4. handlers/checkout.ts                → activateSubscription (server/stripe.ts)
        + unlockLetterForReview          (generated_locked → pending_review)
        + trackCommission                (discount_codes + commission_ledger)
```

**Key files:**

| File | Role |
| ---- | ---- |
| `server/stripeWebhook/index.ts` | Entry, signature verify, idempotency, event router |
| `server/stripeWebhook/handlers/checkout.ts` | `checkout.session.completed` — per-letter unlock, first-letter review, revision consultation, subscription commissions |
| `server/stripeWebhook/handlers/subscriptions.ts` | subscription lifecycle + invoice events |
| `server/stripeWebhook/_helpers.ts` | `stripeLogger`, shared helpers |
| `server/stripe.ts` | `getStripe()` accessor, `activateSubscription()` mutation |
| `server/stripe-products.ts` | `getPlanConfig(planId)` → name/letters/interval |
| `server/db/subscriptions.ts`, `server/db/commissions.ts`, `server/db/discount-codes.ts` | Data-access layer |
| `shared/pricing.ts` | **Single source of truth** for all prices |
| `drizzle/schema/billing.ts` | `subscriptions`, `commission_ledger`, `discount_codes`, `payout_requests`, `processed_stripe_events` |
| `server/routers/billing/` | tRPC procedures (`createCheckout`, `verifyPayment`, `listCommissions`, etc.) |

---

## Canonical Pricing (from `shared/pricing.ts`)

**NEVER hardcode dollars or cents.** Always import from `shared/pricing.ts`.

| Plan id (pricing) | Display | Stripe cents | Letters | Billing | Notes |
| ----------------- | ------- | ------------ | ------- | ------- | ----- |
| `single_letter` | $299 | `29900` | 1 | one-time | `PRICING.singleLetter` |
| `monthly` | $299 / mo | `29900` | 4 | recurring monthly | `PRICING.monthly` |
| `yearly` | $2,400 / yr | `240000` | 8 | recurring yearly | `PRICING.yearly` |

Additional one-time charges:

| Purpose | Price | Constant |
| ------- | ----- | -------- |
| First-letter attorney review | **$50** (`5000`¢) | `FIRST_LETTER_REVIEW_PRICE_CENTS` |
| Revision consultation | **$20** (`2000`¢) | literal in `handlers/checkout.ts` for `unlock_type = "revision_consultation"` |

```ts
// shared/pricing.ts — exports you import (verified symbols)
export const PRICING = { singleLetter, monthly, yearly } as const;
export const ALL_PLANS  = [PRICING.singleLetter, PRICING.monthly, PRICING.yearly] as const;
export const PAID_PLANS = [PRICING.singleLetter, PRICING.monthly, PRICING.yearly] as const;

export const AFFILIATE_DISCOUNT_PERCENT = 20;
export const SINGLE_LETTER_PRICE_CENTS  = PRICING.singleLetter.price * 100; // 29900
export const MONTHLY_PRICE_CENTS        = PRICING.monthly.price       * 100; // 29900
export const YEARLY_PRICE_CENTS         = PRICING.yearly.price        * 100; // 240000
export const FIRST_LETTER_REVIEW_PRICE  = 50;
export const FIRST_LETTER_REVIEW_PRICE_CENTS = 5000;
```

> **Legacy note:** The `plan` enum in `drizzle/schema/billing.ts` contains legacy values (`per_letter`, `starter`, `professional`, `annual`) alongside the canonical ones (`single_letter`, `monthly`, `yearly`, `free_trial_review`). Existing rows may use the legacy ids; new checkout metadata should use the ids from `PRICING.*.id` (`single_letter`, `monthly`, `yearly`).

---

## Critical Rules (MUST Follow)

1. **[IDEMPOTENCY — Drizzle, not RPC]** Webhook dedup is done with Drizzle against `processed_stripe_events` *before* processing, and a `onConflictDoNothing()` insert *after* processing. There is **no** `check_and_record_webhook` RPC and no `webhook_events` table — those were previous-audit artifacts.

   ```ts
   // server/stripeWebhook/index.ts
   const existing = await db
     .select({ eventId: processedStripeEvents.eventId })
     .from(processedStripeEvents)
     .where(eq(processedStripeEvents.eventId, event.id))
     .limit(1);
   if (existing.length > 0) { res.json({ received: true, duplicate: true }); return; }
   // ...process...
   await db.insert(processedStripeEvents).values({
     eventId: event.id, eventType: event.type,
   }).onConflictDoNothing();
   ```

2. **[RAW BODY]** Stripe signature verification requires the raw request body. The route must be mounted **before** `express.json()` with `express.raw({ type: "application/json" })`. `stripe.webhooks.constructEvent(req.body as Buffer, sig, ENV.stripeWebhookSecret)` reads a `Buffer`.

3. **[TEST EVENT SHORT-CIRCUIT]** `event.id.startsWith("evt_test_")` returns `{ verified: true }` early and does not touch the DB — this is how the Stripe Dashboard "send test webhook" button is handled.

4. **[PRICE SOURCE OF TRUTH]** Always import from `shared/pricing.ts`. **Never** hardcode `20000`, `200000`, `$200`, or `$200/mo` anywhere in server or client code — those values are stale from the old audit and no longer exist in production.

5. **[LETTER ALLOWANCE COLUMNS]** The `subscriptions` table tracks allowance as **two** integer columns:
   - `letters_allowed` — how many letters the plan grants (1, 4, 8, etc.)
   - `letters_used` — incremented on letter submission

   The old `remaining_letters` column **does not exist**. Never query or migrate against it. Allowance is checked as `letters_used < letters_allowed` (or unlimited when explicitly modeled by plan logic in `server/db/subscriptions.ts`).

6. **[STATUS MACHINE FOR LETTERS]** Letter unlock flows must transition `generated_locked → pending_review` only. Use `updateLetterStatus` and log every transition via `logReviewAction` with `actorType: "system"` and `action: "payment_received"`. Never skip the `generated_locked` guard in `handlers/checkout.ts`.

7. **[COMMISSION ACCURACY]** Commission = `saleAmount * 500 / 10000` (5% in basis points), `Math.round`ed, stored in `commission_ledger.commission_amount`. `commission_rate` column defaults to `500`. The ledger has a **unique index on `stripe_payment_intent_id`** (`uq_commission_ledger_stripe_pi`) — this is what prevents double-pay, not a unique on `subscription_id`.

8. **[TRACK COMMISSION ONLY WHEN PAID]** In `handlers/checkout.ts::trackCommission`, `saleAmount <= 0` returns early after incrementing `discount_codes.usage_count`. Do not insert a zero-value commission row.

9. **[DISCOUNT CODES DEFAULT 20%]** `discount_codes.discount_percent` defaults to `20` (not a fixed hard-code — still per-row). Codes are uppercased in storage; look up with `getDiscountCodeByCode(code)` which normalizes. `isActive = true` is required.

10. **[WEBHOOK SECURITY]** Signature verification is mandatory; failures return `400`. Log to Sentry (`captureServerException`) with `tags: { component: "stripe_webhook", error_type: "signature_verification" }`.

11. **[STRIPE METADATA]** All transaction context travels on the Stripe session's `metadata` object (not on Subscription or PaymentIntent alone — the handler reads `session.metadata`). Required keys for letter unlocks:
    - `user_id` (numeric, matches `users.id`)
    - `plan_id` (pricing plan id; fallback `per_letter`)
    - `unlock_type` (`letter_unlock` | `first_letter_review` | `revision_consultation` | absent = standard subscription activation)
    - `letter_id` (when unlock_type is set)
    - Optional referral: `discount_code`, `discount_code_id`, `employee_id`, `original_price`
    - `revision_notes` (for `revision_consultation`)

12. **[EMAIL NON-BLOCKING]** `sendLetterUnlockedEmail`, `sendEmployeeCommissionEmail`, and `sendClientRevisionRequestEmail` are awaited but wrapped in `.catch()` so a delivery failure does **not** throw out of the webhook handler. Stripe would otherwise retry and replay the whole handler.

13. **[NOTIFICATIONS]** Every state change fires both in-app (`createNotification`, `notifyAdmins`, `notifyAllAttorneys`) and email. Admins get notified of every payment and every commission.

14. **[RBAC]**
    - `billing.createCheckout`, `billing.verifyPayment` → `subscriberProcedure` (authenticated, non-banned user).
    - Commission read endpoints → `employeeProcedure` (employee role + whitelisted).
    - Manual ledger edits / payouts → `adminProcedure` (admin role + 2FA).
    - Super-admin privileges are **not** in the DB — they come from `SUPER_ADMIN_EMAILS` in `server/supabaseAuth.ts`.

15. **[PROHIBITED]** Never persist PANs, CVVs, or bank data. Card BIN / last-4 only ever come from Stripe API responses.

---

## Stripe Webhook Entry (`server/stripeWebhook/index.ts`)

**Verified signature** of the entry handler:

```ts
export async function stripeWebhookHandler(
  req: Request,
  res: Response,
): Promise<void>
```

**Mount in Express** (simplified):

```ts
// server/index.ts (or wherever routes mount)
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler,
);
```

**Event fan-out** (exact switch from `index.ts`):

```ts
case "checkout.session.completed":
  await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
  break;
case "customer.subscription.created":
case "customer.subscription.updated":
  await handleSubscriptionCreatedOrUpdated(event);
  break;
case "customer.subscription.deleted":
  await handleSubscriptionDeleted(event);
  break;
case "invoice.paid":
  await handleInvoicePaid(event.data.object as Stripe.Invoice);
  break;
case "invoice.payment_failed":
  await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
  break;
```

Any other event type is logged as "Unhandled event type" and still recorded in `processed_stripe_events` so Stripe won't retry. Only *exceptions inside the handler* cause a `500` retry.

---

## `handlers/checkout.ts` — Four Flows

`handleCheckoutSessionCompleted` parses `session.metadata.user_id`, `plan_id`, and `unlock_type`, then routes to one of:

### 1. Standard Subscription Activation (no special `unlock_type`, `session.mode = "payment"`)

Calls `activateSubscription({ userId, stripeCustomerId, stripeSubscriptionId: null, stripePaymentIntentId, planId, status: "active", currentPeriodStart: new Date(), currentPeriodEnd: null })` — implemented in `server/stripe.ts`, which upserts the `subscriptions` row and sets `letters_allowed` / `letters_used` based on `getPlanConfig(planId)`.

### 2. Letter Unlock (`unlock_type = "letter_unlock"`)

`unlockLetterForReview(letterId, userId, sessionId, noteText, appUrl, notifyAttorneys=true)`:

1. Re-fetches the letter; **must** be in `generated_locked` or the handler logs a warning and returns.
2. `updateLetterStatus(letterId, "pending_review")`.
3. `logReviewAction({ actorType: "system", action: "payment_received", fromStatus: "generated_locked", toStatus: "pending_review", noteVisibility: "user_visible" })`.
4. `createNotification` to the subscriber; `sendLetterUnlockedEmail`.
5. `notifyAdmins` (category `"letters"`, type `"payment_received"`) with inline `emailOpts`.
6. `notifyAllAttorneys({ letterId, letterSubject, letterType, jurisdiction, appUrl })`.
7. If `session.metadata.discount_code` is present, calls `trackCommission` (see below). Fallback `saleAmount` if `session.amount_total` is null is `29900` (single-letter cents).

### 3. First-Letter Review Gate ($50, `unlock_type = "first_letter_review"`)

Same flow as letter-unlock **plus** `setFreeReviewUsed(userId)` — flips the per-user "you've used your $50 first-letter review" flag so subsequent letters go through the regular `single_letter` ($299) or subscription entitlement. Uses hardcoded `$50` copy in emails and notifications; amount itself is `FIRST_LETTER_REVIEW_PRICE_CENTS` (5000) defined in `shared/pricing.ts`.

### 4. Revision Consultation ($20, `unlock_type = "revision_consultation"`)

Only runs on letters already in one of `["client_approval_pending", "approved", "client_approved", "sent"]`. Transitions to `client_revision_requested`, logs it with `actorType: "subscriber"` (the subscriber paid), notifies the assigned reviewer plus admins, and emails the attorney.

### Subscription-mode commission (mode `"subscription"`)

When `session.mode === "subscription"` (i.e. monthly plan checkout), only `trackCommission` runs here — actual subscription state is created/updated by the `customer.subscription.created` event in `handlers/subscriptions.ts`.

### `trackCommission` details (verified)

```ts
// saleAmount is session.amount_total in cents
const commissionRate   = 500;                                   // basis points
const commissionAmount = Math.round(saleAmount * commissionRate / 10000);
const resolvedEmployeeId = metaEmployeeId ?? discountCode.employeeId;

await incrementDiscountCodeUsage(discountCode.id);
if (saleAmount <= 0) return;                                    // no zero rows

await createCommission({
  employeeId: resolvedEmployeeId,
  letterRequestId,
  subscriberId,
  discountCodeId: metaDiscountCodeId ?? discountCode.id,
  stripePaymentIntentId: paymentIntentId ?? undefined,          // used by uq_commission_ledger_stripe_pi
  saleAmount,
  commissionRate,
  commissionAmount,
});
```

Three notifications always fire:
- `createNotification({ userId: employeeId, type: "commission_earned", category: "employee", … })`
- `notifyAdmins({ type: "discount_code_used", category: "employee", … })`
- `notifyAdmins({ type: "commission_earned", category: "employee", … })`

And one email: `sendEmployeeCommissionEmail` to the employee, `catch`ed so send failure does not abort.

---

## `handlers/subscriptions.ts` — Lifecycle & Invoice Events

Handles the four Stripe events below. Standard shape: parse the object, upsert/update the `subscriptions` row, update allowance/status, fire notifications.

| Event | Handler | Effect |
| ----- | ------- | ------ |
| `customer.subscription.created` | `handleSubscriptionCreatedOrUpdated` | Upsert row; set `letters_allowed` from `getPlanConfig`; `status = "active"`. |
| `customer.subscription.updated` | `handleSubscriptionCreatedOrUpdated` | Map Stripe status → internal status; refresh `current_period_start/end`, `cancel_at_period_end`. |
| `customer.subscription.deleted` | `handleSubscriptionDeleted` | `status = "canceled"`; notify subscriber. |
| `invoice.paid` | `handleInvoicePaid` | Monthly/yearly renewals: reset `letters_used = 0`, bump period, send receipt. |
| `invoice.payment_failed` | `handleInvoicePaymentFailed` | `status = "past_due"`; send dunning email; no entitlement revocation yet. |

> **Important gotcha:** A *monthly* renewal must reset `letters_used = 0`; a *yearly* renewal still resets to `0` (8-letter pool is per year). Verify against `getPlanConfig(planId).resetCadence` if you change this behavior.

---

## Schema — `drizzle/schema/billing.ts` (verified)

### `subscriptions`

```ts
pgTable("subscriptions", {
  id:                  serial("id").primaryKey(),
  userId:              integer("user_id").unique().references(() => users.id, { onDelete: "set null" }),
  stripeCustomerId:    varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  plan:                subscriptionPlanEnum("plan").notNull(),
  status:              subscriptionStatusEnum("status").default("none").notNull(),
  lettersAllowed:      integer("letters_allowed").default(0).notNull(),
  lettersUsed:         integer("letters_used").default(0).notNull(),
  currentPeriodStart:  timestamp("current_period_start", { withTimezone: true }),
  currentPeriodEnd:    timestamp("current_period_end",   { withTimezone: true }),
  cancelAtPeriodEnd:   boolean("cancel_at_period_end").default(false).notNull(),
  metadataJson:        jsonb("metadata_json"),
  createdAt:           timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt:           timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("idx_subscriptions_stripe_subscription_id").on(t.stripeSubscriptionId),
  index("idx_subscriptions_stripe_customer_id").on(t.stripeCustomerId),
  index("idx_subscriptions_status").on(t.status),
])
```

- **One active row per user** enforced by `userId` `UNIQUE`. Reactivations update the existing row.
- `plan` enum values (from `SUBSCRIPTION_PLANS`):
  ```ts
  ["per_letter", "monthly", "annual", "free_trial_review",
   "starter", "professional", "single_letter", "yearly"]
  ```
  New checkout flows use `single_letter` / `monthly` / `yearly`. Legacy values remain for historical rows.
- `status` enum (`SUBSCRIPTION_STATUSES`):
  ```ts
  ["active", "canceled", "past_due", "trialing", "incomplete", "none"]
  ```

### `discount_codes`

```ts
pgTable("discount_codes", {
  id:               serial("id").primaryKey(),
  employeeId:       integer("employee_id").notNull(),
  code:             varchar("code", { length: 50 }).notNull().unique(),
  discountPercent:  integer("discount_percent").default(20).notNull(),
  isActive:         boolean("is_active").default(true).notNull(),
  usageCount:       integer("usage_count").default(0).notNull(),
  maxUses:          integer("max_uses"),
  expiresAt:        timestamp("expires_at", { withTimezone: true }),
  …
})
```

### `commission_ledger`

```ts
pgTable("commission_ledger", {
  id:                     serial("id").primaryKey(),
  employeeId:             integer("employee_id").references(() => users.id, { onDelete: "set null" }),
  letterRequestId:        integer("letter_request_id").references(() => letterRequests.id, { onDelete: "set null" }),
  subscriberId:           integer("subscriber_id").references(() => users.id, { onDelete: "set null" }),
  discountCodeId:         integer("discount_code_id"),
  stripePaymentIntentId:  varchar("stripe_payment_intent_id", { length: 255 }),
  saleAmount:             integer("sale_amount").notNull(),        // cents
  commissionRate:         integer("commission_rate").default(500).notNull(), // bps
  commissionAmount:       integer("commission_amount").notNull(),  // cents
  status:                 commissionStatusEnum("status").default("pending").notNull(),
  paidAt:                 timestamp("paid_at", { withTimezone: true }),
  createdAt:              timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({
  employeeIdx:              index("idx_commission_ledger_employee_id").on(t.employeeId),
  statusIdx:                index("idx_commission_ledger_status").on(t.status),
  employeeStatusIdx:        index("idx_commission_ledger_employee_status").on(t.employeeId, t.status),
  uniquePaymentIntentIdx:   uniqueIndex("uq_commission_ledger_stripe_pi").on(t.stripePaymentIntentId),
}))
```

> **Uniqueness is on `stripe_payment_intent_id`, not `subscription_id`.** This prevents a replayed webhook from creating a second commission row for the same PaymentIntent. If `stripePaymentIntentId` is null (rare for subscription-mode checkouts where only `invoice.payment_intent` is present), the unique index does not dedup — your insert path must set it.

### `payout_requests`

Used by the employee payout flow; no changes from the audit baseline.

### `processed_stripe_events` (new canonical table)

```ts
pgTable("processed_stripe_events", {
  eventId:    varchar("event_id", { length: 255 }).primaryKey(),
  eventType:  varchar("event_type", { length: 100 }).notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }).defaultNow().notNull(),
})
```

This table **replaces** the `webhook_events` table and `check_and_record_webhook` RPC referenced by older docs. Dedup is done with Drizzle `select` + `onConflictDoNothing()` insert — no plpgsql.

---

## tRPC Procedures (`server/routers/billing/`)

### `billing.createCheckout`

`subscriberProcedure.mutation` — input shape (live):

```ts
z.object({
  planId: z.enum(["single_letter", "monthly", "yearly"]),   // from PRICING.*.id
  discountCode: z.string().trim().max(64).optional(),
  unlockType: z.enum(["letter_unlock", "first_letter_review", "revision_consultation"]).optional(),
  letterId: z.number().int().positive().optional(),
  revisionNotes: z.string().max(2000).optional(),
})
```

Body outline (kept in sync with `server/routers/billing/createCheckout.ts`):

1. Rate-limit `checkout:${userId}` (Upstash).
2. Conflict check: if an `active` subscription already exists and `planId !== single_letter`, throw `CONFLICT`.
3. Resolve pricing from `shared/pricing.ts` — no literals.
4. Validate discount code (case-insensitive via `getDiscountCodeByCode`), compute `discountCents`, derive `finalPriceCents`.
5. Create a Stripe Customer (if needed), cache on `users.stripeCustomerId`.
6. `stripe.checkout.sessions.create(…)` with `mode: "subscription"` for `monthly`/`yearly`, `mode: "payment"` for `single_letter` and all unlock types; metadata per rule 11; `success_url`/`cancel_url` from `ENV.appUrl`; `allow_promotion_codes: false`.
7. Return `{ url: session.url }`.

### `billing.verifyPayment`

User-initiated idempotent verify (run after Stripe redirect). It re-fetches the session, checks `payment_status === "paid"`, asserts `session.metadata.user_id === ctx.user.id.toString()`, then performs the same activation the webhook would. The webhook and `verifyPayment` race each other — race safety is provided by:
- `UNIQUE(user_id)` on `subscriptions`
- `uq_commission_ledger_stripe_pi` on `commission_ledger`
- `onConflictDoNothing()` inserts where safe
- `updateLetterStatus` guarded by `status === "generated_locked"` pre-check

No plpgsql RPC exists or is required — Drizzle + Postgres constraints suffice.

### `billing.listCommissions` / `billing.listPayouts`

`employeeProcedure` — filtered to the acting employee's own rows. Never expose cross-employee data.

---

## Entitlement Gate on Letter Creation

Letter submission (`letters.submit`) must atomically increment `letters_used` before advancing the status machine. Pattern (simplified):

```ts
// server/db/subscriptions.ts
await db.transaction(async (tx) => {
  const sub = await tx
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .for("update")
    .limit(1);

  if (!sub[0]) throw new TRPCError({ code: "FORBIDDEN", message: "No active subscription" });
  if (sub[0].lettersUsed >= sub[0].lettersAllowed) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Letter allowance exhausted" });
  }

  await tx
    .update(subscriptions)
    .set({ lettersUsed: sub[0].lettersUsed + 1, updatedAt: new Date() })
    .where(eq(subscriptions.id, sub[0].id));
});
```

- Uses `for("update")` row lock to serialize concurrent `letters.submit` on the same subscription.
- **Do not** reference `remaining_letters`, `credits_remaining`, or any other deprecated column — they do not exist in the current schema.

---

## Testing Checklist

### Unit (Vitest, `server/*.test.ts`)

- [ ] Pricing import from `shared/pricing.ts` — no hardcoded `$200` / `$2000` anywhere
- [ ] `discountPercent` defaults to `20` but per-row overrides honored
- [ ] Commission math: `saleAmount * 500 / 10000`, rounded; skip when `saleAmount <= 0`
- [ ] `unlockLetterForReview` refuses unless `letter.status === "generated_locked"`
- [ ] `trackCommission` inserts with `stripePaymentIntentId` populated; conflict on `uq_commission_ledger_stripe_pi` does not raise

### Integration (tRPC `createCaller` + test Supabase)

- [ ] End-to-end `createCheckout` → mock webhook `checkout.session.completed` → active subscription + commission row + unlocked letter
- [ ] Duplicate webhook delivery returns `{ received: true, duplicate: true }` and leaves DB untouched
- [ ] `verifyPayment` and webhook racing → exactly one active subscription, one commission row
- [ ] `first_letter_review` → `setFreeReviewUsed(userId)` flips flag; subsequent first-letter checkout requires real payment
- [ ] `revision_consultation` rejected when letter not in allowed statuses
- [ ] `letters.submit` on a monthly plan with `letters_used = 4, letters_allowed = 4` throws `FORBIDDEN`

### Security

- [ ] Signature verification rejects tampered body
- [ ] Test event (`evt_test_*`) returns 200 `{ verified: true }` without DB writes
- [ ] User can't call `verifyPayment` on another user's session (metadata `user_id` mismatch → `FORBIDDEN`)
- [ ] RLS on `commission_ledger`, `subscriptions`, `discount_codes` prevents cross-tenant reads
- [ ] Super-admin role not reachable via SQL/UI (hardcoded whitelist in `server/supabaseAuth.ts`)

---

## Monitoring & Alerts

| Metric | Target | Alert condition |
| ------ | ------ | --------------- |
| Checkout creation success | > 95% | < 90% over 1 h → check Stripe API status |
| Webhook handler p95 latency | < 2 s | > 5 s → investigate DB hot path |
| Duplicate active subscriptions per `user_id` | 0 | ≥ 1 → page on-call |
| Commissions vs paid referred checkouts | 1 : 1 | drift > 5% → reconcile `commission_ledger` |
| `evt_test_` in prod | 0 real processing | attempted processing → alert |

Sentry tags already emitted by the code: `component: "stripe_webhook"`, `error_type: "signature_verification"`, `event_type: <event.type>`.

---

## Environment Variables (from `server/_core/env.ts`)

| ENV key | Purpose |
| ------- | ------- |
| `STRIPE_SECRET_KEY` (`ENV.stripeSecretKey`) | Server-side Stripe API |
| `STRIPE_WEBHOOK_SECRET` (`ENV.stripeWebhookSecret`) | Used by `stripe.webhooks.constructEvent` |
| `STRIPE_PUBLISHABLE_KEY` (`VITE_STRIPE_PUBLISHABLE_KEY`) | Frontend Checkout init (if used) |
| `APP_URL` / `VITE_APP_URL` | Building `success_url` / `cancel_url` |

No `sk_test_*` in production (enforced at startup).

---

## Related Skills

- **`ttml-database-rls-security`** — RLS policies for `subscriptions`, `commission_ledger`, `discount_codes`, `processed_stripe_events`.
- **`ttml-backend-patterns`** — tRPC router composition, `subscriberProcedure` / `employeeProcedure` / `adminProcedure`, Upstash rate limit, pg-boss queue.
- **`ttml-pipeline-expert`** / **`ttml-pipeline-orchestrator`** — how letter unlock transitions interact with the pipeline status machine.
- **`ttml-legal-letter-generation`** — end-to-end lifecycle, where `generated_locked → pending_review` is triggered from this SKILL.
- **`ttml-code-review-qa`** — PR-level checklist covering Stripe metadata discipline, price-in-cents, idempotency.
