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

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
