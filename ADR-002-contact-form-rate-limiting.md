# ADR-002: Rate Limiting for the Public Contact Endpoint

**Status:** Implemented (Option C) — 2026-08-27
**Date:** 2026-08-14
**Deciders:** Moiz Jamil

**Update, 2026-08-27:** Implemented as Option C (Upstash Redis), not Option A.
The owner did not confirm Vercel Plus/Pro Firewall availability, and Option C
also covers `signUp`/`resendConfirmationEmail`/`requestPasswordReset` in
`app/auth/actions.js` — those are Server Actions, which Option A's edge rule
cannot reach at all (see the original "Revisit" note below). Implementation:
[`lib/rateLimit.mjs`](lib/rateLimit.mjs), wired into
[`app/api/contact/route.js`](app/api/contact/route.js) and
[`app/auth/actions.js`](app/auth/actions.js). The contact endpoint uses a
sliding window of 5 requests per 10 minutes per IP. The three auth actions use
the same window independently for both client IP and normalized submitted
email, preventing address rotation from one IP and IP rotation for one
address.
Fails open (no throttling) until `UPSTASH_REDIS_REST_URL` and
`UPSTASH_REDIS_REST_TOKEN` are set — create a free Upstash Redis database and
add both as environment variables in Vercel to activate it. A Vercel
Firewall rule (Option A) can still be added later as a defense-in-depth
layer in front of `/api/contact` specifically; it isn't required now that
Option C covers the endpoint.

## Context

`POST /api/contact` ([app/api/contact/route.js](app/api/contact/route.js)) is unauthenticated by
design — it's the marketing site's project-brief form, open to anyone. On a
valid submission it does up to three outbound actions per request:

1. Forwards the brief to `CONTACT_WEBHOOK_URL` (if configured).
2. Sends a notification email via Resend to the operations address.
3. Sends an acknowledgement email via Resend back to the submitter's address.

The only anti-abuse control today is `validateContactForm`
([lib/contactForm.mjs](lib/contactForm.mjs)) — schema/shape validation plus a
honeypot field (`rejectedAsSpam`). There is no rate limiting, no CAPTCHA, and
no per-IP or per-email throttling anywhere in front of this route or in
`middleware.js` (which only runs on CRM/auth paths, not `/api/contact`).

A scripted flood of POSTs — trivial against an open endpoint with no
honeypot-evasion cost — would: burn through the Resend sending quota/plan
limit, spam the operations inbox and third-party webhook, and (if the
submitted email address is attacker-controlled or spoofed) send unlimited
acknowledgement emails to arbitrary third parties, which is also a
reputation/deliverability risk for the sending domain.

This isn't hypothetical for a live marketing site — contact-form endpoints
are a standard scraping/bot target and this one has no cost to attempt.

## Decision

**Option C is selected and implemented.** Add request-rate limiting in front
of `/api/contact` and the unauthenticated auth actions, before any outbound
side effect runs. The shared Upstash implementation uses per-IP limiting for
the contact endpoint and independent per-IP plus normalized-email limiting
for the auth actions. Option A remains a possible defense-in-depth layer for
`/api/contact`, but it is not the application’s source of truth.

## Options Considered

### Option A: Vercel Firewall / Edge rate-limit rule (recommended)
| Dimension | Assessment |
|---|---|
| Complexity | Low — configured in Vercel dashboard/`vercel.json`, no app code |
| Cost | Free tier on Vercel Pro; none on top of existing hosting |
| Scalability | Handled at the edge, before the function even runs |
| Team familiarity | None required — declarative rule, not a library |

**Pros:** Zero new runtime dependency, blocks abuse before it reaches
Next.js/Resend at all, easy to tune (requests/window per IP) from the
dashboard without a deploy. Matches "let the platform you're already paying
for do this" instead of adding infrastructure.
**Cons:** Requires Vercel Pro (or equivalent) for custom firewall rules on
Hobby; tied to the Vercel platform (acceptable — this project is already
Vercel-committed per `CLAUDE.md`'s deploy strategy).

### Option B: In-memory token bucket in the route handler
| Dimension | Assessment |
|---|---|
| Complexity | Low-Medium — a small module, no external service |
| Cost | None |
| Scalability | **Breaks under Vercel's serverless model** — each invocation may hit a cold instance with no shared memory, so the bucket doesn't actually persist across requests |
| Team familiarity | High |

**Pros:** No new dependency, fully in-repo.
**Cons:** Silently ineffective on serverless — this is the standard footgun
of "just add a Map()" rate limiting on Vercel. Would give false confidence.
Not recommended for this deployment target.

### Option C: Upstash Redis + `@upstash/ratelimit`
| Dimension | Assessment |
|---|---|
| Complexity | Medium — new dependency, new env vars, new external service |
| Cost | Free tier exists, but it's one more account/service to operate |
| Scalability | Correct under serverless (shared external state) |
| Team familiarity | Medium |

**Pros:** The standard, correct pattern for serverless rate limiting when you
need fine-grained logic (sliding window, per-email + per-IP composite keys,
limits shared across multiple routes).
**Cons:** Overkill for protecting a single low-traffic form endpoint today;
adds an operational dependency this project doesn't otherwise have. Revisit
if rate limiting needs to extend to authenticated CRM endpoints too (at that
point the shared-state requirement across more routes justifies it).

## Trade-off Analysis

The real risk here is cost/reputation abuse of a single public endpoint, not
a general need for a rate-limiting *service* across the app. Option A solves
that directly, at the edge, for free (on the Vercel tier this project should
already be considering for the CRM launch), with no code to maintain. Option
C is the right long-term answer if rate limiting later needs to cover
authenticated CRM write paths (task creation, message posting) — worth
revisiting then, not now.

## Consequences

- **Easier:** abuse of the contact form stops costing Resend sends / ops
  inbox noise before it reaches application code.
- **Easier:** the shared helper covers the contact route and Server Actions
  without duplicating an in-memory limiter across deployment instances.
- **Harder:** Upstash credentials are an additional deployment dependency and
  tuning remains application configuration rather than a Vercel dashboard
  rule. Operational details are documented in `docs/CRM-OPERATIONS.md`.
- **Revisit:** if authenticated CRM write endpoints need different budgets,
  add explicit action buckets and tests rather than weakening the existing
  unauthenticated limits.

## Action Items

1. [x] ~~Confirm Vercel plan supports Firewall rate-limit rules (Pro or
   above)~~ — superseded; implemented Option C instead (see update above)
2. [x] Add a rate-limit rule, 5 requests / 10 min per IP, per endpoint —
   implemented in code (`lib/rateLimit.mjs`) rather than as a Vercel Firewall
   rule; tune the `limit`/`windowSeconds` in each call site after observing
   real traffic
3. [ ] Create an Upstash Redis database and set `UPSTASH_REDIS_REST_URL` /
   `UPSTASH_REDIS_REST_TOKEN` in Vercel's Production environment — without
   these, the code fails open (no throttling), matching pre-fix behavior
4. [x] ~~If Vercel Firewall isn't available on the current plan, fall back to
   Option C (Upstash) rather than Option B (in-memory)~~ — done; Option C
   was implemented directly
5. [x] Document the configured limit in `docs/CRM-OPERATIONS.md`; provisioning
   the Upstash database remains a separate deployment action
