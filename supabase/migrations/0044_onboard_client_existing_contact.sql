-- 0044_onboard_client_existing_contact.sql
--
-- Production symptom (cdsportswearinc.com client CRM):
--   "Unable to complete onboarding. Please try again."
--
-- Root cause: migration 0029 added contacts_lower_email_unique_idx. Website
-- lead capture (create_lead_from_contact) often inserts a contact with the
-- same email the client later uses to sign up. onboard_client_company then
-- blindly INSERTs another contacts row and fails with unique_violation
-- (23505). The server action maps every RPC error to the generic UI string.
--
-- Fix:
-- 1. If a contact already exists for the authenticated email, attach the
--    client to that company (membership + profiles.company_id) instead of
--    inserting a duplicate contact/company.
-- 2. Mark trusted profile writes with a transaction-local GUC so the
--    profile guard allows onboard / admin_set_user_role company_id/role
--    updates even when function ownership drifts between environments.
-- 3. Keep the 2-arg compatibility wrapper calling the 3-arg command.

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_command_owner NAME;
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role
     OR OLD.company_id IS DISTINCT FROM NEW.company_id THEN
    IF pg_catalog.current_setting('crm.trusted_profile_write', true) = '1' THEN
      RETURN NEW;
    END IF;

    SELECT pg_catalog.pg_get_userbyid(proc.proowner)
    INTO v_command_owner
    FROM pg_catalog.pg_proc AS proc
    WHERE proc.oid = 'public.admin_set_user_role(uuid,text)'::pg_catalog.regprocedure;

    IF v_command_owner IS NULL OR CURRENT_USER <> v_command_owner THEN
      RAISE EXCEPTION 'Protected profile fields must be changed through a validated command.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(p_user_id UUID, p_role TEXT)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_target public.profiles%ROWTYPE;
  v_result public.profiles%ROWTYPE;
  v_admin_count BIGINT;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(5607560873324236590);

  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required.' USING ERRCODE = '42501';
  END IF;

  IF p_role IS NULL OR p_role NOT IN ('client', 'project_manager', 'admin') THEN
    RAISE EXCEPTION 'Invalid role.' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO v_target
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found.' USING ERRCODE = 'P0002';
  END IF;

  IF p_user_id = auth.uid() AND v_target.role::TEXT IS DISTINCT FROM p_role THEN
    RAISE EXCEPTION 'Admins cannot change their own role.' USING ERRCODE = '42501';
  END IF;

  IF v_target.role::TEXT = 'admin' AND p_role <> 'admin' THEN
    SELECT count(*)
    INTO v_admin_count
    FROM public.profiles
    WHERE role = 'admin';

    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'The last admin cannot be demoted.' USING ERRCODE = '23514';
    END IF;
  END IF;

  PERFORM pg_catalog.set_config('crm.trusted_profile_write', '1', true);

  UPDATE public.profiles
  SET role = p_role::public.user_role
  WHERE id = p_user_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.onboard_client_company(
  p_company_name TEXT,
  p_contact_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_email TEXT;
  v_company_id UUID;
  v_existing_contact_id UUID;
  v_contact_name TEXT := pg_catalog.btrim(p_contact_name);
  v_phone TEXT := NULLIF(pg_catalog.btrim(COALESCE(p_phone, '')), '');
  v_first_name TEXT;
  v_last_name TEXT;
  v_space_pos INT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_profile.role::TEXT <> 'client' THEN
    RAISE EXCEPTION 'Client profile required.' USING ERRCODE = '42501';
  END IF;

  IF v_profile.company_id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already linked to a company.' USING ERRCODE = '23505';
  END IF;

  IF p_company_name IS NULL OR pg_catalog.btrim(p_company_name) = '' THEN
    RAISE EXCEPTION 'Company name is required.' USING ERRCODE = '22023';
  END IF;

  IF p_contact_name IS NULL OR v_contact_name = '' THEN
    RAISE EXCEPTION 'Contact name is required.' USING ERRCODE = '22023';
  END IF;

  SELECT email
  INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF v_email IS NULL OR pg_catalog.btrim(v_email) = '' THEN
    RAISE EXCEPTION 'An account email is required for onboarding.' USING ERRCODE = '23502';
  END IF;

  v_email := pg_catalog.btrim(v_email);
  v_space_pos := pg_catalog.strpos(v_contact_name, ' ');
  IF v_space_pos > 0 THEN
    v_first_name := pg_catalog.left(v_contact_name, v_space_pos - 1);
    v_last_name := pg_catalog.btrim(pg_catalog.substr(v_contact_name, v_space_pos + 1));
  ELSE
    v_first_name := v_contact_name;
    v_last_name := '';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('onboard_client_company'),
    pg_catalog.hashtext(pg_catalog.lower(v_email))
  );

  SELECT c.id, c.company_id
  INTO v_existing_contact_id, v_company_id
  FROM public.contacts AS c
  WHERE c.email IS NOT NULL
    AND pg_catalog.lower(c.email) = pg_catalog.lower(v_email)
  LIMIT 1;

  IF v_existing_contact_id IS NOT NULL THEN
    UPDATE public.contacts
    SET
      first_name = v_first_name,
      last_name = COALESCE(NULLIF(v_last_name, ''), last_name),
      phone = COALESCE(v_phone, phone),
      status = CASE
        WHEN status IS NULL OR status = 'lead' THEN 'client'
        ELSE status
      END,
      updated_at = NOW()
    WHERE id = v_existing_contact_id;

    UPDATE public.companies
    SET
      name = CASE
        WHEN name IS NULL OR pg_catalog.btrim(name) = '' THEN pg_catalog.btrim(p_company_name)
        ELSE name
      END,
      phone = COALESCE(v_phone, phone),
      updated_at = NOW()
    WHERE id = v_company_id;
  ELSE
    INSERT INTO public.companies (name, email, phone, created_by)
    VALUES (pg_catalog.btrim(p_company_name), v_email, v_phone, v_user_id)
    RETURNING id INTO v_company_id;

    INSERT INTO public.contacts (
      company_id,
      first_name,
      last_name,
      email,
      phone,
      status,
      created_by
    )
    VALUES (
      v_company_id,
      v_first_name,
      v_last_name,
      v_email,
      v_phone,
      'client',
      v_user_id
    );
  END IF;

  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'owner')
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET role = EXCLUDED.role;

  PERFORM pg_catalog.set_config('crm.trusted_profile_write', '1', true);

  UPDATE public.profiles
  SET company_id = v_company_id
  WHERE id = v_user_id;

  RETURN v_company_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.onboard_client_company(p_name TEXT, p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contact_name TEXT;
BEGIN
  SELECT coalesce(
    nullif(pg_catalog.btrim(profile.full_name), ''),
    nullif(pg_catalog.split_part(auth_user.email, '@', 1), ''),
    'Client'
  )
  INTO v_contact_name
  FROM public.profiles AS profile
  JOIN auth.users AS auth_user ON auth_user.id = profile.id
  WHERE profile.id = auth.uid();

  RETURN public.onboard_client_company(
    p_company_name => p_name,
    p_contact_name => COALESCE(v_contact_name, 'Client'),
    p_phone => NULL
  );
END;
$$;

REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_client_company(TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) IS
  'Client self-onboarding. Reuses an existing contacts row when the auth email already exists (e.g. prior website lead), avoiding contacts_lower_email_unique_idx collisions.';
