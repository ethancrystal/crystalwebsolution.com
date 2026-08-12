---
name: ttml-data-api-expert
description: "Expert in data flow and API development for the Talk To My Lawyer (TTML) application. Use for: creating/modifying tRPC procedures, implementing Drizzle ORM queries with Supabase, handling authentication, enforcing RBAC (super admin whitelist, attorney promotion, subscription guards), and ensuring consistent error handling/rate limiting in the TTML project."
license: MIT
metadata:
  version: "2.0.0"
---

# TTML Data API Expert Skill

Expert on TTML's backend data flow: Vite 7 + Express 4.21 + **tRPC v11** + Drizzle ORM 0.44/0.45 + Supabase PostgreSQL. Use when creating/modifying tRPC procedures, implementing Drizzle queries, gating procedures by role, or auditing the usage/refund flows. **Not Next.js**, not App Router.

---

## Procedure Guard Hierarchy (2026-04-20 canonical)

| Guard | Defined In | Behaviour |
|-------|-----------|-----------|
| `publicProcedure` | `server/_core/trpc.ts` | No auth required |
| `protectedProcedure` | `server/_core/trpc.ts` | Requires `ctx.user`; throws `UNAUTHORIZED` with `UNAUTHED_ERR_MSG` |
| `emailVerifiedProcedure` | `server/_core/trpc.ts` | Extends `protectedProcedure`; requires `ctx.user.emailVerified === true`; throws `FORBIDDEN` with `EMAIL_NOT_VERIFIED_ERR_MSG` |
| `adminProcedure` | `server/_core/trpc.ts` | Requires `role === "admin"` **AND** valid `admin_2fa` cookie (verified via `verifyAdmin2FAToken`); throws `FORBIDDEN` |
| `attorneyProcedure` | `server/routers/_shared.ts` | Extends `protectedProcedure`; accepts `role === "attorney" || role === "admin"` |
| `subscriberProcedure` | `server/routers/_shared.ts` | Extends `protectedProcedure`; strictly `role === "subscriber"` |
| `employeeProcedure` | `server/routers/_shared.ts` | Extends `protectedProcedure`; accepts `role === "employee" || role === "admin"` |
| `verifiedSubscriberProcedure` | `server/routers/_shared.ts` | Extends `emailVerifiedProcedure`; strictly `role === "subscriber"` |

> `user_role` enum is flat: `subscriber | employee | attorney | admin`. There is **no** `admin_sub_role` column and no `super_admin` or `attorney_admin` sub-role. Super-admin status is enforced in code, not in a column.

---

## Router Architecture (`server/routers/`)

Directory-split module structure. The root router `server/routers/index.ts` merges these:

- **`system`** — health checks (`server/_core/systemRouter.ts`)
- **`auth`** — auth-related procedures (`server/routers/auth.ts`)
- **`letters`** — `server/routers/letters/` (`index.ts`, `submit.ts`, `subscriber.ts`, `client-approval.ts`)
- **`review`** — `server/routers/review/` (`index.ts`, `queue.ts`, `actions.ts`)
- **`admin`** — `server/routers/admin/` (`users.ts`, `letters.ts`, `jobs.ts`, `learning.ts`)
- **`notifications`** — `server/routers/notifications.ts`
- **`versions`** — `server/routers/versions.ts` (immutable letter versions with paywall/truncation)
- **`billing`** — `server/routers/billing/` (`subscriptions.ts`, `letters.ts`) — Stripe Checkout + one-time `$299` single-letter + `$50` first-letter review
- **`affiliate`** — `server/routers/affiliate/` (`employee.ts`, `admin.ts`) — discount codes + commissions
- **`profile`** — `server/routers/profile.ts`
- **`documents`** — `server/routers/documents.ts` (document analyzer)
- **`blog`** — `server/routers/blog.ts`
- **`templates`** — `server/routers/templates.ts`
- **`intakeFormTemplates`** — `server/routers/intakeFormTemplates.ts`

Sub-files export plain objects of procedures that get spread into the directory's `router({ ... })` call in `index.ts`.

---

## Super Admin Whitelist (Hard-Coded)

Defined once at `server/supabaseAuth/client.ts:12`:

```ts
export const SUPER_ADMIN_EMAILS = ["ravivo@homes.land", "moizj00@gmail.com"] as const;
```

Enforced at three auth entry points inside `server/supabaseAuth/`:

1. **Google OAuth sync** (`helpers.ts` → `syncGoogleUser()`) — PKCE flow requires `SameSite=None; Secure=true` on the `pkce_verifier` cookie for the cross-site redirect to work.
2. **Token verify / cache miss** (`jwt.ts` → `verifyToken()`) — role correction on next request.
3. **Email signup REST route** (`routes/*` → `POST /api/auth/signup`).

