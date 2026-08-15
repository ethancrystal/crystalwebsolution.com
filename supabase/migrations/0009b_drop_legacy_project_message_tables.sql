-- 0009b_drop_legacy_project_message_tables.sql
--
-- Reconciliation only: this migration already ran live on 2026-08-01
-- (version 20260801005133) as an ad hoc fix applied ahead of 0009 during
-- initial CRM schema work, with no tracked repo file at the time. Recorded
-- here verbatim from `supabase_migrations.schema_migrations` so the local
-- migration history matches what's actually live -- do not reapply against
-- an already-migrated database; do not renumber.
--
-- Dropped the old deal-based project_messages/project_files tables so 0009
-- could define the current project-workspace schema (project_messages,
-- project_attachments, etc.) without a naming collision.

DROP TABLE IF EXISTS public.project_files CASCADE;
DROP TABLE IF EXISTS public.project_messages CASCADE;
