# VERSIONING.md — release naming convention

**This convention is mandatory for every agent (Claude, Codex, Gemini, or
human) working in this repository.** It exists so that every production
deploy on Vercel has a stable, sortable name that can be pointed at when
something breaks ("v1.07 is broken, v1.06 was fine").

## Format

Versions look like `v1.01`, `v1.02`, … `v1.99`, `v1.100`, `v1.101`, …

- `v<MAJOR>.<NN>` — `NN` is **zero-padded to two digits** below 10
  (`v1.09`). After `v1.99` the minor keeps counting: `v1.100`, `v1.101`, with
  no leading zero. Compare versions as numbers (`v1.100` > `v1.99`), not as
  strings.
- **The minor number bumps on every production deploy** (= every merge into
  `main`). No exceptions, including docs-only or one-line changes.
- **The major number bumps only for a full redesign or replatform**, decided
  by the owner (MJ), and resets the minor to `.01`.
- Numbers are never reused. Next version = one above the highest `vX.NN`
  named in `origin/main`'s merge log, `VERSION`, the top of `CHANGELOG.md`, or
  an open PR's title. A PR can deploy under a `vX.NN` title while bumping
  neither file (v1.43 did), so the files alone can lag production.
  `/version-bump` applies this.
- Reaching `.99` does **not** roll the major. The owner decided on
  2026-09-29, when nine queued PRs needed numbers past `v1.94`, that `v1.99`
  is followed by `v1.100`. Only the owner moves the major. The
  `release-policy` check (`scripts/release-policy.mjs`) enforces both.

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
