# CRM Messaging and Asset Hardening Implementation Plan

> **For agentic workers:** Implement this plan task-by-task with the repository’s red-test → minimal implementation → full verification → review → pull-request protocol.

**Goal:** Make project messaging and project-file access retry-safe, project-scoped, visibility-safe, and protected against direct storage-path downloads while preserving the existing three-role CRM architecture.

**Architecture:** Keep `app/actions/project-actions.js` as the protected mutation boundary, `lib/crm/projects.js` as the visibility-filtered read model, and the private `project-files` bucket as the byte transport. Add one protected download action that first resolves an authorized ready record through the authenticated Supabase server client, then creates a short-lived URL server-side. Use the existing identifiers-only Realtime broadcast trigger and re-read through the authorized read model instead of consuming raw database row payloads.

**Tech Stack:** Next.js 15 App Router, React 19 plain JSX, Supabase Auth/Postgres/Storage/Realtime, PostgreSQL migrations, Node test runner, and pnpm.

**Spec:** `docs/superpowers/specs/2026-08-16-project-messaging-asset-storage-hardening-design.md`

## Global Constraints

- Work only on `agent/crm-messaging-hardening`, based on the reconciled Gate 1 branch `4ce7208`.
- Do not apply migration 0032 or any other SQL to production.
- Do not add a second chat table, public bucket, identity store, or browser service-role path.
- Clients see shared records only; employees require active assignment; admins use protected role-shaped paths.
- The browser may upload bytes to a previously reserved private path, but it may not decide project ownership, visibility, readiness, or download authorization.
- Every security-definer function uses a fixed search path, `auth.uid()`, qualified relations, and least-privilege grants.
- Every new production behavior requires a focused failing test before implementation.

---

### Task 1: Add red contracts for the asset lifecycle, downloads, retries, and realtime

**Files:**

- Create: `tests/crm/messaging-asset-hardening.test.mjs`
- Create: `tests/crm/messaging-asset-migration.test.mjs`
- Test against: `app/actions/project-actions.js`, `components/crm/ProjectThread.jsx`, `components/crm/ProjectFiles.jsx`, `app/api/cron/crm-notifications/route.js`, and `supabase/migrations/0032_project_asset_lifecycle_hardening.sql`

**Interfaces:**

- `createAttachmentDownloadUrl(formData)` returns `{ ok: true, data: { attachmentId, signedUrl, expiresIn: 60 }, requestId }` or the standard failure result.
- Migration 0032 provides `cleanup_stale_project_attachments(timestamptz)` for the trusted notification worker.

- [ ] Write assertions that the download action validates `projectId`, `attachmentId`, and `kind`, performs a visibility-filtered database lookup, and creates the URL server-side with a 60-second TTL.
- [ ] Write assertions that neither `ProjectThread.jsx` nor `ProjectFiles.jsx` calls `storage.createSignedUrl`.
- [ ] Write assertions that the composer preserves one `crypto.randomUUID()` message attempt ID through retries and sends `attachmentIds` atomically with the message.
- [ ] Write assertions that uploads use `upsert: false`, retain staged state on failure, and only clear staged attachments after a successful message post.
- [ ] Write assertions that Realtime listens for broadcast identifiers and re-reads rather than appending raw row payloads.
- [ ] Write migration assertions for stale-pending cleanup, fixed search path, owner/project/status predicates, service-role-only execution, and protection of ready or linked attachments.
- [ ] Run the focused contracts and confirm they fail because the new action, migration, and UI contracts are absent.

### Task 2: Add the minimal stale-pending cleanup migration

**Files:**

- Create: `supabase/migrations/0032_project_asset_lifecycle_hardening.sql`
- Test: `tests/crm/messaging-asset-migration.test.mjs`

- [ ] Create `cleanup_stale_project_attachments(p_before timestamptz default now() - interval '24 hours') returns integer` as a `SECURITY DEFINER` function with `set search_path = pg_catalog, public, private, storage`.
- [ ] Select only `pending` attachments older than `p_before`, with `message_id is null`; delete matching `project-files` storage objects by exact `storage_path`, then delete only those metadata rows.
- [ ] Ensure the function cannot remove `ready` rows or any attachment already linked to a message.
- [ ] Revoke execution from `PUBLIC`, `anon`, and `authenticated`; grant execution only to `service_role` and `postgres`.
- [ ] Run the migration contract tests until green.

