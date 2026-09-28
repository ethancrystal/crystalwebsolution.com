---undefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefinedundefined ✅ Done — v1.23, PR #169. | 2026-09-02 |✅ Done — `lib/servicePages.mjs` and `components/ui/liquid-ether-background.jsx` triaged as large but cohesive; no split. docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md | 2026-09-02 |✅ Done — split into `components/crm/useProjectThread.js` (data) and the presentation component; verbatim move, tests green after. | 2026-09-02 |✅ Done — `tests/crm/project-thread-behaviour.test.jsx` (11 tests) pins Realtime lifecycle, project-switch guard, inline edit, send idempotency; green before the split. | 2026-09-02 |✅ Closed without split — the contract-test gate is worth more than the decomposition; report records what would unlock it. docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md | 2026-09-02 |✅ Done — five CRM contract tests assert against `project-actions.js` source text (RPC allowlist, no direct table writes, result contract). docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md | 2026-09-02 |✅ Done — v1.20, PR #168. | 2026-09-02 |✅ Done — contacts, tasks, deals moved one entity per commit. Pages 3,322 → 1,965 lines. Two pre-existing gaps recorded (contacts/tasks edit rows-changed check; tasks/new guard) — fixed in plan 3, Task 7. | 2026-09-02 |✅ Done — companies new/edit moved first; byte-identical markup proven by `tests/crm/admin-form-shell.test.jsx` against frozen fixtures. | 2026-09-02 |✅ Done — `components/crm/AdminFormShell.jsx` with an explicit `variant` prop preserving both families (unified later in plan 3, Task 6). | 2026-09-02 |✅ Done — same finding for the four edit pages; two chrome families identified (700px card / 800px container). docs/reports/phase-3-admin-crud-duplication-audit-2026-09-02.md | 2026-09-02 |✅ Done — real duplication is page chrome (~150 lines styled-jsx each), not form logic. docs/reports/phase-3-admin-crud-duplication-audit-2026-09-02.md | 2026-09-02 |✅ Done — `pnpm test`, `pnpm test:marketing`, `pnpm build` green before Phase 3 (v1.19 PR #167). | 2026-09-02 |✅ Done — `docs/ARCHITECTURE.md` created (v1.19). | 2026-09-02 |✅ Done — README gains "Component directory conventions" and "Styling" describing the 28-file global split (v1.19). | 2026-09-02 |✅ Done — `tests/marketing/motion.test.jsx`, 4 tests (v1.19). | 2026-09-02 |✅ Done — `tests/marketing/work-marquee.test.jsx`, 9 tests (v1.19). | 2026-09-02 |⏭ Carried — Lighthouse gathered but flagged unreliable in the sandbox (`simulate` throttling vs. real bundle size). Real production run: `audit-followups-crm-hardening-3.md` Task 3 (v1.27). | 2026-09-02 |✅ Done — CSP nonce comment still accurate; documented, no change. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |✅ Done — `public/d/02-messenger.gif` still 329,484 bytes, unchanged; left as is. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |✅ Done — moot: `public/` has zero untracked files; the CSVs were already gone. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |⏭ Carried — surfaced to owner; premise corrected on 2026-09-03 (cursor was built and removed in PR #10, not unbuilt). Removal shipped by `audit-followups-crm-hardening-3.md` Task 5 (v1.28). | 2026-09-02 |✅ Done — chunk-manifest comparison shows Three.js/R3F absent from shared and CRM bundles. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |✅ Done — `ssr: false` confirmed on exactly the three WebGL boundaries; no change. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |✅ Done — `depcheck` flagged only `typescript`, a false positive required by `tsconfig.json`'s `@/*` alias; nothing removed. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |
goal: Continue the whole-app refactor — close out v1's dead-code/perf/testing phases, then extract admin CRUD duplication and decompose oversized CRM files
version: 2.0
date_created: 2026-09-01
last_updated: 2026-09-03
owner: Crystal Web Solution
status: Complete — Phases 0–4 shipped as v1.17, v1.18, v1.19, v1.20, v1.23 (PRs #165–#169, 2026-09-01/02); TASK-004 and TASK-008 carried to audit-followups-crm-hardening-3.md
tags: [refactor, architecture, dead-code, crm, cleanup]
---

# Introduction

![Status: Complete](https://img.shields.io/badge/status-Complete-brightgreen)

> **Closed 2026-09-03.** All phases shipped; see `CHANGELOG.md` v1.17–v1.23 and `docs/reports/phase-*.md`. The two carried items (custom cursor, real Lighthouse run) and every finding from the 2026-09-02 CRM audits live in [`audit-followups-crm-hardening-3.md`](audit-followups-crm-hardening-3.md). Task tables below were back-filled from those sources on close-out, not during execution.

This is a **continuation**, not a replacement, of
[`refactor-architecture-cleanup-1.md`](refactor-architecture-cleanup-1.md)
(v1.2). v1's Phases 0–3 (CSS modularization, component-architecture cleanup,
JSDoc/type-safety) shipped across PR #133, #136, and v1.09 — verified in
this session against current `main` (`e578f65`, tagged v1.16). v1's Phase 4
(Dead Code & Performance Audit) and Phase 5 (Testing & Documentation) were
never started — every task row in both tables is still blank. Re-litigating
that scope under new task IDs would recreate the exact duplicate-work
incident `STATUS.md` documents twice (PR #49/#50, and the two-session CRM
audit collision) — so this plan carries v1's TASK-022–033 forward verbatim
(renumbered, same wording) as Phase 1–2, and adds two areas v1's own file
inventory (limited to `components/`) never covered: `app/admin/**` CRUD
page duplication and files that have grown past the
`refactor-with-confidence` skill's 300–400 line Extract-Module threshold.

Every phase in this plan follows `refactor-with-confidence`'s core
discipline: read the target and its callers first, confirm the
duplication/dead-code premise actually holds before touching anything (v1's
own history shows 5 of 15 Phase 2 tasks were closed "investigated, premise
didn't hold" rather than forced through — that outcome is a valid result
here too, not a failure), make one logical change, run the relevant test
command, and only then move to the next change. `tests/crm/*.test.mjs` are
regex-over-source-text contract checks (confirmed live in `STATUS.md` — no
CRM test executes against a real database), so any file split in Phase 4
must grep for and re-point every test that asserts against the old file's
literal contents, not just re-run the suite and assume a pass means nothing
broke.

Unlike v1, every phase below ends in a PR to `main`, and every PR is a
production deploy per this repo's mandatory versioning rule
(`VERSIONING.md`) — v1's plan omitted this. Each phase's task table includes
the `VERSION`/`CHANGELOG.md` bump and `vX.NN — <summary>` PR title as an
explicit, non-optional task, not an afterthought.

## 1. Requirements & Constraints

- **REQ-001**: Zero visual regression — every pixel, animation timing, and interaction must remain identical to pre-refactor `main`.
- **REQ-002**: Zero functional regression — all routes, API endpoints, auth flows, and CRM behavior preserved.
- **REQ-003**: `pnpm test`, `pnpm test:marketing`, and `pnpm build` must pass after every task, not just at phase end.
- **REQ-004**: `pnpm build` must complete without new warnings or errors.
- **REQ-005**: Preserve all GSAP + Three.js animation behavior including reduced-motion paths (`motionScale.value` gating).
- **REQ-006**: Any file split must identify and update every `tests/crm/*.test.mjs` or other test that asserts against the pre-split file's literal source text (grep for the filename/function name across `tests/` before splitting, not after).
- **REQ-007**: Every phase's completion includes a `VERSION` bump, a matching `CHANGELOG.md` entry, and a `vX.NN — <summary>` PR title, per `VERSIONING.md` — non-negotiable for any PR into `main`.
- **CON-001**: No runtime dependency additions unless strictly necessary.
- **CON-002**: `lib/inMotionCards.mjs` stays untouched (existing contractual constraint, carried from v1's REQ-007).
- **CON-003**: No database schema/migration changes in this plan — CRM data-layer bugs belong to CRM-specific plans (`docs/plans/feature-crm-remaining-work-2.md` and successors), not this architecture refactor.
- **CON-004**: Two CRM data-access shapes (contract-tested project-delivery path vs. direct-Supabase+RLS for companies/contacts/deals/tasks/users) are a documented, deliberate split per `CLAUDE.md` — this plan does not unify them.
- **GUD-001**: Prefer surgical edits over wholesale rewrites; extract only after confirming real duplication exists (read the actual files, not just their line counts).
- **GUD-002**: One extraction/rename/split per commit; run tests between each, per `refactor-with-confidence` Step 4 — never batch multiple transformations before verifying.
- **GUD-003**: Where v1 already investigated a premise and found it didn't hold (TASK-010c, TASK-012, TASK-013, TASK-015), do not re-investigate from scratch — read v1's note, confirm it's still accurate against current `main`, and either carry the "not applicable" verdict forward or explain what changed.
- **PAT-001**: Follow `refactor-with-confidence`'s decision tree — tests exist and pass → refactor directly; tests exist but fail → fix first; no tests → write characterization tests before refactoring.

## 2. Implementation Steps

### Implementation Phase 0: Baseline + Known-Bad Fix

- GOAL-000: Establish a genuinely green baseline (v1's own Phase 0 was never run) before any refactor task begins.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000a | Fix `tests/email.test.mjs:134` — the regex asserts the logo URL against the retired `www.crystalwebsolution.com` domain, but `lib/email/templates.js:49` correctly renders `${SITE_ORIGIN}${SITE.logoPath}` and `SITE_ORIGIN` (`lib/seo.mjs`) was intentionally repointed to `cdsportswearusa.com` in commit `e578f65` (`v1.16`). Update the assertion to match `SITE_ORIGIN`'s current value (derive it, don't hardcode a second literal domain) so the test tracks the source of truth instead of drifting again. Also check lines 110/130/151/197 in the same file (hardcoded `crystalwebsolution.com` URLs in other fixtures) — confirm whether those are inert test input (fine, any domain works as fixture input) or also asserting against the retired domain (needs the same fix). | ✅ Done — imported `SITE_ORIGIN` from `lib/seo.mjs`, replaced the hardcoded regex with `rendered.html.includes(`${SITE_ORIGIN}${SITE.logoPath}`)`. Lines 110/130/151/197 confirmed inert fixture input (their tests assert escaping/inclusion of the URL as passed, not against `SITE_ORIGIN`) — left unchanged. | 2026-09-01 |
| TASK-000b | Run `pnpm test` — confirm 452/452 (currently 451/452, single known failure from TASK-000a). Record the exact pass count as the new baseline. | ✅ Done — 452/452 passing, 0 fail. | 2026-09-01 |
| TASK-000c | Run `pnpm build` — record build time, route count, and total bundle size as baseline for Phase 1's perf comparison. | ✅ Done — clean compile (24.5s), 57/57 static pages generated, 0 errors. Only pre-existing webpack `PackFileCacheStrategy` big-string cache warnings (unrelated to app code). Baseline: 228 kB shared First Load JS; `/` route 89.3 kB / 378 kB First Load JS. Full route table captured for Phase 1 comparison. | 2026-09-01 |
| TASK-000d | Run `pnpm test:marketing` — record pass/fail counts (v1 never ran this suite as part of its own baseline). | ✅ Done — 8 test files, 22/22 passing. | 2026-09-01 |
| TASK-000e | Confirm `tests/e2e` is still not checked in (per `CLAUDE.md`'s "planned gate" note) — if it now exists, add `pnpm test:e2e` to this baseline and every subsequent phase's verification gate. | ✅ Done — `tests/e2e` still does not exist; `pnpm test:e2e` stays out of scope for this plan. | 2026-09-01 |
| TASK-000f | `git branch -a` and check for open PRs touching `app/admin/**`, `app/actions/project-actions.js`, or `components/crm/**` before starting Phase 3/4 — this repo has a documented two-session collision pattern on exactly these paths (`STATUS.md`, "Check open branches/PRs" section). | ✅ Done — `gh pr list` shows 10 open PRs: #163/#162 (homepage copy/domain, marketing-only), #158/#157/#156/#155/#154/#153/#152 (dependabot, deps/CI only), #149 (draft, homepage skeletons — pixel-polish, not CRM). None touch `app/admin/**`, `app/actions/project-actions.js`, or `components/crm/**`. Local/remote branches checked, same result — no collision risk for Phase 3/4 at this time. Re-check immediately before starting each of those phases, per ASSUMPTION-002. | 2026-09-01 |
| TASK-000g | Version bump per REQ-007: `VERSION` + `CHANGELOG.md` entry, PR titled `v1.17 — fix stale domain assertion in email test (refactor baseline)`. | ✅ Done — `VERSION` → `v1.17`, `CHANGELOG.md` entry added. **Note:** PRs #162 and #163 are already open against `main`, both also titled `v1.17 — ...` (neither merged yet). Per `VERSIONING.md`, this is expected when multiple branches are open concurrently — whichever of the three merges last must rebase and take the next number at merge time, not now. | 2026-09-01 |

### Implementation Phase 1: Dead Code & Performance Audit (continues v1 Phase 4, TASK-022–028)

- GOAL-001: Remove unused code, optimize bundle, and resolve the two owner-decision items v1 flagged but didn't act on.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Run `pnpm dlx depcheck` to find unused dependencies. | ✅ Done — `depcheck` flagged only `typescript`, a false positive required by `tsconfig.json`'s `@/*` alias; nothing removed. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |
| TASK-002 | Audit all `dynamic()` imports — verify `ssr: false` is only where needed (`Scene` is correct; audit others). | ✅ Done — `ssr: false` confirmed on exactly the three WebGL boundaries; no change. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |
| TASK-003 | Audit Three.js component tree-shaking — ensure `three` and `@react-three/*` are not in the initial bundle. | ✅ Done — chunk-manifest comparison shows Three.js/R3F absent from shared and CRM bundles. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |
| TASK-004 | Owner-decision item, carried from v1's TASK-013 (not resolved there): 31 `data-cursor="..."` attributes exist across the codebase with nothing (no JS, no CSS) reading them — looks like dead markup reserved for an unbuilt custom-cursor feature. Present the file list to the owner; do not remove without explicit confirmation per the repo's "confirm before deleting" rule. | ⏭ Carried — surfaced to owner; premise corrected 2026-09-03 (the cursor was built and removed in PR #10, not unbuilt). Removal ships in `audit-followups-crm-hardening-3.md` Task 5 (v1.28). | 2026-09-02 |
| TASK-005 | Owner-decision item, carried from `STATUS.md`'s "Still open" section: confirm whether the ~30 untracked SEO-crawl CSVs in `public/` (`accessibility_all.csv`, `sitemaps_all.csv`, `structured_data_all.csv`, etc.) are still present; if so, they are publicly downloadable as committed and need an owner call — move out of `public/`, `.gitignore`, or delete. This is v1's TASK-025 scope, narrowed to what's actually still there. | ✅ Done — moot: `public/` has zero untracked files; the CSVs were already gone. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |
| TASK-006 | Optimize `public/d/02-messenger.gif` if it is still ~322 KB and still the only oversized asset (re-verify — v1 recorded WebM files as already small; confirm nothing has regressed since). | ✅ Done — `public/d/02-messenger.gif` still 329,484 bytes, unchanged; left as is. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |
| TASK-007 | Review CSP in `next.config.js` — confirm the "tightening needs a nonce refactor, tracked separately" comment is still accurate; document current state, no change unless a nonce refactor is explicitly in scope (it is not, in this plan). | ✅ Done — CSP nonce comment still accurate; documented, no change. docs/reports/phase-1-dead-code-performance-audit-2026-09-01.md | 2026-09-02 |
| TASK-008 | Run Lighthouse (mobile + desktop) on `/`, `/work`, `/services`, `/admin` (add `/admin` — v1 only covered marketing routes; the CRM dashboard has real interactive weight now); compare against TASK-000c's baseline; document any regression. | ⏭ Carried — Lighthouse gathered but flagged unreliable in the sandbox. Real production run: `audit-followups-crm-hardening-3.md` Task 3 (v1.27). | 2026-09-02 |

### Implementation Phase 2: Testing & Documentation (continues v1 Phase 5, TASK-029–033)

- GOAL-002: Close v1's remaining test-coverage gaps and produce the architecture doc it specified but never wrote.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Add `components/ui/work-marquee.test.jsx` for the video rendering path (confirm it's still untested before writing — re-verify against current `components/ui/`). | ✅ Done — `tests/marketing/work-marquee.test.jsx`, 9 tests (v1.19). | 2026-09-02 |
| TASK-010 | Add `components/sections/Motion.test.jsx` to verify `CLIENT_TILE_IMAGES` + `REPLACEMENT_IMAGES` wiring. | ✅ Done — `tests/marketing/motion.test.jsx`, 4 tests (v1.19). | 2026-09-02 |
| TASK-011 | Update `README.md` with component directory conventions and the actual CSS-file-split approach shipped in v1 Phase 1 (not "CSS module rules" as v1 literally worded it — v1's revised approach kept classes global; the README should describe what actually shipped). | ✅ Done — README gains "Component directory conventions" and "Styling" describing the 28-file global split (v1.19). | 2026-09-02 |
| TASK-012 | Create `docs/ARCHITECTURE.md` with a dependency graph of sections → components → hooks → lib, plus the two CRM data-access shapes (contract path vs. direct-RLS path) and which entities use which. | ✅ Done — `docs/ARCHITECTURE.md` created (v1.19). | 2026-09-02 |
| TASK-013 | Run the full verification gate (`pnpm test && pnpm test:marketing && pnpm build`, plus `pnpm test:e2e` if TASK-000e found it now exists) — all green required before Phase 3 starts. | ✅ Done — `pnpm test`, `pnpm test:marketing`, `pnpm build` green before Phase 3 (v1.19, PR #167). | 2026-09-02 |

### Implementation Phase 3: Admin CRUD Duplication Audit & Extraction (new scope)

- GOAL-003: Confirm and, where real, collapse the duplicated new/edit form scaffolding across the four CRM entity types.

> **Scope note:** this phase audits before it extracts, per `GUD-001`. The
> line-count signal below is real (measured this session) but is not proof
> of extractable duplication — v1's Phase 2 found several "obvious"
> duplications that weren't real on inspection. Do not skip TASK-014.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Read `app/admin/deals/new/page.jsx` (460 lines), `app/admin/tasks/new/page.jsx` (460), `app/admin/contacts/new/page.jsx` (396), `app/admin/companies/new/page.jsx` (327) side by side. Determine which parts are genuinely identical scaffolding (form-state boilerplate, submit/error handling, layout chrome) vs. entity-specific fields. Document the finding — including "no real duplication, close without extraction" as a valid outcome. | ✅ Done — real duplication is page chrome (~150 lines styled-jsx each), not form logic. docs/reports/phase-3-admin-crud-duplication-audit-2026-09-02.md | 2026-09-02 |
| TASK-015 | Repeat TASK-014 for the four `[id]/edit/page.jsx` counterparts (`deals` 504, `tasks` 450, `contacts` 375, `companies` 350 lines). | ✅ Done — same finding for the four edit pages; two chrome families identified (700px card / 800px container). docs/reports/phase-3-admin-crud-duplication-audit-2026-09-02.md | 2026-09-02 |
| TASK-016 | If TASK-014/015 confirm real duplication: design the shared shape (e.g. `components/crm/EntityForm.jsx` or a `useEntityForm` hook) that takes a field-schema + submit handler, without changing any entity's actual field set, validation, or submit behavior. | ✅ Done — `components/crm/AdminFormShell.jsx` with an explicit `variant` prop preserving both families (unified in plan 3, Task 6). | 2026-09-02 |
| TASK-017 | Extract one entity pair first (recommend `companies`, the smallest) as a proof, run `pnpm test` + manual browser check of create/edit flows, confirm zero behavior change before touching the other three. | ✅ Done — companies new/edit moved first; byte-identical markup proven by `tests/crm/admin-form-shell.test.jsx` against frozen fixtures. | 2026-09-02 |
| TASK-018 | If TASK-017 is clean, apply the same extraction to `contacts`, `tasks`, `deals` — one entity per commit, tests run between each, per `GUD-002`. | ✅ Done — contacts, tasks, deals moved one entity per commit; pages 3,322 → 1,965 lines. Two pre-existing gaps recorded (contacts/tasks edit rows-changed check; tasks/new guard) — fixed in plan 3, Task 7. | 2026-09-02 |
| TASK-019 | Version bump: `VERSION` + `CHANGELOG.md` entry, PR titled `vX.NN — extract shared admin CRUD form scaffolding` (or `vX.NN — admin CRUD duplication audit (no extraction)` if TASK-014/015 found the premise didn't hold). | ✅ Done — v1.20, PR #168. | 2026-09-02 |

### Implementation Phase 4: Oversized File Decomposition (new scope)

- GOAL-004: Split files that exceed the 300–400 line Extract-Module threshold, where a real seam exists.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-020 | Read `app/actions/project-actions.js` (972 lines). Identify natural seams (e.g. by entity: tasks/approvals/deliverables/messages/assignments) vs. shared auth/validation helpers. Before any split: `grep -rl "project-actions" tests/` to find every test asserting against this file's contents or import path. | ✅ Done — five CRM contract tests assert against `project-actions.js` source text (RPC allowlist, no direct table writes, result contract). docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md | 2026-09-02 |
| TASK-021 | If TASK-020 confirms clean seams: split into `app/actions/project-actions/{tasks,approvals,deliverables,messages,assignments}.js` re-exported from a barrel `app/actions/project-actions.js` (or update the ~N call sites directly — decide based on import-site count found via `grep -rl "actions/project-actions"`). Re-point every test TASK-020 found. Run `pnpm test` after every file moved, not once at the end. | ✅ Closed without split — the contract-test gate is worth more than the decomposition; the report records what would unlock it. docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md | 2026-09-02 |
| TASK-022 | Read `components/crm/ProjectThread.jsx` (876 lines). This file has a documented history of being fragile (`STATUS.md`: the profile-object bug that broke every project's Conversation panel for weeks; the `useCallback` dependency-churn fix). Treat any split here as higher risk than TASK-020/021 — write/confirm characterization tests for the Realtime subscription lifecycle and the inline-edit flow *before* moving any code, per `refactor-with-confidence` Step 2. | ✅ Done — `tests/crm/project-thread-behaviour.test.jsx` (11 tests) pins the Realtime lifecycle, project-switch guard, inline edit and send idempotency; green before the split. | 2026-09-02 |
| TASK-023 | If TASK-022's characterization tests pass cleanly against current behavior: split `ProjectThread.jsx` into presentation (message list rendering) vs. data (Realtime subscription + `load()`/mutation calls) modules. If characterization reveals the current behavior is already fragile in a way a split would amplify, stop and report rather than proceeding — this file's history justifies caution over throughput. | ✅ Done — split into `components/crm/useProjectThread.js` (data) and the presentation component; verbatim move, tests green after. | 2026-09-02 |
| TASK-024 | Triage only (no action required unless investigation finds a real problem): `lib/servicePages.mjs` (730 lines) and `components/ui/liquid-ether-background.jsx` (1,199 lines). Read both; if either is one cohesive concern (e.g. liquid-ether is a single self-contained shader/animation component, which large R3F/canvas components legitimately are), close with "large but cohesive, no split" rather than forcing a division for its own sake. | ✅ Done — `lib/servicePages.mjs` and `components/ui/liquid-ether-background.jsx` triaged as large but cohesive; no split. docs/reports/phase-4-oversized-file-decomposition-2026-09-02.md | 2026-09-02 |
| TASK-025 | Version bump: `VERSION` + `CHANGELOG.md` entry, PR titled `vX.NN — decompose project-actions and ProjectThread` (adjust wording to match what actually shipped). | ✅ Done — v1.23, PR #169. | 2026-09-02 |

## 3. Alternatives

- **ALT-001**: Fold Phase 1–2 (v1's leftover Phase 4/5) directly back into v1's own file as a "Phase 4 continued" edit rather than a new v2 file — rejected because v1's front matter already declares `status: In Progress` with specific PR references per completed phase; editing it to add unrelated new-scope Phase 3/4 work would blur what shipped in PR #133/#136/v1.09 versus what's still speculative. A new versioned file, cross-linked, matches this repo's own precedent (`feature-crm-remaining-work-2.md`, `crm-messaging-asset-hardening-v2.md`).
- **ALT-002**: Skip the admin CRUD audit and extract directly on the assumption that four files with similar line counts must share a template — rejected per `refactor-with-confidence`'s explicit warning against extracting from unconfirmed duplication, and per v1's own track record (5 of 15 Phase 2 tasks died on this exact assumption).
- **ALT-003**: Split `project-actions.js` and `ProjectThread.jsx` in the same phase as the admin CRUD work — rejected; these touch the CRM data/message layer with a documented fragility history (`STATUS.md`'s multi-week `ProjectThread` outage), so they get their own phase with an explicit characterization-test gate rather than being batched alongside lower-risk marketing-admin form work.
- **ALT-004**: Full TypeScript migration, Tailwind adoption, Three.js library swap, component-library adoption — all re-affirmed as rejected per v1's ALT-001–004; nothing in this session's investigation changes those conclusions.

## 4. Dependencies

- **DEP-001**: Existing build toolchain: `next`, `pnpm`, `vitest`, `node --test`, `@playwright/test` (installed but `tests/e2e` not yet checked in — see TASK-000e).
- **DEP-002**: `pnpm dlx depcheck` (ad hoc, not installed as a devDependency) for TASK-001.
- **DEP-003**: No new runtime or dev dependencies required for Phase 3/4's extraction work — pure JS/JSX restructuring.

## 5. Files

- **FILE-001**: `tests/email.test.mjs` — fix stale domain assertion (Phase 0).
- **FILE-002**: `docs/ARCHITECTURE.md` — new file (Phase 2).
- **FILE-003**: `README.md` — update conventions to match what v1 actually shipped (Phase 2).
- **FILE-004**: `app/admin/{deals,tasks,contacts,companies}/new/page.jsx` and `[id]/edit/page.jsx` — audit, extract if confirmed (Phase 3).
- **FILE-005**: `components/crm/EntityForm.jsx` (or equivalent) — new shared component, only if Phase 3 confirms real duplication.
- **FILE-006**: `app/actions/project-actions.js` — audit, split if confirmed (Phase 4).
- **FILE-007**: `components/crm/ProjectThread.jsx` — characterize, then audit/split if safe (Phase 4).
- **FILE-008**: `lib/servicePages.mjs`, `components/ui/liquid-ether-background.jsx` — triage only (Phase 4).
- **FILE-009**: `VERSION`, `CHANGELOG.md` — bumped at the end of every phase (Phase 1–4).

## 6. Testing

- **TEST-001**: `pnpm test` (Node test runner, `tests/*.test.mjs` + `tests/crm/*.test.mjs`) — 452/452 after Phase 0, no regression through every later phase.
- **TEST-002**: `pnpm test:marketing` (vitest/jsdom) — full pass, baseline recorded in Phase 0.
- **TEST-003**: `pnpm build` — zero errors, zero new warnings, after every phase.
- **TEST-004**: Manual browser verification of create/edit flows for whichever admin entities Phase 3 actually extracts (companies/contacts/deals/tasks) — automated tests alone don't cover real Supabase RLS round-trips per `STATUS.md`'s standing caveat that CRM tests are contract checks, not live-database checks.
- **TEST-005**: Manual browser verification of the CRM project workspace's Conversation panel (post message, edit message, Realtime delivery across two sessions) after any `ProjectThread.jsx` change — this exact flow has a documented history of silently regressing past every automated gate (`STATUS.md`, 2026-08-13 session).
- **TEST-006**: Lighthouse mobile+desktop on `/`, `/work`, `/services`, `/admin` — no regression vs. Phase 0 baseline.

## 7. Risks & Assumptions

| ID | Risk / Assumption | Level | Mitigation |
|----|---------------------|-------|------------|
| RISK-001 | Splitting `project-actions.js` or `ProjectThread.jsx` silently breaks a `tests/crm/*.test.mjs` regex-over-source-text assertion that greps for the original file's contents | **High** | TASK-020/022 grep `tests/` for every reference before moving any code; re-point found tests in the same commit as the split, never after |
| RISK-002 | Admin CRUD "duplication" turns out to be four structurally different forms (different field types, validation, entity relationships) that only look similar by line count | **Medium** | TASK-014/015 require reading all four files before any extraction decision; "no real duplication" is an accepted, plan-compliant outcome |
| RISK-003 | `ProjectThread.jsx` has a documented multi-week-outage history from a single missed field in a passed object — any split risks reintroducing a similar silent-failure class | **High** | TASK-022 requires characterization tests for the Realtime subscription and inline-edit flow *before* any code moves, per `refactor-with-confidence` Step 2; TASK-023 explicitly permits stopping instead of splitting if characterization reveals fragility |
| RISK-004 | The `data-cursor` and SEO-CSV owner-decision items (TASK-004/005) get silently resolved by an agent instead of surfaced to the owner, repeating the pattern v1 was careful to avoid | **Low** | Both tasks explicitly state "do not act without explicit owner confirmation," carried verbatim from v1's own resolution |
| RISK-005 | Concurrent session collision on `app/admin/**` or `app/actions/project-actions.js` during Phase 3/4 (documented pattern, twice already) | **Medium** | TASK-000f checks branches/PRs before Phase 3/4 begins; re-check immediately before starting each phase, not just once at Phase 0 |
| ASSUMPTION-001 | The owner approves each phase before the next begins (stop-gate per phase), matching v1's ASSUMPTION-001 | — | Built into plan structure; this plan stops after drafting and asks before Phase 0 begins |
| ASSUMPTION-002 | No new features merge into the touched files (`app/admin/**`, `app/actions/project-actions.js`, `components/crm/ProjectThread.jsx`) during Phase 3/4's window | — | Coordinate with the owner; re-run TASK-000f's branch/PR check immediately before each phase |

## 8. Related Specifications / Further Reading

- [refactor-architecture-cleanup-1.md](refactor-architecture-cleanup-1.md) — the plan this one continues; read its per-task deviation notes before assuming any Phase 4/5 task's premise still holds.
- [STATUS.md](../../STATUS.md) — CRM implementation history, the `ProjectThread` outage, the two documented collision incidents, and the still-open SEO-CSV/data-cursor items.
- [CLAUDE.md](../../CLAUDE.md) — core animation/CRM architecture idiom, the two-data-access-shape convention (deliberately not unified by this plan).
- [AGENTS.md](../../AGENTS.md) — canonical architecture reference (Codex-facing, kept in sync with `CLAUDE.md`).
- [VERSIONING.md](../../VERSIONING.md) — mandatory version/changelog rules for every phase's PR.
