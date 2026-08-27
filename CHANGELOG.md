# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.02 — 2026-08-26

- Close a CRM-kill-switch gap: `middleware.js`'s matcher didn't cover
  `/auth/:path*`, so with `NEXT_PUBLIC_CRM_ENABLED=false` the auth route
  surface (`/auth/confirm`, `/auth/reset-password`, `/auth/callback`,
  `/auth/verify`) stayed reachable and dispatchable as server actions
  (signup, password reset, resend confirmation) even while the CRM was
  supposed to be hidden from production.
- Fix `lib/useUserRole.js` reading the JWT's `app_metadata.role` claim,
  which the supported role-mutation path never writes, instead of
  `profiles.role` like every other authorization check in the app —
  admin-only UI (`/admin/users`, invite, several "New X" affordances) could
  render broken/empty for a real, properly-promoted admin.
- Stop `signUp` from revealing whether an email is already registered — an
  "already registered" error now redirects to the same generic
  `/auth/confirm` outcome as a real signup instead of surfacing the
  distinguishing error message.
- Harden `lib/crmFlag.js`'s `NEXT_PUBLIC_CRM_ENABLED` check against case and
  whitespace variance (`"False"`, `" false "`) so a typo'd value in Vercel's
  dashboard still disables the CRM instead of silently leaving it enabled.
  The fail-open default for a missing/unset variable is unchanged and
  intentional (local dev and preview stay enabled without configuration).
- Add Upstash-Redis-backed rate limiting (`lib/rateLimit.js`) in front of
  `signUp`, `resendConfirmationEmail`, and `requestPasswordReset` — the
  three unauthenticated auth actions that can trigger a Resend send. Inert
  until `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` are set in
  Vercel; see `docs/CRM-OPERATIONS.md`.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
