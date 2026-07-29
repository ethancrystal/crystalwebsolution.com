-- Project delivery lifecycle for Crystal Web Solution's CRM
-- Additive to 0001_crm_schema.sql and 0002_crm_security_hardening.sql -
-- never edit those files in place once applied.
--
-- Adds the customer-facing journey from brief submission to final file
-- delivery, layered on top of the existing `deals` table (a "deal" doubles
-- as a "project" once a client submits a brief):
-- 1. deals.project_status - a client-facing delivery timeline, separate
--    from deals.stage (which tracks the internal sales pipeline). A client
--    submitting a brief has no sales-stage concept; they care about
--    brief_submitted -> in_progress -> in_review -> delivered.
-- 2. A new permissive INSERT policy letting a company member submit their
--    own project brief as a deal (the existing INSERT policy only allowed
--    staff to create deals). owner_id defaults to the submitting client
--    themselves (deals.owner_id is NOT NULL) until a staff member/project
--    manager is assigned and reassigns it via the existing deal edit page.
-- 3. project_messages - a per-project conversation thread between the
--    assigned project manager (deals.owner_id) and the client's company.
-- 4. project_files - metadata for files shared in that thread, backed by a
--    new "project-files" Storage bucket. Storage object RLS mirrors the
--    project_files table policy via the same can_access_deal() helper.

-- ---------- 1. Client-facing delivery status ----------
ALTER TABLE public.deals
  ADD COLUMN project_status TEXT DEFAULT 'brief_submitted' NOT NULL;

ALTER TABLE public.deals
  ADD CONSTRAINT deals_project_status_check
  CHECK (project_status IN ('brief_submitted', 'in_progress', 'in_review', 'delivered'));

CREATE INDEX idx_deals_project_status ON public.deals(project_status);

-- ---------- 2. Let a client submit their own project brief ----------
-- Postgres RLS policies are additive (OR'd together per command) - this
-- adds a second permissive INSERT policy alongside "Staff can create
-- deals" rather than replacing it, so staff keep their existing ability.
CREATE POLICY "Company members can submit a project brief" ON public.deals
  FOR INSERT WITH CHECK (
    public.is_company_member(company_id)
    AND owner_id = auth.uid()
  );

-- ---------- 3. Shared helper: can the caller see/act on this deal? ----------
-- Reused by project_messages, project_files, and the Storage policies below
-- so all three enforce identical visibility without denormalizing
-- company_id onto every child table.
CREATE OR REPLACE FUNCTION public.can_access_deal(p_deal_id UUID) RETURNS BOOLEAN AS $$
  SELECT public.is_staff() OR EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = p_deal_id AND public.is_company_member(d.company_id)
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ---------- 4. Project messages (per-project conversation thread) ----------
CREATE TABLE public.project_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_messages_deal_id ON public.project_messages(deal_id);

ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can view messages" ON public.project_messages
  FOR SELECT USING (public.can_access_deal(deal_id));

CREATE POLICY "Deal participants can send messages" ON public.project_messages
  FOR INSERT WITH CHECK (public.can_access_deal(deal_id) AND sender_id = auth.uid());

CREATE POLICY "Staff can delete messages" ON public.project_messages
  FOR DELETE USING (public.is_staff());

-- ---------- 5. Project files (delivery attachments) ----------
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size BIGINT,
  content_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_project_files_deal_id ON public.project_files(deal_id);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deal participants can view files" ON public.project_files
  FOR SELECT USING (public.can_access_deal(deal_id));

CREATE POLICY "Deal participants can upload files" ON public.project_files
  FOR INSERT WITH CHECK (public.can_access_deal(deal_id) AND uploaded_by = auth.uid());

CREATE POLICY "Staff can delete files" ON public.project_files
  FOR DELETE USING (public.is_staff());

-- ---------- 6. Storage bucket + object policies ----------
-- Files are stored under `{deal_id}/{uuid}-{filename}` so the deal_id is
-- always the first path segment (storage.foldername(name)[1]) - this lets
-- object-level RLS reuse can_access_deal() without a join through
-- project_files, matching upload-time checks exactly.
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-files', 'project-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Deal participants can read project files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-files'
    AND public.can_access_deal((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Deal participants can upload project files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-files'
    AND public.can_access_deal((storage.foldername(name))[1]::UUID)
  );

CREATE POLICY "Staff can delete project files from storage" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-files'
    AND public.is_staff()
  );

-- ---------- 7. updated_at trigger parity with other tables ----------
-- project_messages/project_files are append-only (no UPDATE policy exists
-- on either), so no updated_at trigger is needed for them.

-- ---------- 8. Self-service company onboarding for brand-new clients ----------
-- A client who just signed up has profiles.company_id = NULL and no way to
-- submit a brief (deals.company_id is NOT NULL). They can't simply UPDATE
-- their own profiles.company_id - the 0002 trigger
-- (prevent_unauthorized_profile_changes) deliberately blocks a client from
-- ever setting that column themselves, since that's exactly the vector for
-- attaching yourself to an arbitrary, unrelated company's data. Rather than
-- carve an exception into that trigger (reopening the hole it exists to
-- close), this whole "create a company, join it, link my profile" sequence
-- runs as one SECURITY DEFINER transaction: the function itself guarantees
-- the company being linked was just created by the caller in this same
-- call, not an arbitrary pre-existing one, so profiles.company_id is safe
-- to set here despite the trigger (this function bypasses RLS/the trigger
-- by running as table owner, and enforces the safety property in code
-- instead).
CREATE OR REPLACE FUNCTION public.onboard_client_company(p_name TEXT, p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_existing_company_id UUID;
BEGIN
  SELECT company_id INTO v_existing_company_id FROM public.profiles WHERE id = auth.uid();
  IF v_existing_company_id IS NOT NULL THEN
    RAISE EXCEPTION 'You are already linked to a company.';
  END IF;

  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Company name is required.';
  END IF;

  INSERT INTO public.companies (name, email, created_by)
  VALUES (p_name, p_email, auth.uid())
  RETURNING id INTO v_company_id;

  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company_id, auth.uid(), 'owner');

  UPDATE public.profiles SET company_id = v_company_id WHERE id = auth.uid();

  RETURN v_company_id;
END;
$$;
