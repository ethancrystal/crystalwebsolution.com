# Gate C Attachment Cleanup RPC Preparation

**Date:** 17 August 2026

**Branch:** `gate-c/attachment-cleanup-rpc`

**Base:** production `main` at `060ec672a34c22a10ad24555899d00cb23d21ab8`

## Executive finding

The production notification worker calls `public.cleanup_stale_project_attachments(timestamptz)`, but the live Supabase catalog contains no function with that name and the recent edge logs show repeated HTTP 404 responses for the PostgREST RPC endpoint. The checked-in canonical definition exists inside staged migration `0032_project_asset_lifecycle_hardening.sql`, but migration 0032 was not applied to production. This branch prepares a narrowly scoped corrective migration, `0034_notification_attachment_cleanup_rpc.sql`, containing only that missing function and its trusted-worker grants.

No production migration, scheduler change, storage deletion, notification update, or email send was performed.

## Live attachment schema verified

The live `public.project_attachments` table matches the canonical cleanup contract:

| Field or control | Live result |
|---|---|
| Ownership | `project_id` is required; `uploaded_by` is required; both use the existing project/profile foreign keys |
| Lifecycle | `status` is required and constrained to `pending` or `ready` |
| Message linkage | `message_id` is nullable and cascades on message deletion |
| Storage identity | `storage_path` is required, length-bounded, and unique |
| Visibility | `shared` or `internal` |
| Storage table | `storage.objects` has `bucket_id` and `name`, which are sufficient for exact bucket/path deletion |
| Existing RLS | Authenticated users have SELECT policies only; shared rows require project access, internal rows require internal project access |
| Trusted table access | `service_role` has no direct table grants; the function runs as its owner under `SECURITY DEFINER` |

## Exact live notification claim/lease definitions

The live catalog query returned the following current functions:

| Function | Signature | Security/search path | Key behavior |
|---|---|---|---|
| `claim_notification_email_batch` | `(integer, integer)` | `SECURITY DEFINER`; `pg_catalog, public` | Validates limit 1–25 and lease 60–1800 seconds; selects only due pending email rows; uses `FOR UPDATE SKIP LOCKED`; recovers expired leases; increments attempts; returns a generated lease UUID |
| `mark_notification_email_sent` | `(uuid, uuid)` | `SECURITY DEFINER`; `pg_catalog, public` | Compare-and-set update requiring matching notification ID, lease ID, email channel, and pending status; clears lease fields after marking sent |
| `mark_notification_email_failed` | `(uuid, uuid, boolean, text, text, timestamptz)` | `SECURITY DEFINER`; `pg_catalog, public` | Validates an allowlisted failure code; updates only the matching lease-owned pending email row; retries only within the existing attempt policy; clears lease fields |

Execution grants for those three public functions were present for `service_role` and `postgres`. No `anon` or `authenticated` execution grants were returned. Their definitions and grants were not changed by this preparation branch.

The live claim functions preserve the existing queue status model: `pending`, `sent`, and `failed`. The corrective migration does not alter `notifications_outbox`, lease columns, indexes, claim functions, completion functions, or status constraints.

## Prepared migration behavior

`0034_notification_attachment_cleanup_rpc.sql` implements the canonical cleanup policy:

1. It accepts an optional cutoff, defaulting to 24 hours before the current time.
2. It selects only `pending`, unlinked (`message_id is null`) attachments created before the cutoff.
3. It uses `FOR UPDATE SKIP LOCKED` to avoid overlapping cleanup workers blocking each other.
4. It deletes only the exact matching object in the private `project-files` bucket by `bucket_id` and `storage_path`.
5. It then deletes only the still-pending, still-unlinked attachment metadata row.
6. It returns the number of deleted metadata rows.
7. It uses `SECURITY DEFINER` with fixed `search_path = pg_catalog, public, private, storage`.
8. It revokes execution from `public`, `anon`, and `authenticated`, then grants execution only to `service_role` and `postgres`.

Ready attachments, message-linked attachments, notification rows, lease state, and unrelated storage objects are outside the migration’s deletion predicate.

## Verification evidence

| Check | Result |
|---|---|
| Red phase | New cleanup-RPC contracts failed because migration 0034 did not exist |
| Focused cleanup-RPC contracts | 4 passing, 0 failing after implementation |
| CRM suite | 221 passing, 0 failing |
| Full repository suite | 307 passing, 0 failing |
| Production build | Passed; Next.js compiled successfully |
| Offline PostgreSQL parse | 3 statements parsed: function definition and two grant statements |
| `git diff --check` | Passed |
| Production Supabase | Not mutated |

## Production approval gates

This migration is prepared for review but must not be applied until the owner explicitly approves migration `0034_notification_attachment_cleanup_rpc.sql`. Before application, repeat the repository’s standard live preflight: reconcile the migration ledger, fetch the exact current function definition and grants, confirm the attachment schema and storage bucket, and verify that no conflicting migration number or function signature has appeared.

After approved application, verify that the migration ledger records the new migration exactly once, the cleanup function exists with the fixed search path and trusted-worker grants, and a scheduler invocation returns a non-404 response. Any cleanup test should use an isolated or explicitly approved preview database with synthetic pending/unlinked attachments; do not create synthetic production storage objects or delete historical production attachments merely to test the function.

## Knowledge boundary

This change is grounded only in Crystal Web Solution repository migrations, the canonical CRM plan, the current scheduler route, and live Supabase catalog/log evidence. No unrelated legal-CRM, Clio, matter-management, or generic knowledgebase material was used to design the migration.
