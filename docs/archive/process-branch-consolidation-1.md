---
goal: Consolidate all open marketing/CRM/SEO PRs into `preview`, sync `preview` into `main`, and leave `production` untouched as the live no-CRM Vercel deploy
version: 1.0
date_created: 2026-08-08
owner: Hermes (agent session working `.hermes/` SEO remediation on this repo)
status: 'Planned'
tags: [process, merge, branch-consolidation, seo, crm, marketing]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Six branches of work are currently in flight against this repo: four merge-ready
or near-ready marketing PRs, one CRM notifications PR, one stale/superseded PR,
and one uncommitted SEO remediation pass sitting in the working tree with no
branch or PR of its own yet. This plan sequences all of it into `preview` —
the repo's single active integration branch — verifies it there, then syncs
`preview` into `main`. **`production` (the branch Vercel currently serves live,
with `NEXT_PUBLIC_CRM_ENABLED` unset for that environment) is explicitly out of
scope and must not receive any of this work** until a separate, deliberate
promotion decision is made by the owner.

This plan does not invent new feature work. It only sequences and verifies
work that already exists as commits or as an uncommitted working tree, per
`CLAUDE.md`'s environment model (`preview` = full implementation incl. CRM,
`production` = same code with CRM hidden by an env flag, promoted only via a
reviewed PR/merge on GitHub — never `vercel --prod`).

