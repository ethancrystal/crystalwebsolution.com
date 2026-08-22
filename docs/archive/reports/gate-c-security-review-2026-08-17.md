# Gate C1 Notification Reliability Security Review

## Review Summary

The review scope is `supabase/migrations/0033_notification_claim_leases.sql`, `app/api/cron/crm-notifications/route.js`, the notification coverage tests, the scheduler/runbook contract, and the existing Resend boundary. The implementation replaces the worker's unowned email-row scan with a bounded, atomic claim/reclaim RPC and lease-owned success/failure compare-and-set RPCs. The migration is additive and does not introduce a `processing` status.

No high-severity OWASP finding was identified in the source review. The two conditions that remain before production application are operationally important: the migration must be tested against an isolated PostgreSQL/Supabase database, and the deployment must use an explicit old-worker/new-worker cutover because the current production worker predates the new RPCs. Production Supabase was not mutated during this review.

## Findings

### PASS A01 — Broken Access Control

The route rejects requests without a configured `CRM_CRON_SECRET` or `CRON_SECRET`, accepts Vercel's bearer form and the explicit scheduler header, and the new RPCs are revoked from `public`, `anon`, and `authenticated` and granted only to `service_role` (`route.js:101-116`; `0033_notification_claim_leases.sql:217-229`). Completion functions additionally require the exact `id`, `lease_id`, `channel = 'email'`, and `status = 'pending'` (`0033_notification_claim_leases.sql:149-152`, `207-210`).

The remaining control is procedural: preview-database grants and exact live function definitions must be verified before production application. Source-level checks cannot prove the live API-role privileges.

### PASS A02 — Cryptographic Failures

No new secret is hardcoded. The route reads secrets from environment variables and compares equal-length candidate values without short-circuiting through `timingSafeEquals` (`route.js:90-116`). The Resend API key remains inside the existing transport boundary. The stable provider idempotency key is derived from the queue row identifier and is not itself a credential (`route.js:211-218`).

### PASS A03 — Injection

The database functions use typed parameters and fixed schema-qualified relations. The worker uses Supabase RPC parameters rather than string-built SQL (`route.js:147-150`, `300-307`). Payload keys are mapped explicitly into template context rather than spread into HTML (`route.js:47-75`), and the existing template layer escapes HTML and URL attributes before rendering.

The migration was also parsed successfully by the offline PostgreSQL grammar parser as 12 top-level statements. This is only grammar validation; it does not validate PL/pgSQL behavior against a database.

### SUGGESTION A04 — Insecure Design / Cutover and Retry Semantics

The design correctly bounds each claim to 25 rows, leases a row for a bounded interval, recovers expired leases, caps provider retries at five in the worker, and relies on `outbox-{id}` for provider idempotency (`0033_notification_claim_leases.sql:64-124`; `route.js:22-30`, `211-218`, `239-249`).

The migration still permits a database-side claim while `attempts < 25`, whereas the worker terminalizes provider failures at five attempts. This is a deliberate crash-recovery tolerance, not a correctness failure, but it must be documented and tested as a policy. More importantly, the old production worker updates rows directly by `id`; applying the migration and deploying the new worker must be coordinated so old and new ownership semantics cannot overlap unexpectedly. The required fix is an isolated rehearsal plus a controlled two-phase deployment or maintenance-window cutover. No production migration should be applied until that rehearsal is complete.

### PASS A05 — Security Misconfiguration

The endpoint is explicitly dynamic, does not expose recipient data in its count response, fails closed when Supabase or email configuration is absent, and does not cache the mutating route (`route.js:5-7`, `129-167`). The runbook prohibits secrets, payloads, recipients, provider bodies, and lease tokens in operational output (`docs/CRM-OPERATIONS.md`).

### PASS A06 — Vulnerable and Outdated Components

Gate C does not add or upgrade runtime dependencies. The existing dependency set was not re-baselined by this slice. A separate dependency-audit task remains appropriate and is not implied by this review.

### PASS A07 — Identification and Authentication Failures

This endpoint is a scheduler surface rather than a user-login surface. It uses a bearer-like secret, supports Vercel's expected header form, fails closed when no secret is configured, and performs constant-time equal-length comparison (`route.js:78-116`). Secret rotation and synchronization between Vercel and Supabase Vault remain owner-controlled operational prerequisites. The route should not be exposed through a public scheduler until both values are verified.

### PASS A08 — Software and Data Integrity Failures

The migration and worker remain in the reviewed repository branch and are covered by source contracts, full tests, and a production build. No unsafe deserialization or dynamic code execution was added. The migration is additive and leaves historical rows untouched. Merge review and isolated database rehearsal remain required integrity controls.

### SUGGESTION A09 — Security Logging and Monitoring

The worker logs row identifiers and database error messages when claim, cleanup, or completion operations fail (`route.js:152-154`, `228-231`, `276-278`, `309-310`). It does not log provider error bodies after the redaction change (`route.js:285-291`). The current behavior is acceptable for the reviewed slice because the logged errors originate from the trusted Supabase client boundary, but production operations should confirm that platform logs do not capture request headers or environment values and should add an alert on repeated claim-RPC failures, lease conflicts, and terminal failures.

### PASS A10 — Server-Side Request Forgery

The worker performs no server-side request to a user-supplied URL. Project, review, and deal links are constructed from the configured application origin and database identifiers (`route.js:33-45`, `54-75`). The email transport remains the only external network boundary and receives a configured recipient address through the existing server-side admin path.

## Required Remediation and Release Gates

1. Start a disposable local Supabase/PostgreSQL stack or provide an approved preview database, then apply the full checked-in migration chain plus `0033` and exercise concurrent claim, expired-lease reclaim, wrong-lease completion, terminal failure, and retryable failure cases.
2. Reconcile the live migration ledger and inspect `pg_get_functiondef`, grants, constraints, and indexes before any production application. Do not infer live state from filename `0033`.
3. Choose and document the old-worker/new-worker cutover sequence. The safest sequence is: merge code only after review, apply the additive migration in an approved window, verify RPC grants and a zero/controlled claim smoke test, then enable the new worker path and monitor before removing any legacy compatibility.
4. Verify `crm_cron_secret` in Supabase Vault matches the approved Vercel secret value without printing either value, then test authorized and unauthorized scheduler requests.
5. Keep all historical notification rows untouched. Do not replay failed email rows or bulk-mark unread rows during this migration.
6. Add operational alerts for claim failures, repeated lease conflicts, terminal failures, and abnormal queue age before calling Gate C operationally complete.

## Verification Evidence

- Focused Gate C contracts: 25 passing, 0 failing.
- Full repository suite after the final redaction change: 303 passing, 0 failing.
- Production build after the final redaction change: passed with `pnpm build`.
- Offline PostgreSQL grammar parse: 12 top-level statements parsed.
- Local database integration command: blocked because the sandbox has no running local PostgreSQL/Supabase stack and no container runtime. No production database mutation was attempted.

## References

[1]: `app/api/cron/crm-notifications/route.js` "Gate C notification worker"
[2]: `supabase/migrations/0033_notification_claim_leases.sql` "Gate C additive claim and lease migration"
[3]: `docs/CRM-OPERATIONS.md` "CRM notification operations runbook"
[4]: `lib/email/resend.js` "Resend transport and retry classification"
[5]: `tests/crm/notification-claim-lease.test.mjs` "Claim and lease source contracts"
[6]: `tests/crm/notification-coverage.test.mjs` "Producer and template coverage contracts"
[7]: `tests/crm/notification-scheduler.test.mjs` "Scheduler and operations contracts"
