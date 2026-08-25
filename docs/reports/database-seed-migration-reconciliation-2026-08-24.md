# Local Database Seed and Live Migration Reconciliation

**Date:** 2026-08-24  
**Repository:** `ethancrystal/crystalwebsolution.com`  
**Scope clarification:** The App Flow Creator is treated as a supporting skill/tooling context. The product being reconciled here is Crystal Web Solution and its CRM/database platform.

## Changes made

| File | Purpose |
|---|---|
| `supabase/seed.sql` | Adds deterministic, local-only authentication fixtures for a client and employee/project-manager account. It intentionally does not add companies, projects, messages, blog posts, or an admin so existing pgTAP fixtures remain isolated and the pinned-admin rule is not polluted. |
| `supabase/migrations/0036_blog_taxonomy.sql` | Reconciles the live blog taxonomy additions: `category`, `tags`, `author_name`, tag validation function, constraints, and category/tag indexes. Guards make it safe for a clean rebuild or a schema where the timestamped live migration already ran. |
| `supabase/migrations/0037_blog_posts_anon_write_revoke.sql` | Reconciles the live anonymous-write hardening while preserving anonymous SELECT access for published posts. |
| `tests/crm/local-seed-and-blog-reconciliation.test.mjs` | Adds contract coverage for the seed path, deterministic local-only fixtures, taxonomy migration, and anonymous write revocation. |

## Live-to-local mapping

| Live migration | Local source artifact | Result |
|---|---|---|
| `20260820063550` / `0036_blog_taxonomy` | `supabase/migrations/0036_blog_taxonomy.sql` | Reconciled from live catalog metadata, including columns, constraints, function body, and indexes |
| `20260821234114` / `0037_blog_posts_anon_write_revoke` | `supabase/migrations/0037_blog_posts_anon_write_revoke.sql` | Reconciled from live grants and current blog access contract |

The live project also contains earlier timestamped migrations whose logical changes correspond to local `0025`–`0034` and the Gate 1 reconciliation files. Those historical names still require an owner-reviewed migration ledger decision before any production `db push`; this change does not apply DDL to live Supabase and does not claim that every historical filename has been renamed in the hosted migration table.

## Seed safety design

The seed file is intentionally suitable for `supabase db reset` only. It uses `example.test` identities, deterministic UUIDs, `ON CONFLICT (id) DO NOTHING`, and the final `client`/`project_manager` role values. It does not create an admin account because `0014_signup_account_type_and_single_admin.sql` pins the admin identity and enforces a single admin row. It also leaves domain fixtures to the existing SQL tests, which use stable UUIDs and global row-count assertions.

The local demo credentials documented in the seed are not production credentials:

| Account | Email | Password |
|---|---|---|
| Client | `seed-client@example.test` | `local-client-password` |
| Employee | `seed-employee@example.test` | `local-employee-password` |

## Verification

| Command | Result |
|---|---|
| `node --test tests/crm/local-seed-and-blog-reconciliation.test.mjs` | **PASS — 3 tests** |
| `pnpm test:crm` | **PASS — 246 tests** |
| `pnpm test` | **PASS — 384 tests** |
| `pnpm build` | **PASS — 56 routes generated** |
| `pnpm test:db` | **Not runnable in the current environment — Docker/local Postgres unavailable at `127.0.0.1:54322`** |
| `supabase migration list` | **Not runnable from the checkout — no linked Supabase project ref configured for the local CLI** |

The live Supabase catalog was inspected read-only before writing the migrations. The live `blog_posts` table has the three additive fields, tag validation constraint/function, category/tag indexes, and anonymous SELECT-only table access. No live mutation was performed.

## Required next operator step

Install/start Docker Desktop and run the following from the repository checkout:

```bash
pnpm exec supabase start
pnpm test:db
pnpm exec supabase db reset
pnpm test:db
```

Before applying the new migrations to a hosted project, link the intended project and compare the remote ledger again:

```bash
pnpm exec supabase link --project-ref <approved-project-ref>
pnpm exec supabase migration list
pnpm exec supabase db push --dry-run
```

Do not run `db push` until the remote migration ledger, exact live function definitions, and owner-approved rollout plan are reconciled. The new migration files are source-history reconciliation artifacts; they were not applied to live Supabase during this task.

## References

[1]: ../../supabase/seed.sql "Local-only Supabase seed"
[2]: ../../supabase/migrations/0036_blog_taxonomy.sql "Blog taxonomy reconciliation migration"
[3]: ../../supabase/migrations/0037_blog_posts_anon_write_revoke.sql "Anonymous blog-write revocation migration"
[4]: ../../tests/crm/local-seed-and-blog-reconciliation.test.mjs "Seed and migration contract tests"
[5]: ../CRM-GATE1-MIGRATION-RECONCILIATION.md "Existing migration ledger and preview gate"
[6]: ../CRM-MASTER-PLAN.md "CRM migration and release definition of done"
[7]: https://supabase.com/docs/guides/cli/local-development "Supabase local development"
[8]: https://supabase.com/docs/reference/cli/supabase-db-push "Supabase database push"
