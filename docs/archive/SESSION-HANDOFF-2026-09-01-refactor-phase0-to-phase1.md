# Session handoff — 2026-09-01 (whole-app refactor, Phase 0 → Phase 1)

Written for continuing the whole-app refactor on a different session/machine.
Everything below reflects live state at the moment this file was written —
verify against `git status` / `gh pr view 165` / `gh pr list` before acting,
since state may have moved if another session touches this repo in the
meantime (this repo has a documented history of exactly that collision —
see `STATUS.md`'s "Check open branches/PRs" section, and re-run that check
before starting any task below).

## Where things stand

**Two branches are involved:**

1. **`claude/app-refactoring-plan-3524fd`** — PR
   [#165](https://github.com/ethancrystal/crystalwebsolution.com/pull/165)
   (`main` ← this branch), **open, not yet merged**, "Auto-fix pull
   requests" is watching it for this session. Contains:
   - `docs/plans/refactor-architecture-cleanup-2.md` — the full v2 refactor
     plan (a continuation of `refactor-architecture-cleanup-1.md`'s
     unfinished Phase 4/5, plus new scope this file summarizes below).
   - Phase 0 of that plan, complete: fixed `tests/email.test.mjs` (a real,
     currently-failing assertion — hardcoded the retired
     `crystalwebsolution.com` domain in the canonical-logo check; now
     derives the expectation from `SITE_ORIGIN`, which was correctly
     repointed to `cdsportswearusa.com` in `main`'s `e578f65`/#164).
   - `VERSION` bumped to `v1.17`, matching `CHANGELOG.md`.
   - Baseline recorded: `pnpm test` 452/452, `pnpm test:marketing` 22/22,
     `pnpm build` clean (57 routes, 228 kB shared JS, 24.5s compile).

2. **`refactor/phase-1-dead-code-audit`** (this branch) — created fresh off
   `origin/main` (`e578f65`), **no refactor work committed yet**, not
   pushed. This file is its first commit.

**Important dependency:** this branch was deliberately created off `main`,
*not* off `claude/app-refactoring-plan-3524fd` — the plan's own Phase 0/1
split treats each phase as an independent, separately-reviewable PR (see
`refactor-architecture-cleanup-2.md`'s REQ-007 and its Alternatives
section). That means **this branch does not yet contain the Phase 0 fix**:
`tests/email.test.mjs` will currently fail here exactly as it did before
Phase 0 (see PR #165's description for the root cause). **Before running
Phase 1's own baseline gate** (`pnpm test` must pass before any dead-code
removal), merge PR #165 into `main` and rebase/merge this branch onto the
result — do not re-fix the same test independently; that would create a
duplicate, conflicting commit across the two PRs.

## Versioning note

`VERSION`/`CHANGELOG.md` currently claim `v1.17` in **three** places at
once: PR #165 (this refactor's Phase 0), and two unrelated open PRs
[#162](https://github.com/ethancrystal/crystalwebsolution.com/pull/162)
and [#163](https://github.com/ethancrystal/crystalwebsolution.com/pull/163)
(homepage copy / canonical-domain fixes). Per `VERSIONING.md`, this is
expected with concurrent open branches — whichever of the three merges
last must rebase and take the next number (`v1.18`) at merge time, not
before. Check `CHANGELOG.md`'s current top entry before bumping the
version for Phase 1's own PR.

## The full plan

The authoritative task list lives in `refactor-architecture-cleanup-2.md`
on PR #165's branch (`docs/plans/refactor-architecture-cleanup-2.md`) — not
yet on `main`, so it isn't in this worktree yet. Fetch it once #165 merges,
or view it directly on GitHub in the meantime. Condensed reference for
Phase 1, so this handoff is self-contained even before that merge:

### Phase 1 — Dead Code & Performance Audit (continues v1's unfinished Phase 4)

- Run `pnpm dlx depcheck` for unused dependencies.
- Audit all `dynamic()` imports — confirm `ssr: false` is only where
  actually needed (`Scene` is correct; audit the rest).
- Audit Three.js / `@react-three/*` tree-shaking — confirm neither ships in
  the initial bundle.
- **Owner-decision item (do not resolve unilaterally):** 31 `data-cursor="..."`
  attributes exist repo-wide with nothing reading them (no JS, no CSS) —
  looks like dead markup for an unbuilt custom-cursor feature. Present the
  file list to the owner; only remove on explicit confirmation, per the
  repo's confirm-before-deleting rule.
- **Owner-decision item:** re-check whether the ~30 untracked SEO-crawl
  CSVs in `public/` (`accessibility_all.csv`, `sitemaps_all.csv`,
  `structured_data_all.csv`, etc. — flagged in `STATUS.md`'s "Still open"
  section) are still present. If so, they're publicly downloadable as
  committed — needs an owner call (move out of `public/`, `.gitignore`, or
  delete), not a unilateral fix.
- Re-verify `public/d/02-messenger.gif` size (recorded ~322 KB by v1;
  confirm nothing else has regressed since).
- Review CSP in `next.config.js` — confirm the "tightening needs a nonce
  refactor, tracked separately" comment is still accurate; document, don't
  change (a nonce refactor is explicitly out of scope for this plan).
- Run Lighthouse (mobile + desktop) on `/`, `/work`, `/services`, `/admin`;
  compare against PR #165's baseline; document any regression.
- Phase ends with a version bump (see the versioning note above) and a PR
  titled `vX.NN — dead code & performance audit`.

Phases 2–4 (testing/docs, admin CRUD duplication audit, oversized-file
decomposition) are unchanged from the full plan doc — read it from PR #165
or `main` (post-merge) before starting them; don't reconstruct from memory.

## Open worktrees at the time of writing

```
C:/Users/moizjmj/Crystal Web Solution                                          content/founder-facts
.claude/worktrees/app-folder-organization-9445a3   398a5d0  claude/app-folder-organization-9445a3  (0 commits ahead of main — purpose unconfirmed, not part of this refactor)
.claude/worktrees/app-refactoring-plan-3524fd      f3c436b  claude/app-refactoring-plan-3524fd      (PR #165)
.claude/worktrees/pr-review-160-158966             4ced316  feat/service-rail-spotlight             (unrelated)
.claude/worktrees/refactor-phase1-dead-code-audit  (this worktree)             refactor/phase-1-dead-code-audit
```

Re-run `git worktree list` and `gh pr list --state open` before starting
Phase 1 — this list is a snapshot, not a live guarantee.

## Immediate next action

1. Check whether PR #165 has merged. If yes: `git fetch origin && git merge origin/main` (or rebase) on this branch, confirm `pnpm test` is 452/452, then start Phase 1's tasks above.
2. If #165 hasn't merged yet and Phase 1 work is wanted anyway: everything except the final `pnpm test` baseline gate can proceed (dead-dependency audit, `dynamic()` import audit, Lighthouse runs) — just don't declare Phase 1's test baseline "green" until the merge happens, and don't touch `tests/email.test.mjs` again.
3. Push this branch (`git push -u origin refactor/phase-1-dead-code-audit`) once there's real Phase 1 work to review — this handoff commit alone doesn't need its own PR.