### Task 3: Add the protected download server action and cron cleanup call

**Files:**

- Modify: `app/actions/project-actions.js`
- Modify: `app/api/cron/crm-notifications/route.js`
- Test: `tests/crm/project-actions.test.mjs`, `tests/crm/notifications.test.mjs`, `tests/crm/messaging-asset-hardening.test.mjs`

- [ ] Export `createAttachmentDownloadUrl(formData)` from the action module.
- [ ] Accept only `kind=attachment` or `kind=deliverable`, canonical UUIDs, and a valid project ID.
- [ ] For attachments, query the authenticated client for the same project, `status = ready`, and the requested attachment ID. For deliverables, require the same project and a non-draft status. Do not return `storage_path` to the browser.
- [ ] Call `supabase.storage.from('project-files').createSignedUrl(storagePath, 60)` only inside the server action after the authorized record lookup. Return a generic failure for missing, unauthorized, or expired records.
- [ ] Call the cleanup RPC from the already-authorized cron worker with a 24-hour cutoff. Include only a count in the cron response and preserve the existing outbox response contract.
- [ ] Run focused action and notification tests until green.

### Task 4: Make the message composer retry-safe and attachment-aware

**Files:**

- Modify: `components/crm/ProjectThread.jsx`
- Test: `tests/crm/messaging-asset-hardening.test.mjs`

- [ ] Add `messageAttemptIdRef` and generate one UUID when a non-empty draft first sends. Put it in `clientGeneratedId` and do not replace it on a failed retry.
- [ ] Keep the body and staged attachment state after a failed post. Clear them only after the server returns success.
- [ ] Upload selected files through reservation → private storage upload with `upsert: false` → finalization, and retain ready attachment IDs as staged message attachments until the atomic post.
- [ ] Send all staged IDs as repeated `attachmentIds` fields and prevent sending while any staged upload is still pending.
- [ ] Add a retry affordance for failed staged uploads without exposing storage paths or provider errors.
- [ ] Replace direct signed URL creation with `createAttachmentDownloadUrl` for message attachments.
- [ ] Add cursor state and a bounded “Load older messages” action using the existing `listProjectMessages` cursor contract. Merge by message ID to prevent duplicates.
- [ ] Subscribe to the existing project visibility broadcast topics, ignore events for other project IDs, and re-read through `listProjectMessages`; do not consume row bodies from Realtime payloads.
- [ ] Run focused component-source contracts and the full CRM test suite.

### Task 5: Route deliverable downloads through the same protected action

**Files:**

- Modify: `components/crm/ProjectFiles.jsx`
- Test: `tests/crm/messaging-asset-hardening.test.mjs`

- [ ] Remove the browser Supabase Storage client from the component.
- [ ] Call `createAttachmentDownloadUrl` with `kind=deliverable`, the current project ID, and the deliverable ID.
- [ ] Preserve the existing deliverable upload/publish flow and generic error states.
- [ ] Keep download buttons keyboard-operable and prevent duplicate requests while a file is opening.
- [ ] Run focused component contracts and build.

### Task 6: Document, review, and package the isolated slice

**Files:**

- Create: `docs/CRM-MESSAGING-ASSET-HARDENING-ROLLOUT.md`
- Modify: `docs/CRM-OPERATIONS.md` only if the cleanup/cron contract changes operational commands.

- [ ] Document migration 0032, cleanup behavior, protected download behavior, preview variables, rollback, and the explicit no-production-mutation state.
- [ ] Run `pnpm test`, `pnpm build`, `git diff --check`, and the focused migration/action/component suites.
- [ ] Attempt `pnpm test:db`; if local Docker/Postgres is unavailable, record the exact failure and keep the preview gate open.
- [ ] Perform a focused authorization and SQL review of the complete diff.
- [ ] Commit the slice, push the feature branch, and open a pull request against `main` without applying migration 0032.
