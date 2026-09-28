# Schema Detection

The archaeologist detects database schemas from three sources.

## Supabase Migrations

Reads `.sql` files in `supabase/migrations/` and extracts:

- `CREATE TABLE` statements
- `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `CREATE POLICY` statements
- `CREATE FUNCTION` statements

## Drizzle ORM

Looks for schema files in these locations:
- `db/schema.ts`
- `src/db/schema.ts`
- `lib/db/schema.ts`

Detects `pgTable(...)`, `sqliteTable(...)`, `mysqlTable(...)` declarations.

## Prisma

Reads `prisma/schema.prisma` and extracts `model` blocks.

## Schema Drift Check

When both migrations and Drizzle schema exist, the tool lists tables from both sources to surface any mismatch.
