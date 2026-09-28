# Supabase Security and Migration Guide

## Access Model

- Use the publishable/anon key only with properly configured RLS.
- Keep the service-role key in server-only runtime code and never return it to clients.
- Make authorization decisions from trusted session data, not client-provided user IDs.
- Scope queries to the authenticated user or organization at the data layer.
- Treat admin paths as explicit, audited exceptions.

## RLS Review

For each affected table, verify policies for SELECT, INSERT, UPDATE, and DELETE independently. Test ownership, organization membership, anonymous access, cross-tenant access, and privileged operations. Confirm that joins and views do not bypass intended policies.

## Migration Sequence

1. Add new tables, columns, indexes, or policies in a backward-compatible migration.
2. Deploy application code that can use both old and new structures when required.
3. Backfill in bounded, observable batches; avoid locking large tables unnecessarily.
4. Switch reads and writes after verification.
5. Remove obsolete paths only after logs and usage checks show they are unused.
6. Add a separate cleanup migration; never rewrite an applied migration.

## Query Quality

- Select only needed columns.
- Add indexes based on actual filters and sort order.
- Bound list queries and paginate large results.
- Avoid N+1 calls by designing feature-level data loaders or joins.
- Handle errors explicitly and distinguish not-found from permission denial.

## Verification Evidence

Record migration status, policy tests, type generation status, focused tests, and production-build output. Include the exact rollback or forward-fix plan for any irreversible database operation.
