# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.02 — 2026-08-27

- Fix CRM workspace header logo (`WorkspaceShell.jsx`) still hardcoding the
  pre-crop `500x500` dimensions for the shared logo asset that was cropped to
  `456x254`, causing the browser's default `object-fit: fill` to stretch and
  distort it on every CRM page (`/dashboard`, `/team`, `/admin`).
  `BrandLogo.jsx` already had the correct dimensions; this was a second,
  missed consumer of `SITE.logoPath`.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
