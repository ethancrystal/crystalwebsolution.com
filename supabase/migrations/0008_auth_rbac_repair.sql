-- Deterministic authentication/RBAC repair.
-- Converges a fresh 0001-0007 schema and the observed 0007 policy drift.

-- ---------- 1. Reconcile columns needed by transactional onboarding/notes ----------
ALTER TABLE public.contacts
  ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS visibility TEXT;

UPDATE public.notes
SET visibility = 'internal'
WHERE visibility IS NULL;

ALTER TABLE public.notes
  ALTER COLUMN visibility SET DEFAULT 'internal',
  ALTER COLUMN visibility SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.notes'::pg_catalog.regclass
      AND conname = 'notes_visibility_check'
  ) THEN
    ALTER TABLE public.notes
      ADD CONSTRAINT notes_visibility_check
      CHECK (visibility IN ('internal', 'client'));
  END IF;
END;
$$;

-- ---------- 2. profiles.role is the only role authority ----------
CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT p.role::TEXT
  FROM public.profiles AS p
  WHERE p.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT public.current_profile_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION public.is_pm()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT public.current_profile_role() = 'project_manager'
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT public.current_profile_role() IN ('admin', 'project_manager')
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT public.current_profile_role() = 'client'
    AND EXISTS (
      SELECT 1
      FROM public.company_members AS member
      WHERE member.company_id = is_company_member.company_id
        AND member.user_id = auth.uid()
    )
$$;

CREATE OR REPLACE FUNCTION public.can_access_deal(p_deal_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.deals AS deal
      WHERE deal.id = p_deal_id
        AND (
          (public.is_pm() AND deal.owner_id = auth.uid())
          OR public.is_company_member(deal.company_id)
        )
    )
$$;

-- New accounts always start as clients. An admin promotes staff only through
-- admin_set_user_role(), after the profile row exists.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'client', NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_profile_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

-- Remove the obsolete overload before defining the canonical onboarding RPC.
DROP FUNCTION IF EXISTS public.onboard_client_company(TEXT, TEXT);

-- ---------- 3. Validated role and onboarding commands ----------
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
  -- Serialize role changes so two concurrent demotions cannot both observe
  -- the same final administrator.
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
  v_contact_name TEXT := pg_catalog.btrim(p_contact_name);
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

  INSERT INTO public.companies (name, email, phone, created_by)
  VALUES (pg_catalog.btrim(p_company_name), v_email, p_phone, v_user_id)
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
    v_contact_name,
    '',
    v_email,
    p_phone,
    'client',
    v_user_id
  );

  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, v_user_id, 'owner');

  UPDATE public.profiles
  SET company_id = v_company_id
  WHERE id = v_user_id;

  RETURN v_company_id;
END;
$$;

-- Compatibility for the existing brief form's named arguments. p_email is
-- deliberately ignored: onboarding derives email from the authenticated
-- account, while the canonical command still validates role/profile state.
CREATE OR REPLACE FUNCTION public.onboard_client_company(p_name TEXT, p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_contact_name TEXT;
BEGIN
  SELECT pg_catalog.coalesce(
    pg_catalog.nullif(pg_catalog.btrim(profile.full_name), ''),
    pg_catalog.nullif(pg_catalog.split_part(auth_user.email, '@', 1), ''),
    'Client'
  )
  INTO v_contact_name
  FROM public.profiles AS profile
  JOIN auth.users AS auth_user ON auth_user.id = profile.id
  WHERE profile.id = auth.uid();

  RETURN public.onboard_client_company(
    p_company_name => p_name,
    p_contact_name => v_contact_name,
    p_phone => NULL
  );
END;
$$;

-- Only SECURITY DEFINER commands owned alongside admin_set_user_role may
-- mutate protected profile columns. Normal authenticated table updates can
-- still change safe self-service fields such as full_name/avatar_url.
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

DROP TRIGGER IF EXISTS on_profile_role_change_guard ON public.profiles;
CREATE TRIGGER on_profile_role_change_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unauthorized_profile_changes();

-- ---------- 4. Deterministically replace legacy CRM policies ----------
DROP POLICY IF EXISTS "Admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deal participants can view assigned owner profile" ON public.profiles;
CREATE POLICY "Admin can view all profiles" ON public.profiles
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Deal participants can view assigned owner profile" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.deals AS deal
      WHERE deal.owner_id = profiles.id
        AND public.can_access_deal(deal.id)
    )
  );