Any non-whitelisted user who somehow carries `role === "admin"` is silently demoted to `subscriber` on the next auth pass. **Never** build a UI or API that writes `role = 'admin'`.

Admin procedures also require the `admin_2fa` cookie issued by the 2FA flow in `server/_core/admin2fa.ts` (verify via `verifyAdmin2FAToken(token, userId)`).

---

## Attorney Promotion Flow (Data Layer)

Attorneys cannot self-register. The only path is super-admin promotion via `admin.updateRole`.

```typescript
// server/routers/admin/users.ts (shape)
updateRole: adminProcedure
  .input(z.object({
    userId: z.number(),
    role: z.enum(["subscriber", "employee", "attorney"]), // NOTE: "admin" excluded by zod
  }))
  .mutation(async ({ input }) => {
    if (input.role === "attorney") {
      if (await hasActiveRecurringSubscription(input.userId)) {
        throw new TRPCError({ code: "BAD_REQUEST",
          message: "Cancel active subscription before promoting to attorney" });
      }
    }
    await updateUserRole(input.userId, input.role);
    if (input.role === "attorney") {
      await createNotification({ userId: input.userId, type: "role_updated",
        link: "/attorney", ... });
    }
    await invalidateUserCache(user.openId); // 30s cache bust
    return { success: true };
  });
```

Guards: Zod enum excludes `"admin"`; `hasActiveRecurringSubscription()` prevents billing conflicts; `invalidateUserCache()` ensures the next request sees the new role.

---

## Entitlement Management (Data Layer)

### `letters.submit` — Atomic Usage Claim

Thin router in `server/routers/letters/submit.ts` that rate-limits then delegates to `submitLetter()` in `server/services/letters.ts`.

```typescript
// server/services/letters.ts — submitLetter(input, ctx)
const entitlement = await checkLetterSubmissionAllowed(ctx.userId); // stripe/subscriptions.ts
if (!entitlement.allowed) throw TRPCError({ code: "FORBIDDEN", ... });

let claimed = false;
try {
  if (entitlement.firstLetterFree) {
    claimed = await claimFreeTrialSlot(ctx.userId);        // db/users.ts — atomic WHERE free_review_used_at IS NULL
  } else {
    claimed = await incrementLettersUsed(ctx.userId);      // stripe/subscriptions.ts — atomic letters_used < letters_allowed
  }
  if (!claimed) throw TRPCError({ code: "BAD_REQUEST", message: "...race lost..." });

  const letter = await createLetterRequest({ ... });
  await enqueuePipelineJob({ ... });                       // pg-boss via SUPABASE_DIRECT_URL
  return { success: true, letterId: letter.id };
} catch (err) {
  // CRUCIAL: refund usage on post-claim failure
  if (claimed) {
    if (entitlement.firstLetterFree) await refundFreeTrialSlot(ctx.userId);  // db/users.ts
    else                              await decrementLettersUsed(ctx.userId); // db/users.ts — GREATEST(letters_used - 1, 0)
  }
  throw err;
}
```

Key invariants:
- **`incrementLettersUsed`** (`server/stripe/subscriptions.ts`): atomic `UPDATE subscriptions SET letters_used = letters_used + 1 WHERE user_id = ? AND letters_used < letters_allowed RETURNING id`. Returns `false` if the row didn't update (out of allowance or lost race).
- **`claimFreeTrialSlot`** (`server/db/users.ts`): atomic `UPDATE users SET free_review_used_at = NOW() WHERE id = ? AND free_review_used_at IS NULL`.
- **`decrementLettersUsed`** (`server/db/users.ts`): `GREATEST(letters_used - 1, 0)` so it never goes negative.
- `subscriptions` table has **no** `remaining_letters`, `credits_remaining`, or `monthly_allowance` column — only `letters_allowed` and `letters_used`. Flag any code referencing those legacy names.

---

## Key DB Functions (Domain Split)

Database functions live under `server/db/` and are re-exported via `server/db/index.ts`. Stripe-specific helpers live under `server/stripe/`.

