# Testing

## Strategy

- Contract tests (Node runner) assert source shapes: routes, server actions, migrations read as SQL text, and the project read-model contract in `lib/crm/project-contract.mjs`.
- Component tests (vitest + jsdom) render marketing and a few CRM components.
- Database tests (pgTAP) exercise RLS, RPCs and triggers against the local Supabase stack.
- No suite runs against the live database, and there is no end-to-end suite yet. Verify UI behaviour in a real browser.

## Tools

- `node:test` for `tests/*.test.mjs` and `tests/crm/*.test.mjs`.
- vitest with Testing Library, configured in `vitest.config.js` (`tests/**/*.test.jsx`) and `vitest.setup.js`.
- pgTAP through `supabase test db`, in `supabase/tests/*.test.sql`.

## Conventions

- A migration adds a `tests/crm/migration-00NN-*.test.mjs` contract, plus a pgTAP file when it changes RLS or RPCs.
- Contract tests cannot see a component drift from its helper. Check that path in a browser.
- `test:e2e` names a planned Playwright gate. `tests/e2e/` does not exist yet.

## Run

- `pnpm test`, `pnpm test:crm`, `pnpm test:marketing`, `pnpm test:db`, `pnpm crm:verify`.
- A single file: `node --test tests/<file>.test.mjs`.

## Browser QA

- Entry: `pnpm dev` at `http://localhost:3000`, or `preview_start` using `.claude/launch.json`.
- Auth: `pnpm crm:provision-test-users` seeds one account per role.
- State: Supabase fixtures come from the provisioning script. The live project is read-only for verification.
