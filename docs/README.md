# Documentation map

Planning docs used to live in three parallel places (`plan/`, `plans/`,
`docs/superpowers/plans/`), which is how five different documents ended up
describing the same CRM work at five different moments. They are now all under
`docs/plans/`. Nothing was deleted; historical documents moved to
`docs/archive/`.

## Where things live

| Path | What it holds |
| --- | --- |
| `docs/CRM-MASTER-PLAN.md` | **Canonical** CRM product/architecture source of truth. |
| `docs/CRM-OPERATIONS.md` | Live operational runbook — outbox worker, pg_cron scheduler, secret rotation, auth rate limiting. Not a plan; keep separate. |
| `docs/plans/` | Every plan and spec, active or superseded. Dated filenames are point-in-time build plans. |
| `docs/plans/audits/` | Three CRM audits (auth/RBAC, client workspace, operations data). |
| `docs/adr/` | Architecture decision records. |
| `docs/archive/` | Completed or superseded documents kept for history. Nothing here should be treated as current. |
| `docs/reports/` | Dated evidence reports from verification sessions. |
| `docs/ux/` | Jobs-to-be-done, journeys, UX specs. |
| `STATUS.md` | Running session log. History, not instruction. |

## Which CRM document is authoritative

`docs/CRM-MASTER-PLAN.md`. It is the newest comprehensive document (16 Aug
2026), the broadest in scope, and its §19 already reconciles the other
sources. The rest of `docs/plans/` is supporting detail and history.

Two caveats when reading it:

- Its header says no implementation should begin until approved. That is
  stale — large parts of what it describes are shipped.
- It is not yet complete. The transplant backlog below lists content that
  currently exists **only** in other documents.

## Transplant backlog

An audit of the overlapping CRM documents found content that lives in exactly
one place and would be lost if that document were archived. None of these have
been merged yet; the source document must stay live until its row is done.

| Content | Only exists in | Why it matters |
| --- | --- | --- |
| Five canonical project categories (`web_design`, `logo_creation`, `branding`, `marketing`, `ai_automation`) and the legacy taxonomy mapping | `docs/plans/2026-07-30-production-multi-user-crm.md` | A live product decision recorded nowhere else. |
| Full `projects` / `project_threads` / `project_messages` DDL, the 16-index list, and the legacy-table `raise exception` guard | same | The only copy of the schema contract. |
| Title/brief bounds (3–120 / 1–5000), file limits (10 MiB, five MIME types), 60s signed-URL TTL, message pagination 50/100 | same | Concrete limits the code depends on. |
| Incident history — the `ProjectThread` fake-viewer bug, the `pg_catalog.coalesce` invalid-syntax class, and the Vercel cron/env incident that left the CRM publicly reachable | `docs/plans/feature-crm-remaining-work-2.md` | Three real defects that went undetected for weeks. Worth keeping as a "how this fails" record. |
| Open product decisions: `priority`/`client_visible` RPC exposure, `budget_amount`/`currency` client visibility, and `NotesPanel` company/contact scoping | same | Unresolved. `NotesPanel` currently never loads or saves on company and contact pages. |
| REQ-008: the Supabase Auth redirect-URL allow-list is empty, so every emailed auth link is rejected | same | Owner-only blocker; not fixable from a coding session. |
| `pnpm crm:verify:preview` harness, its ten expected results and fifteen `CRM_PREVIEW_*` variables | `docs/CRM-GATE1-MIGRATION-RECONCILIATION.md` | The executable form of the isolation acceptance criteria. |
| Deployment order (merge app PR → deploy → then apply the migration) and the never-hand-edit-production-functions rollback rule | `docs/CRM-MESSAGING-ASSET-HARDENING-ROLLOUT.md` | Still carries a live approval gate for migration `0032`. |
| The `[EXISTS]/[UPDATE]/[ADD]` code inventory and the five `[new]` acceptance tests | `docs/plans/crm-messaging-asset-hardening-v2.md` | The most accurate map of what is actually implemented. |
| Analytics acceptance row and the "Evidence" column | `docs/CRM-END-TO-END-PLAN.md` | The only doc treating analytics as an acceptance area. |

## Unresolved conflicts

These are real disagreements between documents, not wording differences. Each
needs a decision and a note recording which source won.

1. **Storage path format.** `docs/CRM-MASTER-PLAN.md` §11.2 says
   `projects/{projectId}/attachments/{attachmentId}`;
   `docs/plans/2026-07-30-production-multi-user-crm.md` Task 3 Step 7 says
   `{project_id}/{attachment_id}/{safe_filename}`. Verify against the live
   bucket and record the winner.
2. **Who may assign work.** `docs/CRM-END-TO-END-PLAN.md` grants project
   managers the ability to claim eligible unassigned work. Every other
   document — master plan and both build plans — says assignment is
   admin-only. This is an authorization rule; it should not stay ambiguous.
3. **Branch model (resolved, but stated in both directions).**
   `docs/plans/feature-crm-remaining-work-2.md` CON-002 mandates working on
   `preview`. That is superseded: `main` is the Vercel production branch and
   CRM visibility is controlled by `NEXT_PUBLIC_CRM_ENABLED`, per `CLAUDE.md`.
   The older constraint should be marked superseded in place rather than
   silently dropped.

## Conventions

- New plans go in `docs/plans/` with a `YYYY-MM-DD-` prefix when they are
  point-in-time build plans, or a plain descriptive name when they are living
  documents.
- When a plan is fully executed, move it to `docs/archive/` — but transplant
  anything unique into the canonical document first, and add a row above if
  the transplant cannot happen immediately.
- `docs/archive/` is append-only. Do not edit archived documents to make them
  look current.