DROP POLICY IF EXISTS "Staff can view all companies" ON public.companies;
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
DROP POLICY IF EXISTS "Staff can update companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can create companies" ON public.companies;
DROP POLICY IF EXISTS "Admin can view all companies" ON public.companies;
DROP POLICY IF EXISTS "PM can view assigned companies" ON public.companies;
DROP POLICY IF EXISTS "Clients can view their company" ON public.companies;
DROP POLICY IF EXISTS "Admin can update companies" ON public.companies;
CREATE POLICY "Admin can create companies" ON public.companies
  FOR INSERT WITH CHECK (public.is_admin() AND created_by = auth.uid());
CREATE POLICY "Admin can view all companies" ON public.companies
  FOR SELECT USING (public.is_admin());
CREATE POLICY "PM can view assigned companies" ON public.companies
  FOR SELECT USING (
    public.is_pm()
    AND EXISTS (
      SELECT 1
      FROM public.deals AS deal
      WHERE deal.company_id = companies.id
        AND deal.owner_id = auth.uid()
    )
  );
CREATE POLICY "Clients can view their company" ON public.companies
  FOR SELECT USING (public.is_company_member(id));
CREATE POLICY "Admin can update companies" ON public.companies
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Staff can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "Company members can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Staff can update contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can create contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can view all contacts" ON public.contacts;
DROP POLICY IF EXISTS "PM can view assigned contacts" ON public.contacts;
DROP POLICY IF EXISTS "Clients can view company contacts" ON public.contacts;
DROP POLICY IF EXISTS "Admin can update contacts" ON public.contacts;
CREATE POLICY "Admin can create contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_admin() AND created_by = auth.uid());
CREATE POLICY "Admin can view all contacts" ON public.contacts
  FOR SELECT USING (public.is_admin());
CREATE POLICY "PM can view assigned contacts" ON public.contacts
  FOR SELECT USING (
    public.is_pm()
    AND EXISTS (
      SELECT 1
      FROM public.deals AS deal
      WHERE deal.company_id = contacts.company_id
        AND deal.owner_id = auth.uid()
    )
  );
CREATE POLICY "Clients can view company contacts" ON public.contacts
  FOR SELECT USING (public.is_company_member(company_id));
CREATE POLICY "Admin can update contacts" ON public.contacts
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "PM can update assigned deal fields" ON public.deals;
DROP POLICY IF EXISTS "Deal owner and staff can update" ON public.deals;
DROP POLICY IF EXISTS "Admin can update any deal" ON public.deals;
CREATE POLICY "Admin can update any deal" ON public.deals
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Assigned user and staff can update" ON public.tasks;
DROP POLICY IF EXISTS "Assigned user can update own task" ON public.tasks;
DROP POLICY IF EXISTS "Admin can update any task" ON public.tasks;
CREATE POLICY "Admin can update any task" ON public.tasks
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Company members can view notes" ON public.notes;
DROP POLICY IF EXISTS "Admin can view all notes" ON public.notes;
DROP POLICY IF EXISTS "PM can view notes on assigned deals" ON public.notes;
DROP POLICY IF EXISTS "PM can view company notes" ON public.notes;
DROP POLICY IF EXISTS "Any authenticated user can create notes" ON public.notes;
DROP POLICY IF EXISTS "Deal participants can create deal notes" ON public.notes;
DROP POLICY IF EXISTS "Staff can create company notes" ON public.notes;
DROP POLICY IF EXISTS "Company members can create company notes" ON public.notes;
DROP POLICY IF EXISTS "Clients can view client-visible notes" ON public.notes;
DROP POLICY IF EXISTS "PM can view notes for assigned companies" ON public.notes;
DROP POLICY IF EXISTS "Admin can create notes" ON public.notes;
DROP POLICY IF EXISTS "PM can create notes for assigned companies" ON public.notes;
DROP POLICY IF EXISTS "Clients can create client-visible notes" ON public.notes;
CREATE POLICY "Admin can view all notes" ON public.notes
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Clients can view client-visible notes" ON public.notes
  FOR SELECT USING (
    public.current_profile_role() = 'client'
    AND visibility = 'client'
    AND public.is_company_member(company_id)
  );
