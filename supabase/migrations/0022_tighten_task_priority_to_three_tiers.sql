-- 0022_tighten_task_priority_to_three_tiers.sql
--
-- project_tasks.priority's CHECK constraint (added in 0011, as
-- project_tasks_priority_check) allows four values: 'low', 'medium',
-- 'high', 'urgent'. But the app only ever built three:
--   - create_project_task's RPC validation (migration 0019) rejects
--     'urgent'.
--   - The team page's priority <select> only offers Low/Medium/High.
--   - ProjectTasks.jsx's priority badge has no CSS rule for an urgent
--     class.
--
-- Confirmed via `select count(*) from project_tasks where priority =
-- 'urgent';` before applying: 0 rows. This is a forward-looking
-- schema/app mismatch, not a live-data migration concern.
--
-- Owner decision: keep the priority model 3-tier. Tighten the database
-- constraint to match what's actually built, rather than building out
-- 'urgent' support across the RPC, UI, and CSS. Found during the final
-- whole-branch review of the 2026-08-09 CRM remaining-decisions batch.
--
-- Confirmed the constraint's real name and definition via:
-- `select conname, pg_get_constraintdef(oid) from pg_constraint where
-- conrelid = 'public.project_tasks'::regclass and contype = 'c' and
-- pg_get_constraintdef(oid) ilike '%priority%';`
--   -> project_tasks_priority_check: CHECK ((priority = ANY
--      (ARRAY['low'::text, 'medium'::text, 'high'::text,
--      'urgent'::text])))

begin;

alter table public.project_tasks
  drop constraint project_tasks_priority_check;

alter table public.project_tasks
  add constraint project_tasks_priority_check
  check (priority = any (array['low'::text, 'medium'::text, 'high'::text]));

commit;
