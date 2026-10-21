-- 0053_contact_artwork.sql
--
-- Artwork upload for the homepage "production request" form
-- (components/marketing/ProductionRequestForm.jsx), plus the deal-title prefix
-- that tells production leads apart in the CRM list.
--
-- How a file travels (the two-phase flow is deliberate; see the handover note
-- in the PR):
--   1. POST /api/contact runs every existing guard (rate limit, honeypot,
--      validation, hCaptcha) and writes the lead through
--      create_lead_from_contact. Only then does it call reserve_contact_artwork
--      and mint one signed upload URL per file. A visitor therefore cannot get
--      an upload slot without having passed hCaptcha, and the single-use
--      captcha token is never needed twice.
--   2. The browser PUTs each file straight to the private contact-artwork
--      bucket with its token (no file bytes pass through a Vercel function,
--      whose request body limit is 4.5 MB).
--   3. POST /api/contact/artwork/complete checks the stored objects (size and
--      file signature), then attach_contact_artwork flips the verified rows to
--      'attached' and adds one internal note to the deal.
--   4. Rows still 'pending' after 24 h (the visitor closed the tab) are
--      deleted by the daily crm-notifications cron. Any deleted row, whatever
--      deleted it (that sweep, an admin deleting the deal, a deleted company
--      cascading to its deals), queues its storage path in
--      contact_artwork_removals; the same cron drains the queue by removing the
--      objects, and forgets an entry only after storage confirms. A visitor's
--      file therefore never outlives its CRM record.
--
-- Nothing here is readable by anon or authenticated except an admin SELECT on
-- attached rows. The bucket has no storage.objects policies at all, so objects
-- are reachable only through server-minted signed URLs.

