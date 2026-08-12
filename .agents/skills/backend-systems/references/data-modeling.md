# Data Modeling

The schema outlives the code. A wrong column type or a missing constraint becomes a years-long migration; a missing index becomes a 2am incident. Model deliberately, enforce invariants in the database, and let access patterns — not aesthetics — drive shape.

## 1. Pick the store by access pattern

- **Relational (Postgres) — the default.** Strong consistency, joins, transactions, rich constraints, `JSONB` for flexible columns, FTS, `pgvector`. *One Postgres goes remarkably far.* Supabase = Postgres + RLS + edge functions.
- **Document (Mongo/DynamoDB)** — you know the single-entity access patterns up front, no cross-entity joins, high write throughput on a partition key. DynamoDB punishes you if access patterns change.
- **KV / cache (Redis)** — sessions, rate-limit counters, hot-read cache, locks, light queues. Ephemeral by default.
- **Search (pg `tsvector` / Elastic / Meilisearch)** — full-text/faceted. Try Postgres FTS first; add a cluster only when ranking/scale demands it.
- **Time-series / analytics (Timescale, ClickHouse, DuckDB)** — high-cardinality metrics, append-heavy, OLAP scans. Don't run analytics on your OLTP primary.

Add a second store only when an access pattern **demonstrably** doesn't fit the first. Every store is another thing to back up, secure, and keep consistent.

## 2. Relational schema design

- **Model entities and relationships explicitly.** 1:1 (same table or split for rarely-read columns), 1:N (FK on the child), N:M (join table with a composite PK).
- **Right types, not stringly-typed:** `timestamptz` (never naive `timestamp`), `numeric` for money (**never** float), `uuid`/`bigint` for keys, `enum`/lookup tables for fixed sets, `jsonb` for semi-structured. Store money as integer minor units or `numeric`, plus a currency column.
- **Constraints are the spec, enforced:** `NOT NULL` by default; `UNIQUE` for natural keys; `FOREIGN KEY` with deliberate `ON DELETE` (`RESTRICT`/`CASCADE`/`SET NULL`); `CHECK` for invariants (`amount >= 0`, valid state transitions). Application checks are advisory and racy; the DB constraint is the truth.
- **Keys:** surrogate PK (`bigint generated always as identity` or `uuid`) for internal joins; expose UUID/ULID externally to avoid enumeration. Avoid mutable natural keys as PKs.
- **Audit columns** everywhere: `created_at`, `updated_at` (trigger-maintained), and `deleted_at` if soft-deleting. Soft delete only when you truly need history — it complicates every query and uniqueness constraint (use partial unique indexes `WHERE deleted_at IS NULL`).

## 3. Normalize, then denormalize on evidence

- **Normalize to ~3NF first.** Each fact in one place → no update anomalies. This is the correct default.
- **Denormalize deliberately** for a measured read bottleneck: duplicated columns, summary/rollup tables, or materialized views. The cost is you now own keeping copies in sync (triggers, jobs, transactional writes). Don't pre-denormalize on a hunch.
- `JSONB` is for genuinely variable/sparse attributes — not an excuse to skip modeling core relational data you query and join on. You can index into JSONB (`GIN`, expression indexes) but it's slower and weaker than real columns.

## 4. Indexing strategy

- **Index every column you filter, join, or sort on** in a hot query — and only those. Each index speeds reads but taxes every write and consumes space.
- **Composite index column order = equality first, then range/sort:** a query `WHERE tenant_id = ? AND created_at > ? ORDER BY created_at` wants `(tenant_id, created_at)`. Leftmost-prefix rule: that index also serves `WHERE tenant_id = ?`.
- **Specialized indexes:** partial (`WHERE status='active'`) for hot subsets; covering/`INCLUDE` to enable index-only scans; `GIN` for `jsonb`/arrays/FTS; `BRIN` for huge append-only time-ordered tables; expression indexes for `lower(email)`.
- **Always add the FK-side index** — Postgres does *not* auto-index foreign keys, and unindexed FKs cause slow joins and slow cascading deletes/locks.
- **Verify, don't guess:** `EXPLAIN (ANALYZE, BUFFERS)`. Look for `Seq Scan` on large tables, bad row estimates, and nested loops over big sets. Supabase `get_advisors` flags missing indexes and unindexed FKs.

## 5. Transactions & isolation

- Wrap **multi-step writes that must all-or-nothing succeed** in a transaction. Keep them short — long transactions hold locks and bloat MVCC.
- **Isolation levels (Postgres default = Read Committed):**
  - *Read Committed* — sees each statement's snapshot; fine for most CRUD.
  - *Repeatable Read* — stable snapshot for the whole txn; needed for multi-read consistency / read-modify-write.
  - *Serializable* — as if transactions ran one at a time; safest for invariants across rows (e.g. "no double-booking"). Costs retries on serialization failures — **you must retry** on `40001`.
- **Concurrency control:** *optimistic* (a `version` column / `updated_at`; `UPDATE ... WHERE version = $expected`, 0 rows = conflict → 409) for low contention; *pessimistic* (`SELECT ... FOR UPDATE`) for hot rows like inventory/balances. Prevent lost updates explicitly — never read-then-write without one of these.
- **Lock ordering:** always acquire locks in a consistent order to avoid deadlocks; keep critical sections tiny.

## 6. Migrations (expand → migrate → contract)

Every schema change ships as a **versioned, reversible SQL migration file** (`supabase/migrations/*.sql`), never an ad-hoc dashboard edit. For zero-downtime against a live app:

1. **Expand** — add the new nullable column/table/index *concurrently*; deploy code that writes both old and new.
2. **Migrate/backfill** — backfill in **batches** (not one giant `UPDATE` that locks the table); switch reads to the new shape.
3. **Contract** — once nothing reads the old shape, drop it.

Hazards: `CREATE INDEX` locks writes → use `CREATE INDEX CONCURRENTLY`. Adding a `NOT NULL` column with a volatile default rewrites the table → add nullable, backfill, then set `NOT NULL` (validate separately with `NOT VALID` + `VALIDATE CONSTRAINT`). Never rename-in-place a column an old deploy still reads. Test every migration's rollback.

## 7. Multi-tenancy (relevant for SaaS / Supabase)

- **Shared schema + `tenant_id` column + RLS** — the default; cheapest, simplest, scales well. Every tenant-scoped table carries `tenant_id`, indexed first in composite keys, with an RLS policy filtering by the JWT/session tenant. See `security-checklist.md`.
- *Schema-per-tenant* or *DB-per-tenant* only for strong isolation/compliance needs — far higher operational cost.

## Data-modeling definition of done
- [ ] Store chosen per access pattern with explicit rationale.
- [ ] Correct types (`timestamptz`, `numeric` for money, `uuid`/`bigint` keys); no stringly-typed data.
- [ ] Invariants enforced in the DB (`NOT NULL`, `UNIQUE`, FK with chosen `ON DELETE`, `CHECK`).
- [ ] Indexes for every hot filter/join/sort incl. FK columns; verified with `EXPLAIN ANALYZE`; no large `Seq Scan`.
- [ ] Multi-step writes are transactional; lost-update protection (optimistic version or `FOR UPDATE`) where rows are contended.
- [ ] Changes ship as reversible expand→migrate→contract migrations; backfills batched; index builds concurrent.
- [ ] Multi-tenant tables carry `tenant_id` + RLS.
