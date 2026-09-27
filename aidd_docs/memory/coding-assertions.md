# Coding Assertions

## Before commit

| Order | Command | Checks |
| ----- | ------- | ------ |
| 1 | `pnpm test` | Node contract tests. Two globs: `tests/*.test.mjs` and `tests/crm/*.test.mjs`. |
| 2 | `pnpm test:marketing` | vitest + jsdom component tests |
| 3 | `git status` | `tsconfig.json` untouched. `next build` and `next dev` rewrite it; revert with `git checkout -- tsconfig.json`. |

## Before push

| Order | Command | Checks |
| ----- | ------- | ------ |
| 1 | `pnpm build` with the CI placeholder env and `NODE_ENV=production` | Routes and imports compile. This mirrors the CI `test` job. |
| 2 | `pnpm test:db` | RLS and migrations under pgTAP. Needs the local Supabase stack, so run it when SQL changed. |
| 3 | `VERSION` + `CHANGELOG.md` bumped | Required for every PR to `main`. Take the number from `git log main`, not from the file. |

## Behavior

If a fix is needed, spawn one agent per failing assertion.
