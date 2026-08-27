# Changelog

Every production deploy of crystalwebsolution.com gets one entry here, newest
first. The version format and rules live in `VERSIONING.md`. The version in
the top entry of this file is always the version currently in production (or
about to be, if the PR hasn't merged yet).

## v1.02 — 2026-08-27

Frontend finishing-touches pass across the marketing site and CRM portal —
no look/feel or functional changes, only coherence and accessibility gaps
closed — plus a brand asset refresh (logo + favicon):

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
- **New brand logo + favicon**: replaced `public/cd-sportswear-usa-logo.png`
  (nav, footer, auth pages, CRM header) and `app/icon.png` (browser-tab
  favicon) with the owner-supplied artwork — a wide icon+wordmark lockup
  for the logo, a standalone icon-only mark for the favicon. Source files
  were cropped to their opaque content bounding box (icon: bbox
  (856,1408)-(3328,2712) of the 4096×4096 source, 10% padding, then padded
  to a square canvas; logo: bbox (92,572)-(2240,904) of the 2304×1536
  source, 4% padding) and resized to 512×512 / 1400×218 masters — keep
  these parameters if a future re-crop from the same source files is ever
  needed. The new logo's aspect ratio (~6.4:1) is much wider than the old
  stacked mark (~1.8:1), so `.nav-logo-art` (`app/globals.css`) and
  `.crm-workspace-brand` (`components/crm/WorkspaceShell.jsx`) were widened
  to fit it at a legible size instead of letterboxing it down to a sliver;
  verified live in a browser at both sizes. `Organization.logo` in the
  homepage JSON-LD (`app/layout.jsx`) now points at the new square icon
  (`SITE.iconPath`) instead of the wide wordmark, since Google's Knowledge
  Panel wants a near-square logo image.

## v1.01 — 2026-08-20

- Adopt the release versioning convention: `VERSION` file, this changelog,
  `VERSIONING.md`, and mandatory rules for all agents in `CLAUDE.md` /
  `AGENTS.md`. First named production deploy.
