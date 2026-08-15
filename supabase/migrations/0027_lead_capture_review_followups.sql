-- 0027_lead_capture_review_followups.sql
--
-- Follow-ups from the xhigh code review of PR #74 (0026_create_lead_from_contact).
-- Three findings, all in the same function, plus the index that backs #1:
--
-- 1. [P2] Race condition. The "match contact by lower(email)" SELECT and the
--    subsequent INSERT were not atomic, and contacts.email carried only a
--    plain btree index (idx_contacts_email) -- no uniqueness. Two concurrent
--    calls for the same address (double-click submit, two open tabs) could
--    both read "not found" before either committed, producing duplicate
--    contact + company + deal rows -- exactly what this RPC exists to prevent.
--    Fixed with defense in depth: a transaction-scoped advisory lock keyed on
--    the normalized email serializes concurrent calls for the SAME address
--    (different addresses still run fully parallel), and a partial unique
--    index makes the invariant unbreakable at the storage layer regardless of
--    who writes. Verified no pre-existing duplicates before adding the index.
--
-- 2. [P2] Deal title ignored a domain-matched company. When a submission had
--    no company field but its email domain matched/created a company, the
--    title fell back to the person's name while the notification payload used
--    the domain -- two representations of one event disagreeing, and the deal
--    title is the half the admin actually scans in the pipeline list. Both now
--    derive from the company row actually attached to the deal, which is also
--    correct on the paths that never compute a domain at all (existing contact
--    whose deals have all closed) and on the free-mail path (company is named
--    after the person, so the title stays the person's name rather than
--    becoming a useless "gmail.com").
--
-- 3. [P3] p_source was the one input with no length bound, flowing unbounded
--    into notes.content by concatenation -- inconsistent with the function's
--    own stated "does not trust the caller" posture (0026 header, SEC-002).
--    Not exploitable today (the sole caller hardcodes it), but it stops being
--    theoretical the moment a second caller passes something else.
--
-- No behavior change for the normal single-submission path; the end-to-end
-- create and dedupe flows verified against production on 2026-08-15 still
-- behave identically.

-- Backs finding #1. Partial because contacts.email is nullable and existing
-- admin-created rows may legitimately have none; lower() to match the
-- case-insensitive lookup the function actually performs.
CREATE UNIQUE INDEX IF NOT EXISTS contacts_lower_email_unique_idx
  ON public.contacts (lower(email))
  WHERE email IS NOT NULL;

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
  -- Finding #3: bounded like every other input.
  v_source TEXT := left(btrim(coalesce(p_source, 'website_contact_form')), 50);
  v_first_name TEXT;
  v_last_name TEXT;
  v_space_pos INT;
  v_domain TEXT;
  v_admin_id UUID;
  v_company_id UUID;
  v_company_name TEXT;
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

  -- Finding #1: serialize concurrent calls for this exact address. Namespaced
  -- by the function name so the key space can't collide with another
  -- advisory-lock user. Transaction-scoped: released on commit or rollback,
  -- so a failure mid-function can never strand the lock. Calls for different
  -- addresses take different keys and stay fully concurrent.
  PERFORM pg_advisory_xact_lock(hashtext('create_lead_from_contact'), hashtext(v_email));

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

  -- Finding #2: computed unconditionally now (0026 assigned it only inside the
  -- new-contact branch), so every path can reason about the sender's domain.
  v_domain := split_part(v_email, '@', 2);

  -- ---------- Contact match/create ----------

  SELECT c.id, c.company_id INTO v_contact_id, v_company_id
  FROM public.contacts c
  WHERE lower(c.email) = v_email
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    -- ---------- Company match/create (only needed for a new contact) ----------
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

  -- Finding #2: the company actually attached to the deal is the single
  -- source of truth for both the deal title and the notification payload,
  -- rather than re-deriving a guess in each place. Correct on every path:
  -- explicit company name, domain-matched company, free-mail company named
  -- after the person, and an existing contact whose company predates this call.
  SELECT co.name INTO v_company_name
  FROM public.companies co
  WHERE co.id = v_company_id;

  v_company_name := nullif(btrim(coalesce(v_company_name, '')), '');

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
      'New website inquiry (' || v_source || '):' || E'\n' || v_deal_description,
      v_admin_id,
      'internal'
    );
    v_note_appended := true;
  ELSE
    v_deal_title := left('Website inquiry — ' || coalesce(v_company_name, v_name), 200);

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
      'lead_company', v_company_name,
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
