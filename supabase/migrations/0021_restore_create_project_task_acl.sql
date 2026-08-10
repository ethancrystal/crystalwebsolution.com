-- 0021_restore_create_project_task_acl.sql
--
-- Migration 0019 dropped and recreated create_project_task to add two new
-- parameters. DROP FUNCTION discards all prior ACL grants, and Postgres's
-- default for a newly created function is EXECUTE TO PUBLIC. 0019 only
-- re-issued `revoke ... from anon`, not `revoke ... from public` -- so the
-- recreated function silently regained PUBLIC execute access (which anon
-- inherits from), unlike every other SECURITY DEFINER function in this
-- codebase, all of which explicitly revoke from both anon and public.
--
-- Not exploitable in practice (the function's first statement requires
-- auth.uid() to be non-null), but this restores the repo's established ACL
-- convention on a live production function. Found during the final
-- whole-branch review of the 2026-08-09 CRM remaining-decisions batch.
--
-- Confirmed via `select proacl from pg_proc where proname =
-- 'create_project_task';` before applying: the PUBLIC grant entry
-- (`=X/postgres`) was present.

begin;

revoke all on function public.create_project_task(uuid, text, text, text, uuid, date, text, boolean) from public;

commit;
