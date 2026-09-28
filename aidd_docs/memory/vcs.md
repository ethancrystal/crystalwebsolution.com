# VCS

## Setup

- Main branch: `main`. Every merge deploys to production through Vercel's Git integration.
- Platform: GitHub, `ethancrystal/crystalwebsolution.com`.
- `preview` and `production` branches are historical. Never base work on them.

## Branches

- Format: `<type>/<slug>`, for example `claude/admin-moiz`, `fix/...`, `db/0041-client-read-scope`.
- Types in use: `claude`, `seo`, `feat`, `fix`, `docs`, `db`, `crm`, `content`, `chore`.

## Commits

- Convention: the project's own release naming, not conventional commits.
- Format: the PR title is `vX.NN — <summary>` (em-dash, zero-padded). PRs land as merge commits whose message body starts with that title.
- Rules: every PR to `main` bumps `VERSION` and adds the top `CHANGELOG.md` entry. `package.json`'s version stays untouched.
- Next number: one above the highest `vX.NN` in the `origin/main` merge log, `VERSION`, the top of `CHANGELOG.md`, and any open PR title above it. Stale open PRs below that are ignored. `/version-bump` applies this.

## Commit Strategy

AI should auto commit: `never`. Commit only when the owner asks. Never run `vercel --prod`.
