# VERSIONING.md — release naming convention

**This convention is mandatory for every agent (Claude, Codex, Gemini, or
human) working in this repository.** It exists so that every production
deploy on Vercel has a stable, sortable name that can be pointed at when
something breaks ("v1.07 is broken, v1.06 was fine").

## Format

Versions look like `v1.01`, `v1.02`, `v1.03`, … `v2.01`, `v2.02`, …

- `v<MAJOR>.<NN>` — `NN` is always **zero-padded to two digits**, so plain
  alphabetical sorting works everywhere: file lists, Vercel's deploy list,
  GitHub tags, grep output.
- **The minor number bumps on every production deploy** (= every merge into
  `main`). No exceptions, including docs-only or one-line changes.
- **The major number bumps only for a full redesign or replatform**, decided
  by the owner (MJ), and resets the minor to `.01`.
- Numbers are never reused. Next version = one above the highest `vX.NN`
  named in `origin/main`'s merge log, `VERSION`, the top of `CHANGELOG.md`, or
  an open PR's title. A PR can deploy under a `vX.NN` title while bumping
  neither file (v1.43 did), so the files alone can lag production.
  `/version-bump` applies this.
- If a major line ever reaches `.99`, the next deploy rolls to the next
  major (`v1.99` → `v2.01`). Don't go to three digits.
- **v2 approved (owner, 2026-09-30).** The v1 line ran out: with main at
  v1.96, seven queued PRs needed numbers and only v1.97–v1.99 were left.
  Queued PRs take `v2.01`, `v2.02`, … in merge order, and any later PR
  takes the next free v2 number. The `release-policy` check allows only the
  majors listed in `APPROVED_MAJORS` (`scripts/release-policy.mjs`); a move
  to v3 still needs the owner.

## Source of truth

1. **`VERSION`** (file at repo root) — the single authoritative current
   version. Whatever `main` says in this file IS the version in production.
2. **`CHANGELOG.md`** — one entry per version, newest first: version, date
   (YYYY-MM-DD), and a short list of what changed.
3. **Git tag** (`v1.02` on the merge commit in `main`) — nice to have for
   navigation; add it when you have git access, but the `VERSION` file wins
   if they ever disagree.

`package.json`'s `version` field is **not** part of this scheme — npm semver
cannot represent zero-padded minors, so that field stays untouched at
`1.0.0`. Never bump it as part of a release.

## The rule agents must follow on every PR to `main`

`main` is the production branch — merging a PR into `main` IS deploying to
production (see CLAUDE.md "Environments and deployment"). Therefore every PR
targeting `main` must contain, in the same PR:

1. **Bump `VERSION`** to the next number.
2. **Add the matching entry at the top of `CHANGELOG.md`** — version, today's
   date, short summary of the change.
3. **Title the PR starting with the version**, em-dash, then the summary:
   `v1.04 — fix contact form rate limiting`. PRs land as merge commits: the
   subject is `Merge pull request #N from …` and the first line of the
   message body is the PR title, which is how a deploy traces back to its
   version.
4. After the merge, if you have git access, tag it:
   `git tag v1.04 <merge-sha> && git push origin v1.04`.

If two PRs are open at once, whichever merges second must rebase and take
the next number — resolve the `VERSION`/`CHANGELOG.md` conflict by
incrementing, never by keeping a duplicate number.

## Quick reference

| Question | Answer |
| --- | --- |
| What's in production right now? | `VERSION` on `main` |
| What changed in it? | Top entry of `CHANGELOG.md` |
| Which deploy broke it? | Match the deploy's commit to its merge on `main` (`git log --first-parent origin/main`); the merge message body starts with the `vX.NN` title |
| Next version to use? | One above the highest `vX.NN` on `origin/main` or in an open PR title (`/version-bump`) |
