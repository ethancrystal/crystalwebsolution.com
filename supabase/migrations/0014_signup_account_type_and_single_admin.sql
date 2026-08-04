-- Signup account type (client vs. employee request) and a pinned single admin.
--
-- Two separate guarantees live here:
--
-- 1. Signup can never mint staff. handle_new_user() still hardcodes 'client'
--    exactly as 0008 did; the account_type a visitor picks on /signup is
--    recorded only as profiles.requested_staff_access, a request flag that an
--    admin must approve through admin_resolve_staff_request(). A crafted
--    signup payload claiming account_type='admin' therefore buys nothing --
--    the role column is never read from user-controlled metadata.
--
-- 2. The admin role is pinned to a single named address. A partial unique
--    index caps the table at one admin row, and a trigger rejects the role
--    for any account whose auth.users email is not the pinned one. Both are
--    enforced in the database, so neither an app bug nor a direct table write
--    by a compromised session can create a second or unauthorised admin.

-- ---------- 1. Staff-access request flag ----------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_staff_access BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.requested_staff_access IS
  'True when this account signed up asking for employee access. Confers no '
  'privilege on its own -- an admin resolves it via admin_resolve_staff_request().';

CREATE INDEX IF NOT EXISTS profiles_pending_staff_requests_idx
  ON public.profiles (created_at DESC)
  WHERE requested_staff_access;

-- ---------- 2. Pinned admin identity ----------

CREATE OR REPLACE FUNCTION public.pinned_admin_email()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'ethan@crystalwebsolution.com'::TEXT
$$;

COMMENT ON FUNCTION public.pinned_admin_email() IS
  'The single address permitted to hold the admin role. Change here to move it.';

-- At most one admin row, ever. Every admin row indexes the same key, so a
-- second insert or promotion collides.
CREATE UNIQUE INDEX IF NOT EXISTS profiles_single_admin_idx
  ON public.profiles ((role))
  WHERE role = 'admin'::public.user_role;

CREATE OR REPLACE FUNCTION public.enforce_pinned_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF NEW.role <> 'admin'::public.user_role THEN
    RETURN NEW;
  END IF;

  SELECT pg_catalog.lower(u.email) INTO v_email
  FROM auth.users AS u
  WHERE u.id = NEW.id;

  IF v_email IS DISTINCT FROM pg_catalog.lower(public.pinned_admin_email()) THEN
    RAISE EXCEPTION 'Only % may hold the admin role.', public.pinned_admin_email()
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pinned_admin_trigger ON public.profiles;
CREATE TRIGGER enforce_pinned_admin_trigger
  BEFORE INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pinned_admin();

-- ---------- 3. Signup records the request, never the role ----------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  -- Anything other than an explicit 'employee' is treated as a client signup,
  -- so an unexpected or hostile account_type degrades to the lowest privilege.
  -- COALESCE is a SQL construct, not a pg_catalog function -- it must stay
  -- unqualified even though search_path is pinned above.
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
$$;

-- ---------- 4. Admin resolves a staff request ----------

CREATE OR REPLACE FUNCTION public.admin_resolve_staff_request(
  p_user_id UUID,
  p_approve BOOLEAN
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_result public.profiles%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF p_approve IS NULL THEN
    RAISE EXCEPTION 'An approve or decline decision is required.'
      USING ERRCODE = '22023';
  END IF;

  -- Approval only ever grants project_manager. The admin role is not
  -- reachable from this path at all.
  UPDATE public.profiles
  SET role = CASE
               WHEN p_approve THEN 'project_manager'::public.user_role
               ELSE role
             END,
      requested_staff_access = false
  WHERE id = p_user_id
    AND requested_staff_access
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No pending staff request for this account.'
      USING ERRCODE = 'P0002';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_staff_request(UUID, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_resolve_staff_request(UUID, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_resolve_staff_request(UUID, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.enforce_pinned_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_pinned_admin() FROM anon;
REVOKE ALL ON FUNCTION public.enforce_pinned_admin() FROM authenticated;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
