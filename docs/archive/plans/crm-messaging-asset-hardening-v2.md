# CRM — Project Messaging Thread & Asset Storage Hardening (v2, alignment-corrected)

**Date:** June 2026
**Status:** Proposed for approval
**Repository:** Crystal Web Solution — Next.js 15 (App Router) + Supabase
**Execution branch:** `agent/messaging-asset-hardening`

> This v2 replaces the earlier design. It is rewritten against the code that
> actually exists in the repo today. Every item is tagged so the scope is
> unambiguous:
> **[EXISTS]** already implemented — do not rebuild, only rely on it.
> **[UPDATE]** change/extend something already there.
> **[ADD]** genuinely new surface this slice introduces.

## 1. Goal and scope

Harden the project workspace so every message, attachment, upload, download and
realtime event is bound to exactly one project and visible only to an authorized
participant. Preserve the existing client / project-manager / admin model and the
current messaging + storage contract. No second chat system, no public bucket, no
new membership model.

## 2. What already exists (verified in code)

| Capability | Location | Status |
|---|---|---|
| `project_threads`, `project_messages`, `project_attachments` tables + RLS | `supabase/migrations/0009`–`0018` | **[EXISTS]** |
| Private `project-files` storage bucket | used in `components/crm/ProjectFiles.jsx`, `ProjectThread.jsx` | **[EXISTS]** |
| RPC `reserve_project_attachment` | called in `app/actions/project-actions.js:352` | **[EXISTS]** |
| RPC `finalize_project_attachment` | called in `app/actions/project-actions.js:475` | **[EXISTS]** |
| RPC `post_project_message` | called in `app/actions/project-actions.js:408` | **[EXISTS]** |
| Server actions `reserveAttachment`, `finalizeAttachment`, `postProjectMessage`, `editProjectMessage` | `app/actions/project-actions.js` | **[EXISTS]** |
| Read model `listProjectMessages(supabase, profile, projectId, cursor, limit)` returning `{ messages, nextCursor, threadId }` | `lib/crm/projects.js:476` | **[EXISTS]** — cursor pagination is already implemented at the data layer |
| Visibility + role predicates `isVisibility`, `canViewInternal`, `canPostVisibility` | `lib/crm/project-contract.mjs` | **[EXISTS]** |
| Realtime topics `sharedProjectTopic(projectId)`, `internalProjectTopic(projectId)` | `lib/crm/project-contract.mjs` | **[EXISTS]** |
| SECURITY DEFINER hardening (`set search_path`, `authenticated`-only grants) | `0002_crm_security_hardening.sql`, `0011_workspace_hardening_from_main.sql` | **[EXISTS]** |

**Correction vs the previous plan:** the old doc listed "no older-message
pagination" and proposed an *object-options* signature. The backend cursor
already exists and returns `nextCursor`; the real gap is **UI-side** (the thread
does not request older pages). Do **not** change the data-layer signature.

## 3. Real gaps this slice closes

| Gap | Evidence | Fix | Tag |
|---|---|---|---|
| Downloads bypass authorization — components create signed URLs client-side from a raw DB path | `ProjectFiles.jsx:37`, `ProjectThread.jsx:216` (`storage.from('project-files').createSignedUrl(...)`) | Route every download through a new authorization-checked server action; remove direct client signed-URL calls | **[ADD]** action + **[UPDATE]** two components |
| No client idempotency key on message send — retries can double-post | `ProjectThread.jsx` has no `crypto.randomUUID` / stable key | Generate one UUID per active send attempt, preserve across retries, forward to `postProjectMessage` | **[UPDATE]** composer + **[UPDATE]** action/RPC to accept & dedupe on it |
| Stale `pending` reservations linger after failed upload/finalize | reserve → upload → finalize is not transactional | Add a bounded-retention cleanup for `pending` rows that were never finalized; never touch `ready` linked rows | **[ADD]** cleanup function/schedule |
| No UI pagination for older messages | `listProjectMessages` supports `cursor` but the thread never sends one | Add "load older" using the existing `nextCursor`; de-dupe rows on realtime refresh | **[UPDATE]** `ProjectThread.jsx` only |
| `ProjectFiles` and `ProjectThread` duplicate upload/download flows | two components, two code paths | Share one project-asset lifecycle helper; both call the same reserve/finalize/download surface | **[UPDATE]** both components + **[ADD]** small shared helper |

## 4. Authorization & isolation rules (must hold even if the UI is bypassed)

