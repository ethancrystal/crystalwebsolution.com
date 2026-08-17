# Gate C1 Notification Reliability Implementation Report

## Executive Summary

Gate C1 has been implemented on the isolated branch `gate-c/notification-reliability` and opened for review as [PR #82](https://github.com/ethancrystal/crystalwebsolution.com/pull/82). The branch is clean at commit `b3457316ac38f923e6a70935aabb6575026f17df`, all four GitHub checks are successful, and the pull request is mergeable against the current production `main` base. It has **not** been merged, and no production Supabase mutation, scheduler-secret change, historical-row update, or production email replay was performed.

This is an implementation-ready reliability slice, not a claim that the production database has already adopted the new contract. The database integration gate remains mandatory because this sandbox had no running local Supabase/PostgreSQL stack and no container runtime for `pnpm test:db`.

## Implemented Scope

The new migration `supabase/migrations/0033_notification_claim_leases.sql` is additive. It adds lease metadata, failure classification, a failure timestamp, and an email claim index while preserving the live queue's existing `pending`, `sent`, and `failed` status model. It creates a bounded `claim_notification_email_batch` RPC using `FOR UPDATE SKIP LOCKED`, due-row filtering, expired-lease recovery, and a generated lease token. It also creates lease-owned compare-and-set RPCs for successful and failed outcomes. The RPCs use fixed `search_path` values and are executable only by `service_role`; browser-facing roles are explicitly revoked.

The notification worker now claims only `email` rows through the protected RPC and completes each row through its lease-owned success/failure RPC. It leaves `in_app` and `realtime` rows untouched, retains stable Resend idempotency keys in the form `outbox-{id}`, bounds provider retry behavior at five attempts, classifies failures, and redacts provider error bodies before persistence. The worker response contains counts only.

Template coverage was formalized for the eleven email-capable CRM events currently declared by the application. The two activity events `project.note_posted` and `project.deliverable_created` remain explicitly in-app-only. The operations runbook now documents the Supabase `pg_cron` primary scheduler, Vercel daily backstop, Vault/Vercel secret synchronization, safe controlled-recipient smoke testing, stale-row no-spam policy, migration reconciliation, cutover sequencing, and the production-approval boundary.

## Verification Evidence

| Verification | Result |
|---|---|
| Focused Gate C contracts | 25 passing, 0 failing |
| Full repository suite | 303 passing, 0 failing |
| Production Next.js build | Passed with `pnpm build` |
| Offline PostgreSQL grammar parse | 12 top-level statements parsed |
| Whitespace check | `git diff --check` passed |
| GitHub PR checks | Docker, Docker CI, Vercel, and Vercel Preview Comments all successful |
| PR merge state | `CLEAN`; PR #82 remains open for review |
| Local database integration | Blocked: no local Supabase/PostgreSQL service and no container runtime |
| Production Supabase | Unchanged |

The source-level contracts are not a substitute for database verification. They cannot prove live RLS, grants, exact function overloads, concurrent transaction behavior, or migration-ledger alignment.

## Production-Approval Gates

Before applying `0033` or activating the new worker against production, the owner must approve the exact reviewed operation and the following checks must be completed in an isolated or approved preview database:

1. Reconcile the live Supabase migration ledger and inspect the exact live notification schema, constraints, indexes, function definitions, and grants.
2. Apply the full relevant migration chain plus `0033` in the isolated database and exercise concurrent claims, expired-lease reclaim, wrong-lease completion, retryable failure, terminal failure, and non-email channel isolation.
3. Rehearse the old-worker/new-worker cutover. The old production worker updates rows directly by `id`, so migration application and worker activation must be coordinated.
4. Verify the approved secret synchronization between Supabase Vault `crm_cron_secret` and Vercel `CRON_SECRET`/`CRM_CRON_SECRET` without exposing either value.
5. Run a controlled-recipient smoke test that verifies counts-only responses, stable provider idempotency, wrong-secret rejection, and no duplicate delivery after an ambiguous completion.
6. Keep historical rows unchanged. Do not replay failed email rows or bulk-clean unread rows as part of this migration.

## Remaining Operational Follow-up

The next reliability improvement should add monitoring for repeated claim-RPC failures, lease conflicts, terminal failures, queue age, and scheduler-route response health. Gate C2 notification-center work remains separate: role-shaped notification reads, admin exception inspection, and dashboard UI read-state polish are not included in this PR.

## References

[1]: `supabase/migrations/0033_notification_claim_leases.sql` "Atomic notification claim and lease migration"
[2]: `app/api/cron/crm-notifications/route.js` "Lease-owned notification worker"
[3]: `tests/crm/notification-claim-lease.test.mjs` "Claim and completion contracts"
[4]: `tests/crm/notification-coverage.test.mjs` "Producer and template coverage contracts"
[5]: `tests/crm/notification-scheduler.test.mjs` "Scheduler and operations contracts"
[6]: `docs/CRM-OPERATIONS.md` "Notification operations runbook"
[7]: `docs/reports/gate-c-security-review-2026-08-17.md` "OWASP and cutover security review"
[8]: https://github.com/ethancrystal/crystalwebsolution.com/pull/82 "Gate C1 pull request"
