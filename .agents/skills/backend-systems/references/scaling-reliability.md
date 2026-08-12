# Scaling & Reliability Playbook

Reliability before scale: a system that's fast but wrong or down is worthless. **Measure before you optimize** — almost every "we need to scale" is actually one missing index, one N+1, or one missing cache. Profile, find the proven bottleneck, fix that. Premature sharding/microservices is how teams die.

## 1. Find the real bottleneck first

- Establish baselines: p50/p95/p99 latency, throughput, error rate, saturation (CPU, memory, connections, IOPS). Optimize the **p99 and the proven hot path**, not a guess.
- DB-first triage (where most backend latency lives): `EXPLAIN (ANALYZE, BUFFERS)` the slow query; check `pg_stat_statements` for the worst offenders; look for N+1 (a query in a loop → batch with `IN`/joins/dataloaders), missing indexes (`Seq Scan` on big tables), and unbounded result sets.
- Only after the DB is clean do you reach for caches, replicas, or more instances.

## 2. Caching (layered, with explicit invalidation)

| Layer | Caches | Watch |
|---|---|---|
| **CDN / edge** | Static assets, public cacheable `GET`s | Set `Cache-Control`/`ETag`; cache-key on auth/locale; never cache private data publicly |
| **Application (Redis/memory)** | Hot reads, computed results, sessions, rate counters | Invalidation + stampede control |
| **Database** | Materialized views, query plan reuse | Refresh strategy for matviews |

- **Invalidation is the hard part.** Choose deliberately: TTL (simplest, accept staleness), write-through (write cache+DB together), or explicit bust on write. Pattern: cache-aside (read cache → miss → DB → populate).
- **Stampede protection:** when a hot key expires, lock/single-flight the recompute or use stale-while-revalidate so 10k requests don't all hit the DB at once.
- Cache only what's read far more than written and tolerant of bounded staleness. Don't cache to mask a missing index.

## 3. Database scaling order of operations

1. **Indexes & query fixes** (covered above) — almost always the answer.
2. **Connection pooling** — Postgres connections are expensive and capped. Put a pooler (PgBouncer / **Supabase pooler**, transaction mode) in front; **serverless/edge functions must use the pooler** or they exhaust connections instantly. Size the pool to the DB's real limit, not "infinite."
3. **Read replicas** — offload read-heavy traffic; route reads to replicas, writes to primary. Accept **replication lag** (read-after-write can be stale → read from primary right after a write when consistency matters).
4. **Vertical scale** — bigger box buys time cheaply; do this before sharding.
5. **Partitioning** (declarative, by range/list) — for huge tables (time-series, logs); prunes scans and eases archival.
6. **Sharding** — last resort; massive operational complexity (cross-shard joins, rebalancing, distributed txns). Exhaust 1–5 first.

## 4. Resilience patterns for remote calls

Every network call (DB, cache, third-party API, another service) **will** fail or hang. Defend each one:

- **Timeouts on everything** — no unbounded waits; a hung dependency must not pin your workers. Set connect + read timeouts; budget the total request deadline and propagate it.
- **Retries with exponential backoff + jitter** — *only for idempotent/safe operations or with an idempotency key*. Cap attempts. Jitter prevents synchronized retry storms. Naive retries turn a blip into a self-DDoS (thundering herd).
- **Circuit breaker** — after N consecutive failures, open the circuit and fail fast for a cool-down instead of hammering a dead dependency; half-open to probe recovery.
- **Bulkheads / concurrency limits** — cap concurrent calls to each dependency so one slow dependency can't consume all connections/threads.
- **Graceful degradation** — serve stale cache, a default, or a partial response when a non-critical dependency is down. Decide per dependency what "degraded but up" looks like.
- **Idempotency** underpins all safe retries — see `api-design.md` §6.

## 5. Async work: queues, workers, scheduled jobs

Move slow/unreliable/spiky work off the request path. Return `202` and process in the background.

- **Delivery semantics:** most queues are **at-least-once** → duplicates happen → **workers must be idempotent** (dedupe key / upsert / "already processed?" check). "Exactly-once" is effectively at-least-once + idempotent consumers. At-most-once risks silent loss — rarely acceptable.
- **Reliability:** acknowledge only after successful processing (so a crash redelivers); **dead-letter queue** for poison messages after N attempts; retry with backoff; alert on DLQ depth and queue lag.
- **Ordering** is not guaranteed by default — design for out-of-order, or use a partition/FIFO key when you truly need it.
- **Outbox pattern** for "update DB + publish event" atomically: write the event to an `outbox` table in the same transaction as the state change, then a relay publishes it. Avoids the dual-write inconsistency.
- **Postgres/Supabase-native (free-tier-friendly):** `pg_cron` for scheduled jobs; a `jobs` table polled with `SELECT ... FOR UPDATE SKIP LOCKED` for a lightweight reliable queue; `pgmq` / `LISTEN/NOTIFY` for pub-sub. Reach for SQS/Kafka/Redis only when volume outgrows Postgres.
- Scheduled jobs must be **idempotent and overlap-safe** (a run can fire late or twice) — guard with a lock/lease.

## 6. Observability (you cannot operate what you cannot see)

- **Structured logs** (JSON) with a **correlation/request ID** propagated across services and into the queue. No PII/secrets in logs.
- **Metrics — RED** (Rate, Errors, Duration) per endpoint and **USE** (Utilization, Saturation, Errors) per resource. Plus DB pool usage, queue depth/lag, cache hit rate.
- **Distributed traces** on critical paths (OpenTelemetry) to see where latency goes across service hops and DB calls.
- **Health checks:** liveness (am I running?) vs readiness (can I serve? — deps reachable, pool available). Load balancers and orchestrators route on readiness.
- **SLOs + error budgets:** define the target (e.g. 99.9% of requests <300ms), measure it, alert on burn rate — alert on **symptoms users feel**, not every CPU blip.

## 7. Deploy & operate safely

- **Graceful shutdown:** on SIGTERM stop accepting new work, drain in-flight requests/jobs, close pools, then exit. Prevents dropped requests and connection leaks on every deploy.
- **Backpressure & load shedding:** bound queues/concurrency; shed/`503` excess load rather than collapsing. Better to reject 5% than to fall over for 100%.
- **Backups + tested restore:** automated backups, point-in-time recovery, and **a restore you have actually run**. An untested backup is not a backup. Know your RPO/RTO.
- **Safe rollout:** migrations expand→migrate→contract (see `data-modeling.md`); deploy behind feature flags; canary/blue-green; one-click rollback.

## Scaling & reliability definition of done
- [ ] Bottleneck identified by measurement (EXPLAIN/`pg_stat_statements`/profiling), not guessed; no N+1, no unbounded queries.
- [ ] Caching layered with an explicit invalidation strategy + stampede protection; only read-heavy, staleness-tolerant data cached.
- [ ] Connection pooling in place (pooler for serverless/edge); replicas/partitioning considered before sharding.
- [ ] Every remote call has timeouts; retries use backoff+jitter and are idempotent/keyed; circuit breakers + concurrency caps on flaky deps; degradation path defined.
- [ ] Slow/spiky work is async via an idempotent at-least-once worker with DLQ + backoff; scheduled jobs overlap-safe; dual-writes use the outbox pattern.
- [ ] Structured logs + correlation IDs; RED/USE metrics, queue lag, cache hit rate; traces on hot paths; liveness+readiness checks; SLOs with burn-rate alerts.
- [ ] Graceful shutdown (drain) on deploy; backpressure/load shedding; automated backups with a tested restore and known RPO/RTO; rollback plan.