| Resource | Client | Assigned PM | Admin |
|---|---|---|---|
| Shared message in own project | read / create / edit own | read / create / edit own | read / create / edit own |
| Internal message | never | read / create / edit own | read / create / edit own |
| Shared asset in own project | read + upload where UI permits | read + upload | read + upload |
| Internal asset | never read | read / upload | read / upload |
| Asset from another project | never read/reserve/finalize/download | never | only via a valid project-access path — never a raw storage-path bypass |
| Realtime topic | subscribe only to the authorized project topic; payload carries identifiers + visibility, never body/file bytes | same | same |

All SECURITY DEFINER functions keep `set search_path = pg_catalog, public, private, storage`, bind to `(select auth.uid())`, revoke `public`/`anon`, grant only `authenticated`. Storage object policies verify: private bucket, exact project path, pending-reservation ownership for upload, ready-attachment authorization for download, no overwrite of an existing object.

## 5. Interfaces

**[EXISTS] keep as-is** (do not change signatures):
```
reserveAttachment(formData)   -> { attachmentId, projectId, storagePath, fileName, mimeType, sizeBytes, visibility, status:'pending' }
finalizeAttachment(formData)  -> { attachmentId, status:'ready' }
postProjectMessage(formData)  -> { messageId }        // [UPDATE] also echo clientGeneratedId
listProjectMessages(supabase, profile, projectId, cursor, limit) -> { messages, nextCursor, threadId }
```

**[ADD] new server action:**
```
createAttachmentDownloadUrl(formData)
  -> { ok:true,  data:{ attachmentId, signedUrl, expiresIn: 60 } }
   | { ok:false, error }
// Verifies the caller may read this ready attachment in this project,
// THEN issues a short-lived signed URL. Components must call this
// instead of storage.createSignedUrl().
```

**[UPDATE] composer state** in `ProjectThread.jsx`: track an active-send idempotency key, staged attachment IDs, upload progress, and an error state that preserves the draft for retry.

## 6. Realtime behavior (unchanged contract, [UPDATE] consumption)

Realtime stays an acceleration layer, not an authorization layer. Keep the existing `sharedProjectTopic`/`internalProjectTopic` subscriptions. On any event, re-read through `listProjectMessages` (visibility-filtered) rather than appending raw `postgres_changes` payloads. De-dupe against a local pending send. Clean up channels on project change / unmount.

## 7. Failure handling & cleanup

Distinguish validation / authorization / upload / finalize / transient errors with generic user copy — never surface Supabase error strings or storage paths. Failed upload → reservation stays `pending`, eligible for cleanup. Failed finalize → retry, no message link. Failed post after ready → attachments stay unlinked, retryable, and are **not** shown in the read model until linked. Cleanup is idempotent and runs via a protected/scheduled service-role job **[ADD]**.

## 8. Acceptance tests (extends existing `tests/crm/*` + `supabase/tests`)

1. Client in `P1` cannot read/reserve/finalize/download a `P2` attachment.
2. Client sees shared messages + shared ready attachments only — never internal.
3. Assigned PM can read/create internal messages; unassigned employee cannot use the RPCs.
4. Admin reaches any authorized project but cannot bypass attachment auth via raw storage path.
5. Same `clientGeneratedId` submitted twice → one message, one attachment link set. **[new]**
6. A message cannot attach a pending / foreign-project / already-linked / foreign-owner / visibility-mismatched attachment.
7. A finalized attachment cannot be overwritten at the same path.
8. Failed upload leaves no readable attachment; stale pending is cleanup-eligible; ready linked is not. **[new]**
9. `createAttachmentDownloadUrl` issues a URL only for a readable ready attachment, short TTL, never from a client-side storage call. **[new]**
10. Realtime reloads only the authorized workspace; payload carries no body/bytes.
11. "Load older" returns stable, non-duplicated pages and preserves filtering during realtime refresh. **[new — UI only]**
12. `pnpm test`, `pnpm test:db`, `next build` and `git diff --check` pass; migration applies on a disposable preview.

## 9. Rollout & rollback

Apply the migration to a disposable Supabase preview first, seeded with two client companies, an assigned PM, an unassigned employee, an admin, shared/internal messages, pending+ready attachments, and a linked deliverable. Code deploy and DB migration are separate gates: ship code only after tests/build pass; migrate only after preview verification. Rollback disables new uploads/messages if needed, restores prior RPC definitions from the previous migration, preserves existing `ready` objects, and drops only newly added functions/indexes after confirming nothing calls them.
