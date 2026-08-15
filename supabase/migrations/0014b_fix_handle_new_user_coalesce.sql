-- 0014b_fix_handle_new_user_coalesce.sql
--
-- Reconciliation only: this migration already ran live on 2026-08-04
-- (version 20260804102058), directly after 0014, with no tracked repo file
-- at the time. Recorded here verbatim from
-- `supabase_migrations.schema_migrations` so the local migration history
-- matches what's actually live -- do not reapply against an already-
-- migrated database; do not renumber.
--
-- Fixes handle_new_user() (the auth.users signup trigger) to read the
-- account-type flag from the search path explicitly (pg_catalog, public)
-- and to keep every new signup pinned to role 'client' with staff access
-- only ever requested (requested_staff_access), never granted by the
-- trigger itself -- role escalation happens solely through
-- admin_resolve_staff_request().

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
DECLARE
  v_wants_staff BOOLEAN :=
    pg_catalog.lower(
      COALESCE(NEW.raw_user_meta_data ->> 'account_type', 'client')
    ) = 'employee';
BEGIN
  INSERT INTO public.profiles (id, role, full_name, requested_staff_access)
  VALUES (
    NEW.id,
    'client',
    NEW.raw_user_meta_data ->> 'full_name',
    v_wants_staff
  );
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
