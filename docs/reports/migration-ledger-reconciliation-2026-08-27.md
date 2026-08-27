# Migration Ledger Reconciliation — 2026-08-27

**Repository:** `ethancrystal/crystalwebsolution.com`
**Supersedes the open question in:** [`database-seed-migration-reconciliation-2026-08-24.md`](database-seed-migration-reconciliation-2026-08-24.md), which could not link a project ref from the CLI and left `0025`-`0034` as an undifferentiated "needs an owner-reviewed ledger decision" block.

## What changed since the 2026-08-24 report

That report couldn't run `supabase link` / `supabase migration list` from the CLI ("no linked Supabase project ref configured"). This pass used the repository's already-configured Supabase MCP connection (`https://wmnjosiikehsuaqucvja.supabase.co` — confirm this is the intended production project before acting on anything below) to read the live migration ledger and inspect live schema/policy state directly. **Read-only throughout — no DDL was run, no migration was applied.**

## Live ledger vs. local files

The live project has **34** applied migrations; the local checkout has **38** files (`0001`-`0037`, plus `0009b` and `0014b`). Matching every live entry to a local file by name (not just by number — several were reconciled under a bare descriptive name with no numeric prefix, e.g. live `tighten_task_priority_to_three_tiers` = local `0022_tighten_task_priority_to_three_tiers.sql`) accounts for all 34 live rows and leaves exactly **4** local files with no live counterpart:

| Local file | Live status | Verdict |
|---|---|---|
| `0007_notes_creation_scoping.sql` | No matching ledger row | **Not a gap.** `0008_auth_rbac_repair.sql` (live, confirmed applied) opens with "Converges a fresh 0001-0007 schema and the observed 0007 policy drift" and `DROP POLICY IF EXISTS` on both 0001's and 0007's notes policies before recreating the current Admin/Client/PM split. Queried live `pg_policies` for `public.notes` directly: the live policy set (`Admin can view all notes`, `Clients can view client-visible notes`, `PM can view notes for assigned companies`, plus matching INSERT/DELETE policies) is exactly what 0008 creates. 0008 supersedes 0007 idempotently regardless of whether 0007 ever ran standalone — no drift, no action needed. |
| `0030_transition_status_visibility_recipients.sql` | No matching ledger row | **Not a gap — self-documented as already-live-untracked.** The file's own header states it was verified 2026-08-15 against production: `transition_project_status` already forwards `p_visibility` to `private.project_notification_recipients`, so the fix it encodes was already live before the file existed. Re-applying it is a harmless `CREATE OR REPLACE` no-op; it exists to bring the tracked ledger in line with reality, in the same spirit as `0009b`/`0014b`. Not independently re-verified this pass (only 0031/0032 below were re-verified against live schema); flag for a fresh check if this becomes load-bearing. |
| `0031_idempotent_client_project_intake.sql` | **No matching ledger row — confirmed genuinely pending** | Queried live schema directly: `public.projects.client_generated_id` does not exist, and `projects_client_generated_idx` does not exist. This migration has never been applied to the linked project. Client project intake is not yet retry-safe there. |
| `0032_project_asset_lifecycle_hardening.sql` | **No matching ledger row — confirmed genuinely pending** | Queried live schema directly: `private.broadcast_project_message_updated()` does not exist on the linked project. Message-edit Realtime broadcasting and the abandoned-attachment cleanup this migration adds are not yet live. |

## Bottom line

The 2026-08-24 report's caution was justified in spirit but overstated in scope: of the "0025-0034 needs review" block, **32 of those 34 characters of range are already fully reconciled** (by name or by self-documented no-op) — only **0031 and 0032** are real, unapplied pending migrations. Both are additive (a nullable column + index; a function replacement) with no destructive DDL, which lowers but doesn't eliminate rollout risk.

## Still not done by this pass (unchanged from 2026-08-24)

- No `db push` was run and none should be, until you've reviewed `0031` and `0032` yourself and are ready to apply them.
- `pnpm test:db` still requires a local Postgres stack (Docker) not available in this environment — the pgTAP suite has not been re-run against these two pending migrations.
- This confirms the *ledger* is reconciled; it does not substitute for the `db push --dry-run` review against the exact target project immediately before applying, standard practice for any migration regardless of ledger status.

## Suggested next step

When ready: `pnpm exec supabase link --project-ref wmnjosiikehsuaqucvja` (or the correct ref, if that's not this project), then `pnpm exec supabase db push --dry-run` to see the plan for `0031` + `0032` specifically, since those are now the only two files that dry run should show as pending.