**⚠️ Critical finding, established via the Vercel MCP before this plan was
finalized — read before executing Phase 8:** `CLAUDE.md`'s documented model
says the `production` *git branch* is what Vercel serves live. It is not.
Every deployment in this project's Vercel history with `"target":
"production"` has `githubCommitRef: "main"` — Vercel's actual configured
Production Branch is `main`, not a branch literally named `production`. The
`production` git branch may be disconnected from what's actually live at
`www.crystalwebsolution.com`. This directly threatens Phase 8 (`preview` →
`main`): merging there is exactly the action that would trigger a live
production deploy, including all of PR #60's CRM code, regardless of
`NEXT_PUBLIC_CRM_ENABLED` gating client-side visibility. TASK-028a below
gates Phase 8 on resolving this before any merge into `main` happens.

## 1. Requirements & Constraints

- **REQ-001**: All marketing/CRM PR work lands on `preview` before any of it reaches `main`. Nothing merges directly into `production`.
- **REQ-002**: The current uncommitted working-tree SEO changes (`app/layout.jsx`, `app/robots.js`, `app/sitemap.js`, `app/services/[slug]/page.jsx`, `app/reviews/page.jsx`, `app/work/[slug]/page.jsx`, `components/BrandLogo.jsx`, `components/sections/Hero.jsx`, `lib/site.js`, `next.config.js`, `lib/seo.mjs`, `components/marketing/BreadcrumbSchema.jsx`, `app/opengraph-image.jsx`, the new `login`/`signup`/`forgot-password` `layout.jsx` files) must become their own branch and PR — they must never be committed onto `agent/crm-notifications-and-messaging` (PR #60), which is CRM-scoped.
- **REQ-003**: `.hermes/desktop-attachments/*` (Screaming Frog crawl CSVs, zips, extracted bundles) and `.hermes/tmp/*` (OG-preview scratch PNG + `ogcheck.py`) are working artifacts, not product code — they must be excluded from every commit (add `.hermes/` to `.gitignore` if not already ignored), never pushed.
- **REQ-004**: PR #63 (`claude/plan-implementation-d57j5t` → `main`) must not be merged as-is — see FIN-001. It requires an explicit triage decision (salvage-and-reimplement vs. close) before touching `app/work/[slug]/page.jsx` or `app/reviews/page.jsx`.
- **REQ-005**: `production` must remain pinned at its current commit (`11d69b1`, "feat(crm): production/preview split via NEXT_PUBLIC_CRM_ENABLED (#56)") for the duration of this plan. No task in this plan touches the `production` branch or ref.
- **REQ-006**: Supabase migration `0015_project_notifications_and_message_editing.sql` (part of PR #60) requires the owner's explicit one-time approval to `apply_migration` against the live database — this is a live-DDL write the Claude Code auto-mode permission classifier blocks by design. Merging PR #60's code does not apply the migration; treat these as two separate gates.
- **CON-001**: Package manager is `pnpm` only (`pnpm-lock.yaml` present) — do not introduce npm/yarn commands anywhere in this sequence.
- **CON-002**: No lint script exists in `package.json` — do not add one as part of this consolidation.
- **CON-003**: `pnpm test`, `pnpm build` must pass after every branch merges into `preview` before the next branch merges — do not stack an unverified merge under another.
- **CON-004**: Never run `vercel --prod` or `vercel deploy --prod` at any point in this plan — Vercel's CLI ignores branch state and deploys straight to the production alias, bypassing the entire branch strategy this plan protects.
- **GUD-001**: Per `STATUS.md`'s documented PR #49/#50 collision incident, before starting any task that touches a file also touched by a not-yet-merged PR, re-run `git branch -a` / `gh pr list` to confirm that PR's state hasn't changed since this plan was written — PR numbers, base branches, and mergeable status are a snapshot as of 2026-08-08.
- **GUD-002**: Keep marketing/SEO work and CRM work in separate commits/PRs even when they touch overlapping shared files (e.g. `vercel.json`, `app/globals.css`) — resolve as merge conflicts at PR-merge time, not by hand-merging concerns into one branch.
- **PAT-001**: Follow the existing stacked-PR convention already used by #58/#62: merge the top of a stack into its immediate parent branch first, then merge the (now-updated) parent into `preview`, rather than merging both independently into `preview`.

## 2. Implementation Steps

### Implementation Phase 1: Re-verify branch/PR state

- GOAL-001: Confirm the snapshot this plan was built from (2026-08-08) still holds before changing anything, per GUD-001.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-001 | Run `git fetch origin --prune`, `git branch -a`, `gh pr list --state open --json number,title,baseRefName,headRefName,mergeable,isDraft`. Diff the result against this plan's PR table (Section 5). If any PR listed here is now merged, closed, or has a new base branch, stop and re-scope the affected phase before proceeding. | | |
| TASK-002 | Confirm `production` is still at commit `11d69b1` (`git log -1 production`). If it has moved, stop — someone else promoted it; do not proceed until you understand why. | | |
| TASK-003 | Confirm the uncommitted working-tree state described in REQ-002 is still present and unchanged (`git status --short` on `agent/crm-notifications-and-messaging`, or wherever it currently lives). | | |

### Implementation Phase 2: Land the marketing-identity stack (#62 → #58 → preview)

- GOAL-002: Merge the About/Services/Contact/Process identity work and its entrance-reveal polish into `preview`, in stack order.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-004 | Merge PR #62 (`agent/marketing-inner-pages-polish` → `agent/marketing-inner-pages`) first — it is a stacked child of #58 and must land in its parent branch, not `preview`, to preserve commit order. | | |
| TASK-005 | On the local `agent/marketing-inner-pages` branch, pull the merge from TASK-004, run `pnpm test` and `pnpm build`. Both must pass before proceeding. | | |
| TASK-006 | Merge PR #58 (`agent/marketing-inner-pages` → `preview`) — this now carries #62's commits with it. Use a merge commit (not squash) so #62's authorship/history is preserved, matching this repo's existing merge-commit convention (`git log --oneline` shows "Merge pull request #N" commits throughout). | | |
| TASK-007 | On `preview`, run `pnpm test` and `pnpm build`. Both must pass. This is now the new baseline every later phase rebases against. | | |

### Implementation Phase 3: Land the case-study narrative work (#61 → preview)

- GOAL-003: Merge the case-study gallery/narrative-beats work into `preview` now that its target files' baseline has moved (TASK-006 changed `app/work/[slug]/page.jsx` via #62's content).

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-008 | Mark PR #61 (`claude/marketing-inner-pages-service-n3t3qm` → `preview`) ready for review (currently draft) once its content is confirmed current — it already contains #58's and the CRM-cron-fix commit in its own history (verified via `git log`), so no rebase should be structurally necessary, but GitHub will still require conflict resolution against #62's changes to `app/work/[slug]/page.jsx` and `app/work/page.jsx` since both PRs touch those files independently. | | |
| TASK-009 | Resolve any merge conflicts in `app/work/[slug]/page.jsx`, `app/work/page.jsx`, `app/about/page.jsx`, `app/contact/page.jsx`, `app/process/page.jsx`, `app/services/page.jsx`, `app/globals.css` by keeping both sides' additive changes (PR #61 adds `CaseGallery`/`CaseNavRail`/narrative beats; PR #62 adds `SectionReveal` entrance animation) — these are not competing implementations of the same feature, they are two additive layers on the same files. | | |
| TASK-010 | Merge PR #61 into `preview`. Run `pnpm test` and `pnpm build` on `preview`. Both must pass. | | |

### Implementation Phase 4: Land CRM notifications, message editing, and PM assignment (#60 → preview)

- GOAL-004: Merge the CRM notification/messaging/assignment work into `preview`. This phase is independent of Phases 2–3's marketing content changes (no file overlap per `gh pr diff` — PR #60 only shares already-inherited marketing files with #58, not new conflicts), so it can proceed once Phase 3 completes.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-011 | Merge PR #60 (`agent/crm-notifications-and-messaging` → `preview`). Because this branch already contains #58's commits in its own history, expect little or no diff on the shared marketing files — only `STATUS.md`, `app/actions/project-actions.js`, `app/admin/projects/[id]/page.jsx`, `components/crm/ProjectThread.jsx`, `lib/crm/projects.js`, `docs/plans/feature-crm-website-completion-1.md`, `supabase/migrations/0015_*.sql`, `vercel.json`, and **`app/globals.css`** (touched independently by #58/#60, then again by #61 and #62 in Phases 2–3 — this is the single most likely real conflict in this merge; resolve additively, same as TASK-009) should show real conflicts, if any. | | |
| TASK-012 | Run `pnpm test` and `pnpm build` on `preview`. Both must pass. | | |
| TASK-013 | **Do not** attempt to apply migration `0015_project_notifications_and_message_editing.sql` as part of this task — that is a live-database write gated separately by REQ-006. File a clear, separate note to the owner (in this plan's Section 7 risk log or a follow-up message) that the migration is merged in code but not yet live, so notifications/message-editing/Realtime remain inert until it's applied. | | |

### Implementation Phase 5: Extract and land the Hermes SEO remediation as its own PR

- GOAL-005: Turn the currently-uncommitted SEO/schema/security-header working-tree changes into a standalone branch and PR, rebased onto the `preview` baseline established by Phases 2–4, and merge it.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-014 | Add `.hermes/` to `.gitignore` (root) **first, before touching the working tree** — do this on whatever branch currently holds the uncommitted changes. Confirm `git status --short` no longer lists any `.hermes/desktop-attachments/*` or `.hermes/tmp/*` paths as untracked. Never `git add` those paths. | | |
| TASK-015 | Only after TASK-014's `.gitignore` is in place, stash with `git stash push -u` (the `-u` is required — plain `git stash` does not move untracked files, and every new SEO file is untracked: `lib/seo.mjs`, `components/marketing/BreadcrumbSchema.jsx`, `app/opengraph-image.jsx`, the five new `login`/`signup`/`forgot-password` `layout.jsx` files). Then `git checkout preview && git pull && git checkout -b seo/screaming-frog-remediation` off the **post-Phase-4** `preview` tip, and `git stash pop` there. If the original branch has diverged too far for a clean pop, fall back to a manual diff-and-reapply instead. | | |
| TASK-016 | Reconcile `app/reviews/page.jsx` and `app/work/[slug]/page.jsx` by hand: these files now carry PR #61's narrative-beats/gallery content (post-Phase-3) *and* the uncommitted `BreadcrumbSchema`/`Review`/`CreativeWork` JSON-LD additions from the working tree. Merge both sets of changes into one file per route — do not let either side silently overwrite the other. | | |
| TASK-017 | Stage and commit only product-code files: `app/layout.jsx`, `app/robots.js`, `app/sitemap.js`, `app/services/[slug]/page.jsx`, `app/reviews/page.jsx`, `app/work/[slug]/page.jsx`, `components/BrandLogo.jsx`, `components/sections/Hero.jsx`, `lib/site.js`, `next.config.js`, `lib/seo.mjs`, `components/marketing/BreadcrumbSchema.jsx`, `app/opengraph-image.jsx`, `app/login/layout.jsx`, `app/login/admin/layout.jsx`, `app/login/client/layout.jsx`, `app/login/employee/layout.jsx`, `app/signup/layout.jsx`, `app/forgot-password/layout.jsx`, `app/login/page.jsx`, `app/signup/page.jsx`. Use a commit message describing the Screaming Frog findings being addressed (canonical host, structured data, security headers, alt text, robots disallow rules), not "misc SEO fixes". | | |
| TASK-018 | Push the branch, open a PR against `preview` (not `main`, not `production`), title it clearly (e.g. `fix(seo): canonical host, structured data graph, security headers, a11y alt text`), and reference the Screaming Frog crawl date/source in the PR body for traceability. | | |
| TASK-019 | Run `pnpm test` and `pnpm build` on the new branch before requesting merge. Both must pass. | | |
| TASK-020 | Browser-verify: `/`, `/services/[any-slug]`, `/work/[any-slug]`, `/reviews` render their `<script type="application/ld+json">` blocks without throwing (check `Number.isNaN`-guarded `isoDate` doesn't silently drop real review dates), confirm `next.config.js`'s CSP `connect-src` still allows the Supabase origin so login/CRM isn't broken by the new headers, and confirm the new OG image (`app/opengraph-image.jsx`) renders using the `.hermes/tmp/og-preview.png` + `ogcheck.py` verification already done as a sanity check, not as the final proof. | | |
| TASK-021 | Merge the SEO PR into `preview`. Run `pnpm test` and `pnpm build` on `preview` one final time — this is the last branch landing in this plan before Phase 7's full verification pass. | | |

### Implementation Phase 6: Triage PR #63 (do not merge as-is)

- GOAL-006: Resolve PR #63 without introducing an architecture regression — see FIN-001 in Section 7.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-022 | Confirm FIN-001: `claude/plan-implementation-d57j5t` (PR #63's head) branched from `main` before the `components/marketing/*` shell refactor (PR #57) landed on `preview`. It still references root-level `components/SubpageNav.jsx`/`components/SubpageShell.jsx`, which no longer exist on `preview` — merging it would reintroduce a superseded component structure alongside the current `components/marketing/MarketingShell.jsx`/`SubpageNav.jsx`. | | |
| TASK-023 | Review PR #63's diff for content genuinely not yet covered by Phases 2–5 — candidates: `components/seo/SeoLongform.jsx`, `app/embroidery-screen-printing-web-design/page.jsx`, `components/CountUp.jsx`. For each, decide: reimplement fresh against current `preview` architecture (new small PR), or skip because Phase 5's SEO PR already covers the same Screaming Frog findings by a different, current-architecture method. | | |
| TASK-024 | Close PR #63 with a comment explaining the architecture-drift reason (mirror the tone of `STATUS.md`'s "Closed as stale/superseded" section for #26/#29/#39/#46), linking to this plan and to whichever Phase-5/salvage PR supersedes it. Do not delete `claude/plan-implementation-d57j5t` — leave it reachable in history per this repo's existing convention (see `STATUS.md`'s handling of commit `5b90c3c`). | | |

### Implementation Phase 7: Full verification on `preview`

- GOAL-007: Confirm the fully-consolidated `preview` branch is production-quality before syncing into `main`.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-025 | Run `pnpm test` (full suite) and `pnpm build` on `preview` tip. Record pass counts for comparison against `STATUS.md`'s last recorded baseline (146/146 as of 2026-08-04; expect a higher count now that #60/#61/#58/#62/SEO tests have landed). | | |
| TASK-026 | Browser click-through (per `STATUS.md`'s outstanding item): sign in as each of the three roles (client/PM/admin) against the Vercel preview deployment for this branch, exercise project messaging (post + edit a message, confirm the edit produces a new `notifications_outbox` row once migration `0015` is applied per REQ-006), exercise PM assignment from the admin UI, and visit `/about`, `/services`, `/services/[slug]`, `/process`, `/contact`, `/work`, `/work/[slug]`, `/reviews` at desktop + mobile widths with reduced-motion enabled. | | |
| TASK-027 | Confirm no regression in the `NEXT_PUBLIC_CRM_ENABLED` gating logic (`lib/crmFlag.js`, `middleware.js`) — this plan's consolidation must not change how that flag behaves, since `production` depends on it staying exactly as-is. | | |
| TASK-028 | Update `STATUS.md` on `preview` with the outcome of this consolidation (branches merged, PR #63's disposition, migration `0015`'s live-apply status) before proceeding to Phase 8 — this is the same discipline `STATUS.md` itself asks for at the end of every session. | | |

### Implementation Phase 8: Sync `preview` into `main` — BLOCKED pending owner confirmation

- GOAL-008: Bring `main` up to date with the consolidated `preview` branch, using the existing PR #59 as the vehicle — but only once it's confirmed this will not push CRM code live.

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-028a | **Hard gate — do not proceed past this task without explicit owner sign-off.** Per the finding recorded in this plan's introduction, Vercel's Production Branch for this project is `main`, confirmed via `list_deployments`: every historical deployment with `"target": "production"` has `githubCommitRef: "main"`, none reference a branch named `production`. This means TASK-031 (merging `preview` into `main`) is very likely to trigger an immediate live deploy to `www.crystalwebsolution.com` — the opposite of "keeping only the production branch separate, used right now in Vercel deploy without the CRM plugged in." Before continuing: (a) show the owner this finding, (b) get their explicit decision on whether to repoint Vercel's Production Branch setting to `production` (Project Settings → Git → Production Branch), or rename/realign the git branches to match what's actually wired, or accept a live deploy at this point. Do not infer or default to any of these — this is a deployment-topology decision, not a merge decision. | | |
| TASK-029 | Once TASK-028a is resolved, re-open/refresh PR #59 (`preview` → `main`) now that `preview` contains all of Phases 2–5's work — it will need to pick up the new commits automatically since it's a live branch-to-branch PR, not a point-in-time diff. | | |
| TASK-030 | Note the actual topology (corrects an earlier misreading during planning): `main`'s tip (`5a67ec4`, "Create New Plan", adds only `docs/plans/homepage-overhaul-spec.md`) is already an ancestor of `origin/preview` — `git log origin/preview..main` returns zero commits, i.e. every commit on `main` already exists on `preview`. PR #59 is therefore a **fast-forward**, not a divergent merge; there is no risk of losing `5a67ec4`, only of confirming the fast-forward actually includes it (it does, structurally, by definition of ancestry). | | |
| TASK-031 | Land PR #59 into `main`. Because this is a fast-forward, GitHub will offer both a fast-forward merge and a merge-commit option — either is safe here (no divergent history to preserve on `main`'s side); prefer whichever matches how this repo's other `preview`→`main` syncs have historically been done, not a hardcoded preference from this plan. | | |
| TASK-032 | Run `pnpm test` and `pnpm build` on `main` tip as a final confirmation. If TASK-028a resulted in a live deploy, immediately verify `www.crystalwebsolution.com` in a browser and confirm `NEXT_PUBLIC_CRM_ENABLED` is still correctly hiding CRM routes there (`middleware.js` redirects, `Nav.jsx`/`Menu.jsx` hide the login links) — do not assume the env var is scoped correctly just because it was before this consolidation. | | |

### Implementation Phase 9: Explicit non-action — the `production` git branch, and Vercel's real production target, stay untouched pending TASK-028a

- GOAL-009: Guard against accidental promotion, since this is the step every prior session's `CLAUDE.md` explicitly calls out as requiring a separate, deliberate decision — and since Phase 8's finding means "don't touch production" now means more than just "don't touch the branch named `production`."

| Task | Description | Completed | Date |
| ---- | ---- | ---- | ---- |
| TASK-033 | Do not open, merge, or fast-forward any PR targeting the `production` git branch. Do not run `vercel --prod`/`vercel deploy --prod` at any point. Do not proceed past TASK-028a's gate without the owner's explicit decision on Vercel's actual Production Branch setting. | | |
| TASK-034 | Confirm via `git log -1 production` that it is still exactly `11d69b1` after every phase above completes. | | |
| TASK-035 | Report to the owner that `preview` is now consolidated and verified, and that any further promotion — of the `production` git branch, or of whatever branch Vercel's Production Branch setting actually points to per TASK-028a's resolution — is a separate decision requiring their explicit go-ahead. Do not imply or recommend a timeline for that decision as part of this plan. | | |

## 3. Alternatives

- **ALT-001**: Merge each open PR directly into `preview` in GitHub's arbitrary listed order, resolving conflicts as they arise. Rejected — this ignores the #58→#62 stack dependency (would orphan #62's commits or force an awkward re-target) and risks committing the Hermes SEO working-tree changes onto the wrong branch (`agent/crm-notifications-and-messaging`), mixing SEO and CRM concerns in one PR history against `GUD-002`.
- **ALT-002**: Merge PR #63 as-is since it's the only PR explicitly about "the SEO page." Rejected per FIN-001 — its branch predates the `components/marketing/*` shell refactor and would reintroduce dead component files (`components/SubpageNav.jsx`, `components/SubpageShell.jsx`) alongside their replacements.
- **ALT-003**: Also promote `preview`/`main` into `production` as part of this same plan, since "merge all the PRs together" could be read that broadly. Rejected — the user's own framing ("keeping only the production branch separate as it is to be used right now in vercel deploy without the CRM plugged") and `CLAUDE.md`'s standing rule both require production promotion to be its own reviewed, deliberate act, not a side effect of a consolidation pass.

## 4. Dependencies

- **DEP-001**: GitHub PR merge permissions on `ethancrystal/crystalwebsolution.com` (confirmed available — `gh auth status` shows an authenticated `ethancrystal` account with `repo` scope).
- **DEP-002**: Supabase MCP `apply_migration` access and the owner's explicit approval, for migration `0015` (Phase 4, REQ-006) — out of this plan's automatic execution, tracked as a follow-up gate only.
- **DEP-003**: A working Vercel preview deployment of the consolidated `preview` branch, for Phase 7's browser click-through (TASK-026).
- **DEP-004**: Owner-level access to this Vercel project's Settings → Git → Production Branch configuration, for resolving TASK-028a's gate before Phase 8 can proceed.

## 5. Files

- **FILE-001**: `app/layout.jsx` — JSON-LD `@graph` (Organization/WebSite), canonical host via `lib/seo.mjs` (Phase 5).
- **FILE-002**: `app/robots.js`, `app/sitemap.js` — canonical host, CRM route disallow rules (Phase 5).
- **FILE-003**: `lib/seo.mjs`, `components/marketing/BreadcrumbSchema.jsx`, `app/opengraph-image.jsx` — new files from the uncommitted SEO work (Phase 5).
- **FILE-004**: `app/reviews/page.jsx`, `app/work/[slug]/page.jsx` — collision zone between PR #61, PR #62, PR #63, and the uncommitted SEO work; requires manual reconciliation in Phase 3 and Phase 5.
- **FILE-005**: `app/services/[slug]/page.jsx`, `components/BrandLogo.jsx`, `components/sections/Hero.jsx`, `lib/site.js`, `next.config.js`, `app/login/page.jsx`, `app/signup/page.jsx`, plus new `login`/`signup`/`forgot-password` `layout.jsx` files — remaining SEO/a11y/security-header changes (Phase 5).
- **FILE-006**: `supabase/migrations/0015_project_notifications_and_message_editing.sql` — merged in code via PR #60, live-apply gated separately (REQ-006).
- **FILE-007**: `.gitignore` — add `.hermes/` (Phase 5, TASK-014).
- **FILE-008**: `STATUS.md` — updated at the end of Phase 7 (TASK-028) to record this consolidation's outcome.

## 6. Testing

- **TEST-001**: `pnpm test` (full suite) must pass after every phase's merge lands on `preview`, and again on final `main` tip (Phase 8).
- **TEST-002**: `pnpm build` must pass at the same checkpoints as TEST-001 — this is the repo's only real compile/import-resolution gate (no separate lint script exists).
- **TEST-003**: Manual browser click-through of all three CRM roles plus every marketing route listed in TASK-026, at desktop/mobile widths and with `prefers-reduced-motion` enabled, before Phase 8.
- **TEST-004**: JSON-LD validation for the new/changed structured-data blocks (`app/layout.jsx`'s `@graph`, `BreadcrumbSchema`, the reviews `ItemList`/`Review` block, the work case-study `CreativeWork` block) — confirm each renders valid JSON with no `undefined`/`NaN` values leaking into the markup (the existing `isoDate()` guard in `app/reviews/page.jsx` is the pattern to follow for any new date fields).

## 7. Risks & Assumptions

- **RISK-001**: Manual conflict resolution in Phase 3 (TASK-009) and Phase 5 (TASK-016) on `app/work/[slug]/page.jsx`/`app/reviews/page.jsx` could silently drop one side's change if done carelessly — this is the same failure mode `STATUS.md` documents for the PR #49/#50 incident. Mitigate by diffing the merged result against both source PRs' diffs before committing the merge.
- **RISK-002**: PR #60's notification/messaging/Realtime features will appear "merged but broken" in `preview` until migration `0015` is applied live (REQ-006) — anyone testing Phase 7 without knowing this could misreport a regression. TASK-013 and TASK-026 both call this out explicitly to prevent that.
- **RISK-003**: `.hermes/desktop-attachments/*` contains a Screaming Frog crawl export that may include internal URL structure and response data not intended for the public repo history — REQ-003/TASK-015 exist specifically to prevent this from being committed by accident during Phase 5's branch extraction.
- **FIN-001** *(finding, not a risk to mitigate — a fact established during planning)*: PR #63's branch (`claude/plan-implementation-d57j5t`) merge-bases at `main`'s tip (`5a67ec4`), which is 25 commits behind `origin/preview` and predates PR #57's `components/marketing/*` shell refactor. Its diff still contains root-level `components/SubpageNav.jsx`/`components/SubpageShell.jsx`, which do not exist anywhere in `preview`'s current tree. This is why Phase 6 treats it as triage-only, not a mergeable branch.
- **RISK-004 / FIN-002**: Vercel's configured Production Branch for this project is `main`, not the `production` git branch — confirmed via the Vercel MCP's `list_deployments`: every historical `"target": "production"` deployment has `githubCommitRef: "main"`; none reference `production`. `CLAUDE.md`'s documented environment model assumes the reverse. This is the single highest-impact risk in this plan — Phase 8 (`preview` → `main`) is gated on TASK-028a specifically because of it. Until the owner resolves the mismatch (repoint Vercel, or realign branch naming/roles), treat `main` as functionally equivalent to `production` for risk purposes, not as a safe integration branch.
- **ASSUMPTION-001**: The `hermes` local branch (distinct from the `.hermes/` working directory) is an old, unrelated branch (last commit merges PR #44, well before this session's work) that happens to share a name — it is not part of this plan and should not be confused with the Hermes SEO remediation session's uncommitted work.
- **ASSUMPTION-002**: PR #59 (`preview` → `main`, empty body) is a previously-opened, still-valid sync PR and can be reused in Phase 8 rather than opened fresh — re-verify this in Phase 1 (TASK-001) since its state may have changed.

## 8. Related Specifications / Further Reading

- [STATUS.md](../STATUS.md) — current implementation status, the PR #49/#50 collision incident this plan's GUD-001/RISK-001 generalize from, and migration `0015`'s live-apply gate.
- [docs/plans/feature-crm-website-completion-1.md](feature-crm-website-completion-1.md) — the CRM completion plan PR #60 is scoped against.
- [.hermes/plans/reconcile-work-slug.md](../.hermes/plans/reconcile-work-slug.md) — prior Hermes-session plan for `/work/[slug]`'s `MarketingShell` migration, useful context for Phase 3/5's conflict resolution in that same file.
- [CLAUDE.md](../CLAUDE.md) — the `preview`/`production` environment model and the standing "never `vercel --prod`" rule this plan's Phase 9 enforces.
