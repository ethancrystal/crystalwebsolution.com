# Repository Cleanup — 2026-08-02

## Outcome and safety boundary

This cleanup makes the canonical repository leaner without removing or
changing the public site's current design system, CRM behavior, animation
architecture, routes, database contract, or fallback behavior. The same
checkpoint also includes the separately requested `/login` and linked
`/signup` presentation repairs plus the reachable email-helper repair
documented below.

- Canonical checkout: `C:\Users\moizjmj\CD Sportswear USA` on `main`.
- Cleanup base: `c5a922f91b460f1a4aa73db2839d08c0cfc9a728`.
- `origin/main` resolved to that same commit immediately before cleanup.
- The exact removal/restoration manifest, including the late worktree addendum,
  was explicitly approved before destructive work began.
- No merge, rebase, cherry-pick, branch deletion, stash deletion, deployment, or
  live database mutation was performed.

## Removed

### Generated and local residue

| Path | Evidence | Result |
| --- | --- | --- |
| `.next/` | Ignored production output; 2,791 files / 1,094,031,829 bytes before cleanup | Rebuilt for verification, then removed again |
| `.playwright-mcp/` | Ignored browser logs/snapshots; 16 files / 261,458 bytes | Removed |
| `_to_delete/git-stale-locks/` | Six zero-byte stale locks plus temporary Git objects; 16 files / 5,109 bytes | Removed |
| `.iteration/`, `.refframes/`, `assets/` | Empty untracked containers | Removed |
| `.claude/worktrees/suspicious-moore-190bc1` | Clean; zero unique commits; one commit behind `main` | Worktree removed; branch ref retained |

The complete earlier worktree audit, preserved branch heads, stash commits,
and recovery commands are documented in
[`WORKTREE-STATE.md`](WORKTREE-STATE.md).

### Runtime-unreachable source

Reference tracing found no live importer, route use, test contract, public-URL
consumer, build hook, or script invocation for these 12 files:

- `components/BorderGlow.jsx`
- `components/GlyphMask.jsx`
- `components/RevealPop.jsx`
- `lib/cardMouseGlow.js`
- `lib/clients.js`
- `lib/pinnedRanges.js`
- `lib/crm/companies.js`
- `lib/crm/contacts.js`
- `lib/crm/deals.js`
- `app/admin/tasks/actions.js`
- `lib/crm/tasks.js`
- `scripts/validate-phase1.mjs`

The earlier inventory summary said 13; the enumerated and reverified manifest
contains 12 paths. No unlisted thirteenth file was removed.

Ninety-three associated dead CSS lines were removed from `app/globals.css`:
`.motion-card-glow`, `.border-glow*`, `.glyph-mask*`, and their obsolete
comments/overrides. Live `.motion-card` rules were preserved.

### Dependency and local configuration residue

- Removed unused direct declarations for `shadcn` and `caniuse-lite`.
- Regenerated `pnpm-lock.yaml` with pinned pnpm 10.33.4, pruning the orphaned
  shadcn CLI graph. `caniuse-lite` remains transitively through Next.js.
- A local `pnpm prune` attempt timed out while rebuilding `node_modules` under
  the restricted Windows runner. The tree was immediately restored from the
  frozen lockfile and local pnpm store; the orphaned `shadcn@4.15.0` virtual
  store directory and binary are now absent, while all 18 declared top-level
  packages remain installed.
- Removed unused `RESEND_FROM_EMAIL` from `.env.example`.
- Added `.claude/settings.local.json` to `.gitignore`; the local file is not
  application state and was not committed.

### Rejected migration alternatives

- Removed untracked `0009_safe_project_realtime_crm.sql`: it collided with
  canonical version `0009` and mixed incompatible legacy/canonical schemas.
- Removed untracked `0009b_drop_legacy_project_message_tables.sql` and
  `0009c_canonical_project_schema.sql`: their nonnumeric versions are skipped
  by the Supabase CLI; the first also represented a destructive ad-hoc live
  operation already recorded in `STATUS.md`.
- Restored `0007_notes_creation_scoping.sql` byte-for-byte to `HEAD`. Live
  history intentionally skipped it because `0008` supersedes its policy intent.
- Retained canonical `0009_project_realtime_crm.sql`,
  `0010_project_workspace.sql`, and
  `0011_workspace_hardening_from_main.sql` unchanged.