CREATE POLICY "PM can view notes for assigned companies" ON public.notes
  FOR SELECT USING (
    public.is_pm()
    AND EXISTS (
      SELECT 1
      FROM public.deals AS deal
      WHERE deal.company_id = notes.company_id
        AND deal.owner_id = auth.uid()
        AND (notes.deal_id IS NULL OR notes.deal_id = deal.id)
    )
  );
CREATE POLICY "Admin can create notes" ON public.notes
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND created_by = auth.uid()
    AND (contact_id IS NULL OR EXISTS (
      SELECT 1 FROM public.contacts AS contact
      WHERE contact.id = notes.contact_id
        AND contact.company_id = notes.company_id
    ))
    AND (deal_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deals AS deal
      WHERE deal.id = notes.deal_id
        AND deal.company_id = notes.company_id
    ))
  );
CREATE POLICY "PM can create notes for assigned companies" ON public.notes
  FOR INSERT WITH CHECK (
    public.is_pm()
    AND created_by = auth.uid()
    AND (contact_id IS NULL OR EXISTS (
      SELECT 1 FROM public.contacts AS contact
      WHERE contact.id = notes.contact_id
        AND contact.company_id = notes.company_id
    ))
    AND EXISTS (
      SELECT 1
      FROM public.deals AS deal
      WHERE deal.company_id = notes.company_id
        AND deal.owner_id = auth.uid()
        AND (notes.deal_id IS NULL OR notes.deal_id = deal.id)
    )
  );
CREATE POLICY "Clients can create client-visible notes" ON public.notes
  FOR INSERT WITH CHECK (
    public.current_profile_role() = 'client'
    AND visibility = 'client'
    AND created_by = auth.uid()
    AND public.is_company_member(company_id)
    AND (contact_id IS NULL OR EXISTS (
      SELECT 1 FROM public.contacts AS contact
      WHERE contact.id = notes.contact_id
        AND contact.company_id = notes.company_id
    ))
    AND (deal_id IS NULL OR EXISTS (
      SELECT 1 FROM public.deals AS deal
      WHERE deal.id = notes.deal_id
        AND deal.company_id = notes.company_id
    ))
  );

DROP POLICY IF EXISTS "Staff can view all members" ON public.company_members;
DROP POLICY IF EXISTS "Company members can view their company members" ON public.company_members;
DROP POLICY IF EXISTS "Admin can view all company members" ON public.company_members;
DROP POLICY IF EXISTS "Clients can view their company members" ON public.company_members;
CREATE POLICY "Admin can view all company members" ON public.company_members
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Clients can view their company members" ON public.company_members
  FOR SELECT USING (public.is_company_member(company_id));

-- ---------- 5. Function privileges ----------
-- Revoke the default function privilege first. RLS helpers are executable
-- only by authenticated sessions because PostgreSQL evaluates policy
-- expressions with the querying user's function privileges.
REVOKE ALL ON FUNCTION public.current_profile_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_pm() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_deal(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_unauthorized_profile_changes() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_profile_updated() FROM PUBLIC;

REVOKE ALL ON FUNCTION public.current_profile_role() FROM anon;
REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
REVOKE ALL ON FUNCTION public.is_pm() FROM anon;
REVOKE ALL ON FUNCTION public.is_staff() FROM anon;
REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.can_access_deal(UUID) FROM anon;
REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.prevent_unauthorized_profile_changes() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_profile_updated() FROM anon;

REVOKE ALL ON FUNCTION public.current_profile_role() FROM authenticated;
REVOKE ALL ON FUNCTION public.is_admin() FROM authenticated;
REVOKE ALL ON FUNCTION public.is_pm() FROM authenticated;
REVOKE ALL ON FUNCTION public.is_staff() FROM authenticated;
REVOKE ALL ON FUNCTION public.is_company_member(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.can_access_deal(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION public.admin_set_user_role(UUID, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.onboard_client_company(TEXT, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.prevent_unauthorized_profile_changes() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_profile_updated() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.current_profile_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_pm() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_deal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_client_company(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.onboard_client_company(TEXT, TEXT) TO authenticated;