| Function | File | Purpose |
|----------|------|---------|
| `upsertUser`, `updateUserRole`, `updateUserProfile` | `db/users.ts` | User identity + role persistence |
| `claimFreeTrialSlot(userId)` / `refundFreeTrialSlot(userId)` | `db/users.ts` | Atomic free-first-letter claim + refund via `free_review_used_at` |
| `decrementLettersUsed(userId)` | `db/users.ts` | Atomic refund of `letters_used` (GREATEST …, 0) |
| `acquirePipelineLock(letterId)` / `releasePipelineLock(letterId)` | `db/users.ts` | Pipeline reentrancy guard on `letter_requests.pipelineLockedAt` |
| `createLetterRequest(data)` | `db/letters.ts` | Creates a letter row at status `submitted` |
| `updateLetterStatus(id, status, ...)` | `db/letters.ts` | Validates against `ALLOWED_TRANSITIONS` in `shared/types/letter.ts` |
| `updateLetterVersionPointers(id, ...)` | `db/letters.ts` | Swaps `currentVersionId` / `finalVersionId` atomically |
| `claimLetterForReview(id, reviewerId)` | `db/letters.ts` | Race-safe attorney claim |
| `createLetterVersion(data)` | `db/letter-versions.ts` | New `ai_draft` / `attorney_edit` / `final_approved` version; `ai_draft` rows are immutable |
| `logReviewAction(data)` | `db/review-actions.ts` | Attorney audit trail — required on every status change |
| `createWorkflowJob` / `updateWorkflowJob` | `db/pipeline-records.ts` | pg-boss job metadata; include `jobType`, `provider`, `status`, token counts, `estimatedCostUsd` |
| `createResearchRun` / `updateResearchRun` | `db/pipeline-records.ts` | Perplexity + OpenAI failover research provenance |
| `incrementLettersUsed(userId)` | `stripe/subscriptions.ts` | Atomic subscription usage claim |
| `checkLetterSubmissionAllowed(userId)` | `stripe/subscriptions.ts` | Centralised entitlement check (subscription or free-first-letter) |

> **Never write raw Drizzle inside a tRPC router.** Routers should call `server/db/*` (and `server/stripe/*`) helpers only. This keeps status-transition, lock, and audit-trail invariants enforced in one place.

---

## Error Handling & Rate Limits

- Always throw `TRPCError` with a specific code (`NOT_FOUND`, `FORBIDDEN`, `BAD_REQUEST`, `UNAUTHORIZED`, `TOO_MANY_REQUESTS`) — never a raw `Error`.
- Rate-limit expensive mutations using `checkTrpcRateLimit(bucket, key, boolean)` from `server/rateLimiter.ts` (e.g., `letters.submit` uses bucket `"letter"` keyed to `user:${ctx.user.id}`).
- `getClientIp(req)` is available for IP-keyed limits on public procedures.

---

## REST Escape Hatches

tRPC v11 covers nearly all client-server calls. The only REST endpoints are:

- `POST /api/auth/signup`, `POST /api/auth/login`
- `POST /api/stripe/webhook` (raw body; signature via `STRIPE_WEBHOOK_SECRET`; idempotency via `processed_stripe_events.event_id` PK)
- `POST /api/pipeline/n8n-callback`
- `GET /api/letters/:id/draft-pdf` (PDF streaming)
- `GET /api/system/health`

All other endpoints live under tRPC at `/api/trpc/*`.

---

## Common Utilities

- `server/_core/trpc.ts` — `router`, `mergeRouters`, `publicProcedure`, `protectedProcedure`, `emailVerifiedProcedure`, `adminProcedure`.
- `server/_core/context.ts` — `createContext` / `TrpcContext` — authenticates requests and exposes `ctx.user` + `ctx.req`.
- `server/_core/admin2fa.ts` — `ADMIN_2FA_COOKIE`, `verifyAdmin2FAToken`.
- `server/routers/_shared.ts` — `attorneyProcedure`, `subscriberProcedure`, `employeeProcedure`, `verifiedSubscriberProcedure`, `intakeJsonSchema`, `getAppUrl`, `syncCodeToWorkerAllowlist`.
- `server/db/index.ts` — barrel export of all data access helpers.
- `server/stripe/subscriptions.ts` — `incrementLettersUsed`, `checkLetterSubmissionAllowed`, `upsertSubscription`, and billing-period sync.
- `server/supabaseAuth/index.ts` — `authenticateRequest`, `verifyToken`, `SUPER_ADMIN_EMAILS`, `invalidateUserCache`.
- `server/rateLimiter.ts` — `checkTrpcRateLimit`, `getClientIp`.
- `shared/types/letter.ts` — canonical `letter_status` enum, `ALLOWED_TRANSITIONS`, `STATUS_CONFIG`, `LEGAL_SUBJECTS`.
- `shared/pricing.ts` — single source of truth for `$299` single, `$299`/mo, `$2,400`/yr, `FIRST_LETTER_REVIEW_PRICE = $50`, `AFFILIATE_DISCOUNT_PERCENT = 20`.
