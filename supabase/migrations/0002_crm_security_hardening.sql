-- CRM security hardening for Crystal Web Solution
-- Additive to 0001_crm_schema.sql - never edit that file in place once applied.
--
-- Fixes three gaps found reviewing 0001 against RLS/authz best practice:
-- 1. profiles UPDATE policy had no WITH CHECK, so a column-level restriction
--    was missing: any authenticated user could set their own role to 'admin'
--    via a normal client update (RLS only gated which row, not which columns).
-- 2. No DELETE policy existed on any table, so RLS silently denied every
--    delete (0 rows affected, no error) rather than the CRM UI's delete
--    buttons actually working.
-- 3. INSERT policies didn't bind created_by to the acting user, so a staff
--    user could attribute a row to an arbitrary other user's UUID. Left
--    owner_id (deals) and assigned_to (tasks) unconstrained on purpose -
--    those are legitimately staff-assignable to a different user (deal
--    reassignment, task delegation), unlike created_by which is a factual
--    audit field.

-- ---------- 1. Prevent self-role-escalation on profiles ----------
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.company_id IS DISTINCT FROM OLD.company_id)
     AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only an admin may change role or company_id on a profile';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_role_change_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_profile_changes();

-- ---------- 2. DELETE policies ----------
CREATE POLICY "Staff can delete companies" ON public.companies
  FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff can delete contacts" ON public.contacts
  FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff can delete deals" ON public.deals
  FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff can delete tasks" ON public.tasks
  FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff can delete notes" ON public.notes
  FOR DELETE USING (public.is_staff());

CREATE POLICY "Staff can delete company_members" ON public.company_members
  FOR DELETE USING (public.is_staff());

-- ---------- 3. Bind created_by to the acting user on INSERT ----------
-- Postgres RLS policies are additive (OR'd together per command), so these
-- replace the original, looser INSERT policies with a version that also
-- requires created_by = auth.uid() rather than adding a second permissive
-- policy alongside the original (which would just re-permit the loophole).
DROP POLICY "Staff can create companies" ON public.companies;
CREATE POLICY "Staff can create companies" ON public.companies
  FOR INSERT WITH CHECK (public.is_staff() AND created_by = auth.uid());

DROP POLICY "Staff can create contacts" ON public.contacts;
CREATE POLICY "Staff can create contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_staff() AND created_by = auth.uid());

-- deals has no created_by column (only owner_id, intentionally left
-- staff-assignable) so its original INSERT policy needs no change.

DROP POLICY "Staff can create tasks" ON public.tasks;
CREATE POLICY "Staff can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_staff() AND created_by = auth.uid());