## User-requested auth presentation and email repairs

- Reduced the `/login` and linked `/signup` CWS images' intrinsic fallbacks from
  647×255 to 160×63 and placed each in a centered, padded 11rem responsive
  wrapper. The complete logos now stay inside their cards even if component CSS
  loads late.
- Corrected styled-jsx scoping only for the Next Link-rendered logo and portal
  anchors. This restores the intended bordered Client, Employee, and Admin
  controls plus visible keyboard focus treatment.
- Preserved the existing SVG, card/form design, copy, three destination routes,
  signup/password links, portal-role mapping, and auth action flow.
- Added the missing generic `sendEmail({to, subject, html})` export already used
  by signup confirmation, password reset, and staff-invite actions. The legacy
  `sendInviteEmail` helper now delegates to the same fixed sender/client/error
  boundary. Executable tests verify both exports and fail-closed behavior when
  `RESEND_API_KEY` is absent; no live email or account mutation was attempted.
- Added a regression contract in `tests/crm/auth-portals.test.mjs` and verified
  the rendered chooser at the browser's default 1280×720 viewport plus a
  390×844 mobile layout measurement. The card/logo stayed contained, all three
  controls rendered, navigation reached `/login/client`, and no console error
  or horizontal overflow appeared.

## Deliberately retained

- The single R3F Canvas, Lenis/GSAP clock, camera journey, procedural scene,
  reduced-motion behavior, and all public routes/components currently rendered.
- The current Lab DOM/CSS-3D carousel (labelled "CWS in Motion"), its shared
  layout/flight modules and tests, and all static/legacy/compact fallbacks.
  `components/three/FlyingCarousel.jsx` was retained by the approved manifest
  as dormant recovery/reference code; it has no current runtime importer.
- All CRM routes, bounded server actions, read models, auth middleware, canonical
  migrations, RLS contracts, Storage/Realtime contracts, and planned
  Playwright gate (the `tests/e2e` suite is not yet checked in).
- `node_modules/`, so the checkout remains immediately runnable.
- All branch refs and all recovery stashes.
- `.vercel`, `.mcp.json`, agent/skill definitions, historical audits/plans,
  procedural source assets, and every served `public/` brand/compatibility URL.

## Verification evidence

| Gate | Result |
| --- | --- |
| `pnpm test:crm` | 59/59 passed |
| `pnpm test` | 110/110 passed |
| `pnpm build` | Passed; Next.js 15.5.22 generated all 43 pages |
| Migration filename audit | 11/11 valid numeric filenames; zero duplicate versions |
| Live Supabase read-only check | Canonical 0009/0010/0011 present; 18 public CRM tables present with RLS enabled |
| Desktop browser | Homepage, Services, Lab flight/grid, Motion selected-work rail, menu open/close; one Canvas, no overflow/overlay/errors |
| Mobile browser (390×844) | Homepage and Lab fallback; no horizontal document overflow or console errors |
| CRM browser | Polished portal picker at desktop/mobile; logo and three controls contained; Client Portal navigation exposed unique email/password/Sign In controls; no submission or mutation |
| `git diff --check` | Passed |

`pnpm test:db` could not connect because the local Supabase/Docker Desktop stack
was not running (`dockerDesktopLinuxEngine` was unavailable). The source/SQL
contracts and live migration/table inventory were checked read-only, but the
local executable role matrix remains a future environment-dependent gate.
`pnpm test:e2e` remains a planned release command; no `tests/e2e` suite or
Playwright configuration is currently checked in, so the in-app browser smoke
matrix above is the executable browser evidence for this cleanup.

Pre- and post-cleanup browser captures were kept outside the repository under
the local temporary directories `cws-cleanup-baseline` and `cws-cleanup-post`.
They show the same design system and responsive surfaces; animation phase and
WebGL frame naturally vary between captures.

## Current operational notes

- `notifications_outbox` is populated by project actions, but
  `app/api/cron/crm-notifications/route.js` remains a protected stub. No email
  delivery should be claimed until that worker is implemented.
- Authenticated multi-role browser E2E still requires approved test accounts and
  a running database environment. This cleanup did not provision users or send
  invitations.
- Before future cleanup, search imports, routes, framework convention files,
  `public/` URLs, tests, migrations, Docker, scripts, and agent tooling. Missing
  documentation alone is not proof that a file is unused.
