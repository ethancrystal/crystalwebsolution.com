# ADR-001: Login and Signup Flow Architecture

**Status:** Accepted — implemented 2026-07-23
**Date:** 2026-07-23
**Deciders:** Moiz Jamil

## Context

The CRM auth flow (`app/login`, `app/signup`, `app/auth/actions.js`, `middleware.js`, `lib/supabase/*`) merged via PR #27 and was verified end-to-end against a live Supabase project in this session. The core mechanics work: signup creates an `auth.users` row, the `handle_new_user` trigger correctly seeds a `profiles` row from `app_metadata` (not the user-writable `user_meta_data` — the security-critical fix called out in the original commit), and a confirmed user reaches `/dashboard` with the right role.

That verification also surfaced gaps between "auth flow exists" and "auth flow is perfect":

1. **Two parallel auth implementations.** `app/auth/actions.js` (Server Actions: `signIn`, `signUp`, `signOut`) is what the UI actually calls. `app/api/auth/{signup,login,logout}/route.js` duplicate the same logic as REST endpoints but are called by nothing in this repo — dead surface area that will drift out of sync with the Server Actions version (already has: API route's signup doesn't `redirect`, doesn't share the confirm-page fix).
2. **Missing `/auth/confirm` route** — signup redirected to a page that didn't exist (fixed this session).
3. **No password-reset flow.** No "Forgot password?" link, no `resetPasswordForEmail` call, no reset-confirmation page. This is a hard requirement for any real login flow, not an enhancement.
4. **No resend-confirmation affordance.** If a confirmation email is lost, rate-limited, or expires, the user has no way to request a new one from the UI — their only option is to attempt signup again (which will fail: Supabase rejects duplicate email signups).
5. **Raw Supabase error strings surfaced to users.** Errors like `"email rate limit exceeded"` or `"Email not confirmed"` render verbatim (`app/login/page.jsx`, `app/signup/page.jsx`) — accurate but not something to ship to end users.
6. **Middleware has no fail-fast for missing env vars.** With `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` unset, every matched route 500s with a raw Supabase SDK stack trace instead of a clear "auth not configured" message — this is a local-dev/deploy-misconfiguration failure mode, not a user-facing one, but it's still an unhandled crash.
7. **No client-side password strength/confirmation check** — `app/signup/page.jsx` relies solely on the native `type="password"`/`required` attributes; Supabase's own minimum-length rule is the only enforcement, surfaced only after a round-trip.

## Decision

Consolidate on **Next.js Server Actions as the single auth interface**, matching what's already live and tested, and close the four functional gaps (password reset, resend confirmation, friendly errors, env fail-fast) needed for the flow to be complete rather than merely functional. Retire the unused `app/api/auth/*` REST routes unless there's a concrete external consumer (mobile app, third-party integration) that needs them — confirm with the reference-check phase, don't delete speculatively.

This keeps one code path for auth logic (`app/auth/actions.js`), which is the pattern Supabase's own Next.js App Router guidance recommends, and avoids the two-implementations-drift-apart problem already visible in gap #1.

## Options Considered

### Option A: Server Actions only (recommended)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Low — one auth code path, forms call it directly, no fetch/JSON boilerplate |
| Cost | None |
| Scalability | N/A — auth logic is stateless per-request against Supabase |
| Team familiarity | High — matches existing `app/login`, `app/signup` pages already in production |

**Pros:** Already proven live in this session; progressive-enhancement friendly (`<form action={...}>` works without JS); smallest diff from current state.
**Cons:** Not directly callable by a non-browser client (mobile app, CLI, webhook) without a separate API surface.

### Option B: REST API routes only (`app/api/auth/*`)
| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — every auth action needs manual `fetch` + JSON handling + error mapping in the client |
| Cost | None |
| Scalability | Same as A |
| Team familiarity | Medium |

**Pros:** Usable by any HTTP client, not just this Next.js app.
**Cons:** Would require rewriting `app/login/page.jsx` and `app/signup/page.jsx` to drop the Server Action calls — a larger diff to converge on the *less* battle-tested path. No current requirement (mobile app, external integration) justifies this today.

### Option C: Keep both (status quo)
**Pros:** No migration work.
**Cons:** This is gap #1 — two implementations of signup already differ (only the Server Action version redirects to `/auth/confirm`). Every future auth change (rate-limit messaging, MFA, etc.) has to be made twice or silently drifts. Confusing for anyone picking this up cold, including on the other machine this was originally built on.

## Trade-off Analysis

The only reason to keep `app/api/auth/*` is a non-browser consumer that doesn't exist yet. Until one does, Option C's maintenance cost (two implementations, one already diverged) outweighs Option B's theoretical flexibility. If a mobile client or webhook shows up later, add a thin REST wrapper around the same Supabase calls at that point — don't carry unused surface area now.

## Consequences

- **Easier:** one place to add MFA, social login, or rate-limit-aware messaging later.
- **Easier:** no risk of the REST routes silently serving a stale/insecure version of signup (they currently lack the redirect-based confirm flow entirely).
- **Harder:** if a non-browser client shows up, someone has to build that surface fresh rather than finding it already there (acceptable — build it against real requirements, not speculatively).
- **Revisit:** if TTML-style patterns (tRPC, mobile clients) get added to this project later, re-evaluate whether Server Actions remain sufficient.

## Action Items

1. [x] Confirm no external consumer needs `app/api/auth/{signup,login,logout}` — none found in-repo; deleted
2. [x] Add `resetPasswordForEmail` server action + `/forgot-password` page + `/auth/reset-password` confirmation page
3. [x] Add "Resend confirmation email" action + affordance on `/auth/confirm` and on the "Email not confirmed" login error state
4. [x] Map known Supabase auth error messages to friendly copy (`lib/auth-errors.js`); fall back to the raw message for anything unmapped
5. [x] Add a fail-fast check at the top of `middleware.js` for missing Supabase env vars — logs a warning and skips auth checks instead of crashing
6. [x] Add client-side password confirmation field + minimum-length hint to `app/signup/page.jsx`

**Also added, discovered as a dependency of #2/#3:** `app/auth/callback/route.js` — a PKCE code-exchange handler. Without it, the email links Supabase sends for both signup confirmation and password reset would land on a page with no session ever established (a `code` query param that nothing exchanges). This was a latent gap in the original flow, not just in the new reset-password addition.
