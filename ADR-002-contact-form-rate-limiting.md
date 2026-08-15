# ADR-002: Rate Limiting for the Public Contact Endpoint

**Status:** Proposed
**Date:** 2026-08-14
**Deciders:** Moiz Jamil (pending)

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

**Proposed, not yet implemented.** Add request-rate limiting in front of
`/api/contact`, keyed by client IP (and optionally by submitted email), before
any outbound side effect runs. Recommend **Option A** below given this
project's current scale and budget (Vercel + Supabase, no existing Redis/KV
dependency, one contact-adjacent endpoint to protect).

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
- **Easier:** no new dependency or env var to manage for this fix.
- **Harder:** tuning lives in the Vercel dashboard, not version control —
  document the configured rule (window/threshold) here or in
  `docs/CRM-OPERATIONS.md` once set, so it isn't tribal knowledge.
- **Revisit:** if/when CRM write endpoints (task/message creation via Server
  Actions) need rate limiting too, re-evaluate Option C — Server Actions
  aren't reachable by simple edge path rules the same way a REST route is.

## Action Items

1. [ ] Confirm Vercel plan supports Firewall rate-limit rules (Pro or above)
2. [ ] Add a rate-limit rule for `/api/contact` (suggest: 5 requests / 10 min
   per IP as a starting point; tune after observing real traffic)
3. [ ] Document the configured limit in `docs/CRM-OPERATIONS.md`
4. [ ] If Vercel Firewall isn't available on the current plan, fall back to
   Option C (Upstash) rather than Option B (in-memory) — Option B will not
   work correctly on this deployment target