-- ---------- Bucket ----------
-- 10 MB per object is enforced by storage itself, not only by our code. The
-- MIME list is the set the upload client sends (lib/contactArtwork.mjs): the
-- client chooses the type from the file extension, never from the browser.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'contact-artwork',
  'contact-artwork',
  false,
  10485760,
  ARRAY[
    'application/illustrator',
    'application/postscript',
    'application/pdf',
    'image/png',
    'image/jpeg',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------- Table ----------
CREATE TABLE IF NOT EXISTS public.contact_artwork (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL CHECK (char_length(original_name) BETWEEN 1 AND 120),
  content_type TEXT NOT NULL,
  declared_size_bytes BIGINT NOT NULL CHECK (declared_size_bytes BETWEEN 1 AND 10485760),
  size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes BETWEEN 1 AND 10485760),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attached')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attached_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS contact_artwork_deal_idx ON public.contact_artwork (deal_id);
CREATE INDEX IF NOT EXISTS contact_artwork_submission_idx ON public.contact_artwork (deal_id, submission_id);
-- Backs the 24 h stale-reservation sweep.
CREATE INDEX IF NOT EXISTS contact_artwork_pending_idx
  ON public.contact_artwork (created_at) WHERE status = 'pending';

ALTER TABLE public.contact_artwork ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_artwork FROM PUBLIC;
REVOKE ALL ON public.contact_artwork FROM anon;
REVOKE ALL ON public.contact_artwork FROM authenticated;
GRANT SELECT ON public.contact_artwork TO authenticated;

DROP POLICY IF EXISTS "Admins can read attached contact artwork" ON public.contact_artwork;
CREATE POLICY "Admins can read attached contact artwork" ON public.contact_artwork
  FOR SELECT TO authenticated
  USING (public.is_admin() AND status = 'attached');

-- ---------- Durable object-removal queue ----------
-- Storage objects cannot be deleted from SQL, so a deleted contact_artwork row
-- leaves its object behind. This table remembers the path until the cron has
-- removed the object (storage treats an already-gone key as a no-op, so a retry
-- is harmless). Service role only: no policy, no grant.
CREATE TABLE IF NOT EXISTS public.contact_artwork_removals (
  storage_path TEXT PRIMARY KEY,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_artwork_removals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.contact_artwork_removals FROM PUBLIC;
REVOKE ALL ON public.contact_artwork_removals FROM anon;
REVOKE ALL ON public.contact_artwork_removals FROM authenticated;

-- Fires for every delete, including the ones a deal or company delete cascades
-- into, and runs as its owner so a client deleting its way through the
-- cascade needs no access to the queue.
CREATE OR REPLACE FUNCTION public.queue_contact_artwork_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  INSERT INTO public.contact_artwork_removals (storage_path)
  VALUES (OLD.storage_path)
  ON CONFLICT (storage_path) DO NOTHING;
  RETURN OLD;
END;
$fn$;

REVOKE ALL ON FUNCTION public.queue_contact_artwork_removal() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.queue_contact_artwork_removal() FROM anon;
REVOKE ALL ON FUNCTION public.queue_contact_artwork_removal() FROM authenticated;

DROP TRIGGER IF EXISTS contact_artwork_queue_removal ON public.contact_artwork;
CREATE TRIGGER contact_artwork_queue_removal
  AFTER DELETE ON public.contact_artwork
  FOR EACH ROW EXECUTE FUNCTION public.queue_contact_artwork_removal();

-- ---------- reserve_contact_artwork ----------
-- p_files: [{ "name": "logo.ai", "size": 123456 }, ...], at most 3 entries,
-- 10 MB each, 25 MB together, extension in the allowlist. The caller is the
-- service role (app/api/contact), but like create_lead_from_contact this does
-- not trust it: names are re-sanitized and every bound is re-checked here.
-- Returns [{ "path", "name", "content_type" }] in input order.
CREATE OR REPLACE FUNCTION public.reserve_contact_artwork(
  p_deal_id UUID,
  p_submission_id UUID,
  p_files JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $fn$
DECLARE
  v_count INT;
  v_total BIGINT := 0;
  v_existing INT;
  v_idx INT := 0;
  v_item JSONB;
  v_raw_name TEXT;
  v_name TEXT;
  v_path_name TEXT;
  v_ext TEXT;
  v_type TEXT;
  v_size BIGINT;
  v_path TEXT;
  v_out JSONB := '[]'::jsonb;
BEGIN
  IF p_deal_id IS NULL OR p_submission_id IS NULL THEN
    RAISE EXCEPTION 'A deal and a submission are required.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.deals d WHERE d.id = p_deal_id) THEN
    RAISE EXCEPTION 'Unknown deal.' USING ERRCODE = 'P0002';
  END IF;

  IF p_files IS NULL OR jsonb_typeof(p_files) <> 'array' THEN
    RAISE EXCEPTION 'Files must be an array.' USING ERRCODE = '22023';
  END IF;

  v_count := jsonb_array_length(p_files);
  IF v_count < 1 OR v_count > 3 THEN
    RAISE EXCEPTION 'Between 1 and 3 files are allowed.' USING ERRCODE = '22023';
  END IF;

  -- A deal accumulates artwork across repeat submissions from the same
  -- contact (create_lead_from_contact appends to an open deal), so bound the
  -- lifetime total as well as the per-submission count.
  SELECT count(*) INTO v_existing FROM public.contact_artwork ca WHERE ca.deal_id = p_deal_id;
  IF v_existing + v_count > 12 THEN
    RAISE EXCEPTION 'This deal already has the maximum amount of artwork.' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_files)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' OR jsonb_typeof(v_item -> 'name') <> 'string'
       OR jsonb_typeof(v_item -> 'size') <> 'number' THEN
      RAISE EXCEPTION 'Each file needs a name and a size.' USING ERRCODE = '22023';
    END IF;

    v_raw_name := v_item ->> 'name';
    v_size := (v_item ->> 'size')::numeric::bigint;

    IF v_size < 1 OR v_size > 10485760 THEN
      RAISE EXCEPTION 'A file is empty or larger than 10 MB.' USING ERRCODE = '22023';
    END IF;
    v_total := v_total + v_size;
    IF v_total > 26214400 THEN
      RAISE EXCEPTION 'The files together are larger than 25 MB.' USING ERRCODE = '22023';
    END IF;

    -- Display name: no path separators or control characters, bounded.
    v_name := left(btrim(regexp_replace(regexp_replace(v_raw_name, '^.*[/\\]', ''), '[[:cntrl:]]+', '', 'g')), 120);
    v_ext := lower(substring(v_name from '\.([A-Za-z0-9]+)$'));
    v_type := CASE v_ext
      WHEN 'ai' THEN 'application/illustrator'
      WHEN 'eps' THEN 'application/postscript'
      WHEN 'pdf' THEN 'application/pdf'
      WHEN 'png' THEN 'image/png'
      WHEN 'jpg' THEN 'image/jpeg'
      WHEN 'jpeg' THEN 'image/jpeg'
      WHEN 'dst' THEN 'application/octet-stream'
      ELSE NULL
    END;
    IF v_type IS NULL THEN
      RAISE EXCEPTION 'File type is not accepted.' USING ERRCODE = '22023';
    END IF;

    -- Storage key segment: ASCII letters, digits, dot, underscore, hyphen.
    v_path_name := left(trim(both '._' FROM regexp_replace(v_name, '[^A-Za-z0-9._-]+', '_', 'g')), 80);
    IF v_path_name = '' OR v_path_name !~* ('\.' || v_ext || '$') THEN
      v_path_name := left(coalesce(nullif(v_path_name, ''), 'artwork'), 76) || '.' || v_ext;
    END IF;

    v_idx := v_idx + 1;
    v_path := p_deal_id::text || '/' || p_submission_id::text || '/' || v_idx::text || '-' || v_path_name;

    INSERT INTO public.contact_artwork (
      deal_id, submission_id, storage_path, original_name, content_type, declared_size_bytes
    )
    VALUES (p_deal_id, p_submission_id, v_path, v_name, v_type, v_size);

    v_out := v_out || jsonb_build_array(
      jsonb_build_object('path', v_path, 'name', v_name, 'content_type', v_type)
    );
  END LOOP;

  RETURN v_out;
END;
$fn$;

-- ---------- attach_contact_artwork ----------
-- p_verified: [{ "storage_path": "...", "size_bytes": 123 }, ...], the objects
-- the route found in storage and checked. Reserved rows for this submission
-- that are not listed are deleted and their paths returned so the route can
-- remove the objects. Idempotent: a repeat call changes nothing and still
-- reports every attached file.
CREATE OR REPLACE FUNCTION public.attach_contact_artwork(
  p_deal_id UUID,
  p_submission_id UUID,
  p_verified JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $fn$
DECLARE
  v_verified JSONB := coalesce(p_verified, '[]'::jsonb);
  v_newly INT := 0;
  v_removed JSONB := '[]'::jsonb;
  v_names JSONB;
  v_deal RECORD;
  v_admin_id UUID;
  v_summary TEXT;
BEGIN
  IF p_deal_id IS NULL OR p_submission_id IS NULL THEN
    RAISE EXCEPTION 'A deal and a submission are required.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(v_verified) <> 'array' THEN
    RAISE EXCEPTION 'Verified files must be an array.' USING ERRCODE = '22023';
  END IF;

  -- Serialize completion of one submission (a double call, or a retry).
  PERFORM pg_advisory_xact_lock(hashtext('attach_contact_artwork'), hashtext(p_submission_id::text));

  WITH verified AS (
    SELECT (e ->> 'storage_path') AS storage_path,
           (e ->> 'size_bytes')::numeric::bigint AS size_bytes
    FROM jsonb_array_elements(v_verified) AS e
    WHERE jsonb_typeof(e) = 'object'
      AND jsonb_typeof(e -> 'storage_path') = 'string'
      AND jsonb_typeof(e -> 'size_bytes') = 'number'
  ),
  attached AS (
    UPDATE public.contact_artwork ca
    SET status = 'attached', size_bytes = v.size_bytes, attached_at = now()
    FROM verified v
    WHERE ca.deal_id = p_deal_id
      AND ca.submission_id = p_submission_id
      AND ca.status = 'pending'
      AND ca.storage_path = v.storage_path
      AND v.size_bytes BETWEEN 1 AND 10485760
    RETURNING ca.id
  )
  SELECT count(*) INTO v_newly FROM attached;

  WITH removed AS (
    DELETE FROM public.contact_artwork ca
    WHERE ca.deal_id = p_deal_id
      AND ca.submission_id = p_submission_id
      AND ca.status = 'pending'
    RETURNING ca.storage_path
  )
  SELECT coalesce(jsonb_agg(storage_path), '[]'::jsonb) INTO v_removed FROM removed;

  SELECT coalesce(jsonb_agg(ca.original_name ORDER BY ca.storage_path), '[]'::jsonb)
    INTO v_names
  FROM public.contact_artwork ca
  WHERE ca.deal_id = p_deal_id AND ca.submission_id = p_submission_id AND ca.status = 'attached';

  IF v_newly > 0 THEN
    SELECT d.company_id, d.contact_id INTO v_deal FROM public.deals d WHERE d.id = p_deal_id;

    SELECT au.id INTO v_admin_id
    FROM auth.users au
    WHERE lower(au.email) = lower(public.pinned_admin_email())
    LIMIT 1;

    IF v_admin_id IS NOT NULL AND v_deal.company_id IS NOT NULL THEN
      SELECT string_agg(
               ca.original_name || ' (' || round(ca.size_bytes / 1024.0)::text || ' KB)',
               ', ' ORDER BY ca.storage_path)
        INTO v_summary
      FROM public.contact_artwork ca
      WHERE ca.deal_id = p_deal_id AND ca.submission_id = p_submission_id AND ca.status = 'attached';

      INSERT INTO public.notes (company_id, contact_id, deal_id, content, created_by, visibility)
      VALUES (
        v_deal.company_id,
        v_deal.contact_id,
        p_deal_id,
        'Artwork uploaded with the production request: ' || v_summary,
        v_admin_id,
        'internal'
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'attached', jsonb_array_length(v_names),
    'attached_names', v_names,
    'removed_paths', v_removed
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.reserve_contact_artwork(UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reserve_contact_artwork(UUID, UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.reserve_contact_artwork(UUID, UUID, JSONB) FROM authenticated;
REVOKE ALL ON FUNCTION public.attach_contact_artwork(UUID, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.attach_contact_artwork(UUID, UUID, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.attach_contact_artwork(UUID, UUID, JSONB) FROM authenticated;

COMMENT ON FUNCTION public.reserve_contact_artwork(UUID, UUID, JSONB) IS
  'Service-role-only: reserves storage paths for a production request''s artwork after the lead exists. Never grant to anon/authenticated.';
COMMENT ON FUNCTION public.attach_contact_artwork(UUID, UUID, JSONB) IS
  'Service-role-only: marks verified uploads attached, drops the rest, notes the deal. Never grant to anon/authenticated.';

-- ---------- create_lead_from_contact: deal title by source ----------
-- Identical to the 0029 body except for the title of a NEW deal: production
-- requests are titled "Production request — <company or name>" so they stand
-- out in the pipeline list from "Website inquiry — ..." web briefs. A repeat
-- submission that lands on an existing open deal still only appends a note
-- (its source is already named in the note text).
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
  v_deal_title_prefix TEXT;
  v_deal_description TEXT;
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

  v_domain := split_part(v_email, '@', 2);

  SELECT c.id, c.company_id INTO v_contact_id, v_company_id
  FROM public.contacts c
  WHERE lower(c.email) = v_email
  LIMIT 1;

  IF v_contact_id IS NULL THEN
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
      INSERT INTO public.companies (name, email, created_by)
      VALUES (v_name, v_email, v_admin_id)
      RETURNING id INTO v_company_id;
    END IF;

    INSERT INTO public.contacts (company_id, first_name, last_name, email, created_by)
    VALUES (v_company_id, v_first_name, v_last_name, v_email, v_admin_id)
    RETURNING id INTO v_contact_id;
  END IF;

  SELECT co.name INTO v_company_name
  FROM public.companies co
  WHERE co.id = v_company_id;

  v_company_name := nullif(btrim(coalesce(v_company_name, '')), '');

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
    v_deal_title_prefix := CASE v_source
      WHEN 'website_production_request' THEN 'Production request — '
      ELSE 'Website inquiry — '
    END;
    v_deal_title := left(v_deal_title_prefix || coalesce(v_company_name, v_name), 200);

    INSERT INTO public.deals (company_id, contact_id, title, description, owner_id, stage)
    VALUES (v_company_id, v_contact_id, v_deal_title, nullif(v_deal_description, ''), v_admin_id, 'prospecting')
    RETURNING id INTO v_deal_id;

    v_lead_created := true;
  END IF;

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
