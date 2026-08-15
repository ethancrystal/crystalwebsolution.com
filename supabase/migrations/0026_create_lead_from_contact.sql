-- 0026_create_lead_from_contact.sql
--
-- CRM-IMPLEMENTATION-PLAN.md Phase 2, Task 2.1: the contact form's only
-- write path into the CRM. Called exclusively from app/api/contact/route.js
-- via the service-role admin client (lib/supabase/admin.js) -- never
-- reachable by anon/authenticated, since RLS on companies/contacts/deals
-- only permits is_admin() or a company-member-scoped insert, neither of
-- which an anonymous visitor has.
--
-- Stage vocabulary note: this repo's actual deals.stage values
-- (prospecting/qualification/proposal/negotiation/closed_won/closed_lost,
-- enforced only by app/admin/deals/page.jsx's STAGE_LABELS and
-- app/admin/deals/pipeline/page.jsx's normalizeStage(), no DB CHECK) do not
-- include a distinct "new lead" stage. New leads use the existing
-- 'prospecting' default; "impossible to miss" is achieved via the deal
-- title prefix and newest-first admin sort, not a new enum value the
-- Kanban board would silently misbucket. See plan/feature-crm-lead-capture-
-- and-drain-1.md REQ-010 / ALT-001 for the full reasoning.
--
-- Every auto-created record's owner_id/created_by is the single pinned
-- admin (public.pinned_admin_email(), migration 0014) -- there is no human
-- actor for an anonymous submission, and the admin is who gets notified.

CREATE OR REPLACE FUNCTION public.create_lead_from_contact(
  p_name TEXT,
  p_email TEXT,
  p_company TEXT DEFAULT NULL,
  p_brief TEXT DEFAULT NULL,
  p_budget TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'website_contact_form'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $fn$
DECLARE
  v_name TEXT := btrim(coalesce(p_name, ''));
  v_email TEXT := lower(btrim(coalesce(p_email, '')));
  v_company_input TEXT := nullif(btrim(coalesce(p_company, '')), '');
  v_brief TEXT := left(btrim(coalesce(p_brief, '')), 4000);
  v_budget TEXT := left(btrim(coalesce(p_budget, '')), 50);
  v_first_name TEXT;
  v_last_name TEXT;
  v_space_pos INT;
  v_domain TEXT;
  v_admin_id UUID;
  v_company_id UUID;
  v_contact_id UUID;
  v_deal_id UUID;
  v_note_appended BOOLEAN := false;
  v_lead_created BOOLEAN := false;
  v_deal_title TEXT;
  v_deal_description TEXT;
  -- Matches this repo's contact-form limits (lib/contactForm.mjs
  -- CONTACT_FIELD_LIMITS) as a second line of defense -- the RPC does not
  -- trust the caller even though only the service role can reach it.
  FREE_MAIL_DOMAINS CONSTANT TEXT[] := ARRAY[
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
    'aol.com', 'icloud.com', 'msn.com', 'protonmail.com', 'mail.com',
    'me.com', 'yandex.com', 'gmx.com'
  ];
BEGIN
  IF v_name = '' OR length(v_name) > 100 THEN
    RAISE EXCEPTION 'Invalid lead name.' USING ERRCODE = '22023';
  END IF;

  IF v_email = '' OR length(v_email) > 254 OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid lead email.' USING ERRCODE = '22023';
  END IF;

  IF v_company_input IS NOT NULL AND length(v_company_input) > 160 THEN
    v_company_input := left(v_company_input, 160);
  END IF;

  SELECT au.id INTO v_admin_id
  FROM auth.users au
  WHERE lower(au.email) = lower(public.pinned_admin_email())
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'No admin profile found for lead attribution.' USING ERRCODE = 'P0002';
  END IF;

  v_space_pos := position(' ' in v_name);
  IF v_space_pos > 0 THEN
    v_first_name := left(v_name, v_space_pos - 1);
    v_last_name := btrim(substring(v_name from v_space_pos + 1));
  ELSE
    v_first_name := v_name;
    v_last_name := '';
  END IF;

  -- ---------- Contact match/create ----------

  SELECT c.id, c.company_id INTO v_contact_id, v_company_id
  FROM public.contacts c
  WHERE lower(c.email) = v_email
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    -- ---------- Company match/create (only needed for a new contact) ----------
    v_domain := split_part(v_email, '@', 2);

    IF v_company_input IS NOT NULL THEN
      SELECT co.id INTO v_company_id
      FROM public.companies co
      WHERE lower(co.name) = lower(v_company_input)
      LIMIT 1;

      IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name, email, created_by)
        VALUES (v_company_input, v_email, v_admin_id)
        RETURNING id INTO v_company_id;
      END IF;
    ELSIF v_domain != '' AND NOT (v_domain = ANY (FREE_MAIL_DOMAINS)) THEN
      SELECT co.id INTO v_company_id
      FROM public.companies co
      WHERE lower(split_part(co.email, '@', 2)) = v_domain
      LIMIT 1;

      IF v_company_id IS NULL THEN
        INSERT INTO public.companies (name, email, created_by)
        VALUES (v_domain, v_email, v_admin_id)
        RETURNING id INTO v_company_id;
      END IF;
    ELSE
      -- Free-mail domain and no company name given: an individual lead
      -- still needs a company row (contacts.company_id/deals.company_id
      -- are NOT NULL) -- named after the person rather than left blank.
      INSERT INTO public.companies (name, email, created_by)
      VALUES (v_name, v_email, v_admin_id)
      RETURNING id INTO v_company_id;
    END IF;

    INSERT INTO public.contacts (company_id, first_name, last_name, email, created_by)
    VALUES (v_company_id, v_first_name, v_last_name, v_email, v_admin_id)
    RETURNING id INTO v_contact_id;
  END IF;

  -- ---------- Open-deal dedupe ----------

  SELECT d.id INTO v_deal_id
  FROM public.deals d
  WHERE d.contact_id = v_contact_id
    AND d.stage NOT IN ('closed_won', 'closed_lost')
  ORDER BY d.created_at DESC
  LIMIT 1;

  v_deal_description := trim(both E'\n' FROM
    coalesce(nullif(v_budget, ''), '') ||
    CASE WHEN v_budget != '' AND v_brief != '' THEN E'\n\n' ELSE '' END ||
    coalesce(nullif(v_brief, ''), '')
  );

  IF v_deal_id IS NOT NULL THEN
    INSERT INTO public.notes (company_id, contact_id, deal_id, content, created_by, visibility)
    VALUES (
      v_company_id,
      v_contact_id,
      v_deal_id,
      'New website inquiry (' || p_source || '):' || E'\n' || v_deal_description,
      v_admin_id,
      'internal'
    );
    v_note_appended := true;
  ELSE
    v_deal_title := left('Website inquiry — ' || coalesce(v_company_input, v_name), 200);

    INSERT INTO public.deals (company_id, contact_id, title, description, owner_id, stage)
    VALUES (v_company_id, v_contact_id, v_deal_title, nullif(v_deal_description, ''), v_admin_id, 'prospecting')
    RETURNING id INTO v_deal_id;

    v_lead_created := true;
  END IF;

  -- ---------- Admin notification (outbox; drained by the pg_cron/pg_net
  -- schedule from 0025, with the daily Vercel cron as a backstop) ----------

  INSERT INTO public.notifications_outbox (project_id, user_id, channel, event_type, payload)
  VALUES (
    NULL,
    v_admin_id,
    'email',
    'lead.created',
    jsonb_build_object(
      'lead_name', v_name,
      'lead_email', v_email,
      'lead_company', coalesce(v_company_input, v_domain),
      'deal_id', v_deal_id,
      'note_appended', v_note_appended
    )
  );

  RETURN jsonb_build_object(
    'lead_created', v_lead_created,
    'note_appended', v_note_appended,
    'deal_id', v_deal_id,
    'contact_id', v_contact_id,
    'company_id', v_company_id
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM authenticated;

COMMENT ON FUNCTION public.create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS
  'Service-role-only entry point for the contact form to create/dedupe a CRM lead. Never grant to anon/authenticated.';
