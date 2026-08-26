# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.02 — 2026-08-26

- Replace the site logo and favicon with the new brand mark: `public/cd-sportswear-usa-logo.png`
  (nav/CRM wordmark) and `app/icon.png` (favicon) now use the new artwork,
  resized to 1.5:1 and 1:1 respectively. Corrected the `width`/`height`
  hints on every `SITE.logoPath` consumer (nav, login, signup, CRM
  workspace shell) to match the new logo's aspect ratio.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
