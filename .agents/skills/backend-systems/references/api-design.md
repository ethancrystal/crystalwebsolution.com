# API Design

A backend API is a **contract**: a promise about inputs, outputs, errors, and failure behavior that clients code against. Design the contract before the implementation. Breaking it later is expensive; getting the unhappy paths right up front is the whole job.

## 1. Choose the style with rationale

| Style | Pick when | Cost / watch-outs |
|---|---|---|
| **REST/JSON over HTTP** | Resource CRUD, public APIs, cacheable reads, broad tooling, the default | Over/under-fetching; many round-trips for nested data |
| **GraphQL** | Many clients with divergent needs, deep nested graphs, mobile bandwidth | N+1 (needs dataloaders), query-depth/complexity attacks, HTTP caching is hard, harder rate-limiting |
| **gRPC / RPC** | Internal service-to-service, strict typed contracts, low latency, streaming | Not browser-native (needs grpc-web/proxy); binary is harder to debug |
| **tRPC / typed-RPC** | Single TS team owns both ends; want end-to-end types, no codegen | Couples client to server types; not a public/multi-language API |
| **Webhooks / SSE / WebSockets** | Server-push, live updates, long-lived streams | Delivery guarantees, reconnection, auth on the socket, scaling fan-out |

Default to REST unless a concrete requirement (graph depth, internal latency, push) justifies otherwise. Within Supabase, PostgREST gives REST-over-Postgres for free; reach for an edge function when you need custom logic, secrets, or orchestration.

## 2. Resource modeling (REST)

- **Nouns, not verbs.** `/orders`, `/orders/{id}`, `/orders/{id}/items`. Verbs become sub-resources or actions: `POST /orders/{id}/cancellation` over `POST /cancelOrder`.
- **HTTP methods carry semantics:** `GET` (safe, cacheable, no side effects), `POST` (create / non-idempotent action), `PUT` (full idempotent replace), `PATCH` (partial update), `DELETE` (idempotent removal).
- **Status codes mean something:** 200 OK, 201 Created (+`Location`), 202 Accepted (async), 204 No Content; 400 validation, 401 unauthenticated, 403 unauthorized, 404 not found, 409 conflict, 422 unprocessable, 429 rate-limited; 500 server, 503 unavailable. Never return 200 with an error body.
- **Don't leak the DB schema.** Resource shapes are a public contract; map them deliberately. Never expose internal sequential IDs if they enable enumeration — prefer UUIDs/ULIDs for public identifiers.

## 3. Consistent error contract (do this once, everywhere)

Pick one error envelope and use it for every 4xx/5xx. A good baseline is RFC 9457 Problem Details:

```json
{ "type": "https://api.example.com/errors/validation",
  "title": "Validation failed",
  "status": 422,
  "code": "VALIDATION_ERROR",
  "detail": "email is not a valid address",
  "errors": [{ "field": "email", "message": "invalid format" }],
  "request_id": "req_01H...", "instance": "/v1/users" }
```

Rules: stable machine-readable `code`; human `detail`; `request_id` for correlation; field-level errors for forms; **never** echo stack traces, SQL, or internal hostnames to clients. Distinguish *user-fixable* (4xx) from *server* (5xx) so clients know whether to retry.

## 4. Versioning

- Version from day one: URI prefix `/v1/` (simplest, most visible) or `Accept: application/vnd.api+json;version=1` header. Pick one and be consistent.
- **Additive changes are non-breaking** (new optional field, new endpoint) — no version bump. Breaking = removing/renaming a field, changing a type, tightening validation, changing defaults.
- Be a **tolerant reader / conservative writer**: ignore unknown request fields; never remove response fields clients may depend on without a version bump + deprecation window (`Deprecation`/`Sunset` headers).

## 5. Pagination (mandatory on every list endpoint)

- **Cursor/keyset** — default for large or live data. Stable under inserts, O(1): `WHERE (created_at, id) < ($cursor_ts, $cursor_id) ORDER BY created_at DESC, id DESC LIMIT $n+1`. Return an opaque `next_cursor`.
- **Offset/limit** — fine for small, bounded, admin-facing lists. Degrades (`OFFSET 100000` scans 100k rows) and skips/dupes rows when data shifts. Avoid for infinite scroll.
- Always enforce a **max page size** (e.g. cap `limit` at 100) and a sensible default. Never return an unbounded collection.

## 6. Idempotency (non-negotiable for unsafe mutations)

`GET/PUT/DELETE` are idempotent by definition; **`POST` is not** — and networks retry. Without protection, a retried "create order" / "charge card" double-acts.

- Accept an **`Idempotency-Key`** header (client-generated UUID) on create/charge endpoints.
- Server stores `(key, request_fingerprint) → response` in a table/Redis with a TTL. On replay of the same key: return the **stored response**; if the key is reused with a *different* body, return 409.
- Alternative for internal flows: derive a natural dedupe key and rely on a `UNIQUE` constraint to make the second insert a no-op/409.

## 7. Rate limiting & abuse control

- Algorithm: **token bucket** (allows bursts) or **sliding window**. Counters in Redis (`INCR`+`EXPIRE`) or Postgres for low volume.
- Scope per principal (API key / user / IP), not globally. Tier limits by plan.
- Return `429` with `Retry-After` and `RateLimit-Limit/Remaining/Reset` headers so good clients self-throttle.
- Layer it: WAF/CDN (crude IP), gateway (per-key), app (per-operation cost). Protect login/OTP/password-reset specifically (credential-stuffing).

## 8. Async & long-running operations

Don't hold an HTTP connection for slow work. Return **202 Accepted** + a status resource: `POST /reports` → `202` with `Location: /reports/{id}` (status `pending`→`done`/`failed`), client polls or gets a webhook. See `scaling-reliability.md` for the queue/worker pattern behind it.

## 9. Validation & contract hygiene

- Validate **at the boundary** with a schema (Zod / Pydantic / JSON Schema) before any logic touches the data. Reject unknown fields on writes where it matters; coerce/normalize deliberately.
- Treat `Content-Type`, size limits (max body), and array lengths as inputs — cap them. An unbounded array in a request body is a DoS vector.
- Publish the contract as **OpenAPI/GraphQL SDL/proto** and generate clients/types from it so client and server cannot drift.

## API-design definition of done
- [ ] Style chosen with a one-line rationale; contract written down (OpenAPI/SDL/proto/types).
- [ ] Resources/methods/status codes consistent; no verbs-in-paths, no 200-with-error.
- [ ] Single error envelope across all 4xx/5xx with stable `code` + `request_id`; no internal leakage.
- [ ] Versioning scheme chosen; changes classified breaking vs additive.
- [ ] Every list endpoint paginated with an enforced max page size.
- [ ] Unsafe `POST`s accept an idempotency key (or have a natural dedupe constraint).
- [ ] Rate limits on abuse-prone endpoints with `429` + `Retry-After`.
- [ ] All inputs schema-validated at the boundary with size/length caps.
