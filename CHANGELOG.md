# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.02 — 2026-08-26

Frontend finishing-touches pass across the marketing site and CRM portal —
no look/feel or functional changes, only coherence and accessibility gaps
closed:

- **Reviews page**: every client review card now enters with the same
  staggered `SectionReveal` treatment every sibling list page (blog, work)
  already has — previously the archive heading revealed but the review
  cards themselves had zero entrance animation.
- **`ServiceEmblem.jsx`**: the default SVG service glyphs (used on
  `/services`) now gate their SMIL `<animate>`/`<animateTransform>`/
  `<animateMotion>` elements on `prefers-reduced-motion`, matching the
  gating its 3D sibling (`ServiceEmblem3D.jsx`) already had. These
  animations run outside CSS, so the existing reduced-motion media query
  couldn't reach them before.
- **`/work/[slug]`**: case-study pages were rendering at `max-width: 1200px`
  instead of the `1248px` (`.mkt-inner`) every sibling detail/index page
  uses — a missing class, not a deliberate choice. Fixed.
- **CRM loading states**: replaced the last plain-text `"Loading..."` blocks
  across ~20 CRM pages (admin/dashboard/team detail, edit, new, workspace,
  and one list page STATUS.md's prior audit had missed) with the
  already-built `Spinner`/`Skeleton` components (`LoadingState` for
  dashboards/workspaces/kanban, `SkeletonDetail` for record forms,
  `SkeletonTable` for the missed list page), finishing the loading-state
  pass documented as in-progress since PR #52.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
