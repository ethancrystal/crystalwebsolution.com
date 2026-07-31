-- Project Delivery Aggregate and Command Boundary
-- Crystal Web Solution CRM, Task 3.
-- Additive to 0001-0008. Never edit those files in place once applied.
--
-- Replaces the superseded 0009_project_realtime_crm.sql: that migration was a
-- draft that never left the originating worktree and is intentionally dropped
-- (see the commit that adds this file). The production-relevant project
-- aggregate is defined here.
--
-- This migration:
--   1. Creates the delivery aggregate (projects + membership + history +
--      tasks + approvals + deliverables + notifications + audit).
--   2. Rebinds the existing project_messages / project_files (keyed by
--      deal_id from 0003) onto projects.id via an optional project_id, so a
--      won deal can become exactly one project without exposing every deal.
--   3. Encodes authorization entirely through SECURITY DEFINER RPCs with a
--      fixed search_path and revoked public/anon execution. No browser
--      client can mutate status, membership, company, or approvals directly;
--      every command writes the domain row, an audit_events row, and enqueues
--      affected users in notifications_outbox inside one transaction.

-- ---------- 1. Delivery aggregate ----------

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_deal_id UUID UNIQUE REFERENCES public.deals(id) ON DELETE SET NULL,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 120),
  summary TEXT CHECK (char_length(btrim(summary)) BETWEEN 0 AND 10000),
  project_type TEXT NOT NULL CHECK (
    project_type IN (
      'web_design', 'logo_creation', 'branding', 'marketing', 'ai_automation'
    )
  ),
  status TEXT NOT NULL DEFAULT 'brief_submitted'
    CHECK (status IN (
      'brief_submitted', 'planned', 'in_progress', 'client_review',
      'changes_requested', 'approved', 'delivered', 'on_hold', 'cancelled'
    )),
  target_date DATE,
  budget_amount NUMERIC(15, 2) CHECK (budget_amount IS NULL OR budget_amount >= 0),
  currency TEXT DEFAULT 'USD' CHECK (char_length(btrim(currency)) BETWEEN 0 AND 8),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ---------- 2. Rebind existing project_messages / project_files onto projects ----------

-- 0003 defined project_messages(deal_id, ...) and project_files(deal_id, ...).
-- Keep the deal linkage (so legacy threads stay queryable) and add an optional
-- project_id so delivery-project collaboration can attach to the same rows.
ALTER TABLE public.project_messages
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_messages_project_id
  ON public.project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id
  ON public.project_files(project_id);

CREATE TABLE public.project_members (
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_role TEXT NOT NULL CHECK (member_role IN ('project_manager', 'client', 'collaborator')),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE public.project_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT CHECK (char_length(btrim(note)) BETWEEN 0 AND 10000),
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description TEXT CHECK (char_length(btrim(description)) BETWEEN 0 AND 10000),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'blocked', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  client_visible BOOLEAN NOT NULL DEFAULT false,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.project_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  version TEXT NOT NULL DEFAULT '1' CHECK (char_length(btrim(version)) BETWEEN 1 AND 32),
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  size_bytes BIGINT CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 52428800)),
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.project_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  deliverable_id UUID REFERENCES public.project_deliverables(id) ON DELETE SET NULL,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decision TEXT NOT NULL DEFAULT 'pending'
    CHECK (decision IN ('pending', 'approved', 'rejected')),
  comment TEXT CHECK (char_length(btrim(comment)) BETWEEN 0 AND 10000),
  decided_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.notifications_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed')),
  attempts INT NOT NULL DEFAULT 0 CHECK (attempts >= 0 AND attempts <= 25),
  available_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ---------- 2. Rebind existing project_messages / project_files onto projects ----------

-- 0003 defined project_messages(deal_id, ...) and project_files(deal_id, ...).
-- Keep the deal linkage (so legacy threads stay queryable) and add an optional
-- project_id so delivery-project collaboration can attach to the same rows.
ALTER TABLE public.project_messages
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.project_files
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_project_messages_project_id
  ON public.project_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_files_project_id
  ON public.project_files(project_id);

-- ---------- 3. Authorization helpers (SECURITY DEFINER, fixed search_path) ----------
-- Role truth lives in profiles.role (user_role enum). We reuse the existing
-- current_profile_role() / is_admin() / is_project_manager() / is_staff()
-- helpers from 0008 rather than re-declaring them.

-- Can the caller access a project at all?
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects AS p
    WHERE p.id = p_project_id
      AND (
        public.is_admin()
        OR (
          public.is_project_manager()
          AND EXISTS (
            SELECT 1 FROM public.project_members AS m
            WHERE m.project_id = p.id AND m.user_id = auth.uid()
          )
        )
        OR (
          public.current_profile_role() = 'client'
          AND EXISTS (
            SELECT 1 FROM public.projects AS pc
            WHERE pc.id = p_project_id AND pc.company_id = (
              SELECT company_id FROM public.profiles WHERE id = auth.uid()
            )
          )
        )
      )
  );
$$;

-- Can the caller see internal (non-client-visible) collaboration?
CREATE OR REPLACE FUNCTION public.can_view_internal(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT public.is_admin() OR (
    public.is_project_manager() AND public.can_access_project(p_project_id)
  );
$$;

-- Is the caller an assigned project member (any role)?
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = pg_catalog, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members AS m
    WHERE m.project_id = p_project_id AND m.user_id = auth.uid()
  );
$$;

-- ---------- 4. Validated command RPCs ----------

-- Create a delivery project. Only admins or project managers may create; the
-- creating PM is auto-assigned as the project_manager member.
CREATE OR REPLACE FUNCTION public.create_delivery_project(
  p_company_id UUID,
  p_name TEXT,
  p_project_type TEXT,
  p_summary TEXT DEFAULT NULL,
  p_source_deal_id UUID DEFAULT NULL,
  p_target_date DATE DEFAULT NULL,
  p_budget_amount NUMERIC DEFAULT NULL,
  p_currency TEXT DEFAULT 'USD'
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text := public.current_profile_role();
  v_project public.projects%ROWTYPE;
BEGIN
  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'project_manager' THEN
    RAISE EXCEPTION 'Admin or project manager access required.' USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS NULL OR p_name IS NULL OR p_project_type IS NULL THEN
    RAISE EXCEPTION 'company_id, name, and project_type are required.' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RAISE EXCEPTION 'Unknown company.' USING ERRCODE = '23503';
  END IF;

  INSERT INTO public.projects (
    company_id, name, summary, project_type, source_deal_id,
    target_date, budget_amount, currency, created_by
  ) VALUES (
    p_company_id, btrim(p_name), NULLIF(btrim(p_summary), ''), p_project_type,
    p_source_deal_id, p_target_date, p_budget_amount,
    NULLIF(btrim(p_currency), ''), auth.uid()
  )
  RETURNING * INTO v_project;

  INSERT INTO public.project_members (project_id, user_id, member_role, assigned_by)
  VALUES (v_project.id, auth.uid(), 'project_manager', auth.uid());

  INSERT INTO public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  VALUES (auth.uid(), v_project.id, v_project.company_id, 'project_created',
          jsonb_build_object('name', v_project.name, 'type', p_project_type));

  RETURN v_project;
END;
$$;

-- Transition project status. Validates the caller's role/membership and the
-- allowed transition, writes history + audit, and enqueues notifications.
CREATE OR REPLACE FUNCTION public.transition_project_status(
  p_project_id UUID,
  p_to_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.projects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text := public.current_profile_role();
  v_project public.projects%ROWTYPE;
  v_allowed text[];
  v_client_visible boolean;
BEGIN
  IF p_project_id IS NULL OR p_to_status IS NULL THEN
    RAISE EXCEPTION 'project_id and to_status are required.' USING ERRCODE = '22023';
  END IF;

  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'project_manager' THEN
    RAISE EXCEPTION 'Admin or project manager access required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Project access denied.' USING ERRCODE = '42501';
  END IF;

  -- Allowed transitions (mirrors lib/crm/project-contract.mjs).
  v_allowed := ARRAY[
    'brief_submitted:planned', 'brief_submitted:cancelled',
    'planned:in_progress', 'planned:on_hold', 'planned:cancelled',
    'in_progress:client_review', 'in_progress:on_hold', 'in_progress:cancelled',
    'client_review:changes_requested', 'client_review:approved',
    'client_review:on_hold', 'client_review:cancelled',
    'changes_requested:in_progress', 'changes_requested:on_hold', 'changes_requested:cancelled',
    'approved:delivered', 'approved:on_hold', 'approved:cancelled',
    'on_hold:planned', 'on_hold:in_progress', 'on_hold:cancelled'
  ];

  SELECT p.* INTO v_project
  FROM public.projects AS p
  WHERE p.id = p_project_id
  FOR UPDATE;

  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (v_project.status || ':' || p_to_status = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Illegal status transition: % -> %', v_project.status, p_to_status
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.projects
  SET status = p_to_status, updated_at = now()
  WHERE id = p_project_id;

  INSERT INTO public.project_status_history (
    project_id, from_status, to_status, note, changed_by
  ) VALUES (
    p_project_id, v_project.status, p_to_status,
    NULLIF(btrim(p_note), ''), auth.uid()
  );

  INSERT INTO public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  VALUES (auth.uid(), p_project_id, v_project.company_id, 'status_transition',
          jsonb_build_object('from', v_project.status, 'to', p_to_status));

  -- Notify assigned members (excluding the actor).
  INSERT INTO public.notifications_outbox (recipient_id, project_id, event_type, payload)
  SELECT m.user_id, p_project_id, 'status_transition',
         jsonb_build_object('from', v_project.status, 'to', p_to_status)
  FROM public.project_members AS m
  WHERE m.project_id = p_project_id AND m.user_id <> auth.uid();

  SELECT p.* INTO v_project FROM public.projects AS p WHERE p.id = p_project_id;
  RETURN v_project;
END;
$$;

-- Record a client/PM approval decision on a deliverable.
CREATE OR REPLACE FUNCTION public.record_project_approval(
  p_project_id UUID,
  p_deliverable_id UUID,
  p_decision TEXT,
  p_comment TEXT DEFAULT NULL
)
RETURNS public.project_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text := public.current_profile_role();
  v_project public.projects%ROWTYPE;
  v_approval public.project_approvals%ROWTYPE;
BEGIN
  IF p_project_id IS NULL OR p_decision IS NULL THEN
    RAISE EXCEPTION 'project_id and decision are required.' USING ERRCODE = '22023';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Decision must be approved or rejected.' USING ERRCODE = '22023';
  END IF;

  -- Clients approve; project managers / admins may also decide.
  IF v_role IS DISTINCT FROM 'admin'
     AND v_role IS DISTINCT FROM 'project_manager'
     AND v_role IS DISTINCT FROM 'client' THEN
    RAISE EXCEPTION 'Approval access denied.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Project access denied.' USING ERRCODE = '42501';
  END IF;

  SELECT p.* INTO v_project
  FROM public.projects AS p WHERE p.id = p_project_id FOR UPDATE;

  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Project not found.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.project_approvals (
    project_id, deliverable_id, requested_by, decided_by, decision, comment, decided_at
  ) VALUES (
    p_project_id, p_deliverable_id, auth.uid(), auth.uid(), p_decision,
    NULLIF(btrim(p_comment), ''), now()
  )
  RETURNING * INTO v_approval;

  INSERT INTO public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  VALUES (auth.uid(), p_project_id, v_project.company_id, 'approval_recorded',
          jsonb_build_object('decision', p_decision, 'deliverable_id', p_deliverable_id));

  INSERT INTO public.notifications_outbox (recipient_id, project_id, event_type, payload)
  SELECT m.user_id, p_project_id, 'approval_recorded',
         jsonb_build_object('decision', p_decision)
  FROM public.project_members AS m
  WHERE m.project_id = p_project_id AND m.user_id <> auth.uid();

  RETURN v_approval;
END;
$$;

-- Publish a deliverable (make it client-visible). PM/admin only.
CREATE OR REPLACE FUNCTION public.publish_project_deliverable(
  p_project_id UUID,
  p_deliverable_id UUID
)
RETURNS public.project_deliverables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_role text := public.current_profile_role();
  v_project public.projects%ROWTYPE;
  v_deliverable public.project_deliverables%ROWTYPE;
BEGIN
  IF p_project_id IS NULL OR p_deliverable_id IS NULL THEN
    RAISE EXCEPTION 'project_id and deliverable_id are required.' USING ERRCODE = '22023';
  END IF;

  IF v_role IS DISTINCT FROM 'admin' AND v_role IS DISTINCT FROM 'project_manager' THEN
    RAISE EXCEPTION 'Admin or project manager access required.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.can_access_project(p_project_id) THEN
    RAISE EXCEPTION 'Project access denied.' USING ERRCODE = '42501';
  END IF;

  SELECT p.* INTO v_project
  FROM public.projects AS p WHERE p.id = p_project_id FOR UPDATE;

  SELECT d.* INTO v_deliverable
  FROM public.project_deliverables AS d
  WHERE d.id = p_deliverable_id AND d.project_id = p_project_id;

  IF v_deliverable.id IS NULL THEN
    RAISE EXCEPTION 'Deliverable not found for this project.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.project_deliverables
  SET published_by = auth.uid(), published_at = now()
  WHERE id = p_deliverable_id;

  INSERT INTO public.audit_events (actor_id, project_id, company_id, event_type, metadata)
  VALUES (auth.uid(), p_project_id, v_project.company_id, 'deliverable_published',
          jsonb_build_object('deliverable_id', p_deliverable_id));

  INSERT INTO public.notifications_outbox (recipient_id, project_id, event_type, payload)
  SELECT m.user_id, p_project_id, 'deliverable_published',
         jsonb_build_object('deliverable_id', p_deliverable_id)
  FROM public.project_members AS m
  WHERE m.project_id = p_project_id AND m.user_id <> auth.uid();

  SELECT d.* INTO v_deliverable
  FROM public.project_deliverables AS d WHERE d.id = p_deliverable_id;
  RETURN v_deliverable;
END;
$$;

-- ---------- 5. Revoke / grant execution ----------
-- No direct browser mutation of status/membership/approvals/deliverables is
-- permitted; everything goes through the RPCs above.
REVOKE ALL ON FUNCTION public.create_delivery_project(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, NUMERIC, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_delivery_project(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, NUMERIC, TEXT
) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_delivery_project(
  UUID, TEXT, TEXT, TEXT, UUID, DATE, NUMERIC, TEXT
) TO authenticated;

REVOKE ALL ON FUNCTION public.transition_project_status(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_project_status(UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.transition_project_status(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.record_project_approval(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_project_approval(UUID, UUID, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.record_project_approval(UUID, UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.publish_project_deliverable(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_project_deliverable(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.publish_project_deliverable(UUID, UUID) TO authenticated;

-- Helpers are read-side; only authenticated callers may use them.
REVOKE ALL ON FUNCTION public.can_access_project(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_project(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_access_project(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.can_view_internal(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_internal(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_view_internal(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.is_project_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_project_member(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_project_member(UUID) TO authenticated;

-- ---------- 6. Row Level Security ----------
-- Every table is force-RLS so there is no unauthenticated or ownership-less
-- read path. No direct INSERT/UPDATE/DELETE policies exist on domain tables;
-- all writes occur through the SECURITY DEFINER RPCs above.

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;
CREATE POLICY "Projects are visible to authorized roles"
  ON public.projects FOR SELECT TO authenticated
  USING (public.can_access_project(id));

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members FORCE ROW LEVEL SECURITY;
CREATE POLICY "Members are visible to project participants"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

ALTER TABLE public.project_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_status_history FORCE ROW LEVEL SECURITY;
CREATE POLICY "Status history is visible to project participants"
  ON public.project_status_history FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_tasks FORCE ROW LEVEL SECURITY;
CREATE POLICY "Tasks are visible to project participants"
  ON public.project_tasks FOR SELECT TO authenticated
  USING (
    public.can_access_project(project_id)
    AND (client_visible OR public.can_view_internal(project_id))
  );

ALTER TABLE public.project_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_approvals FORCE ROW LEVEL SECURITY;
CREATE POLICY "Approvals are visible to project participants"
  ON public.project_approvals FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

ALTER TABLE public.project_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_deliverables FORCE ROW LEVEL SECURITY;
CREATE POLICY "Published deliverables are visible to participants"
  ON public.project_deliverables FOR SELECT TO authenticated
  USING (
    public.can_access_project(project_id)
    AND (published_at IS NOT NULL OR public.can_view_internal(project_id))
  );

ALTER TABLE public.notifications_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications_outbox FORCE ROW LEVEL SECURITY;
CREATE POLICY "Recipients see their own notifications"
  ON public.notifications_outbox FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events FORCE ROW LEVEL SECURITY;
CREATE POLICY "Audit events are admin-read-only"
  ON public.audit_events FOR SELECT TO authenticated
  USING (public.current_profile_role() = 'admin');

-- Rebound message/file tables keep their existing 0003 deal-based policies and
-- simply gain project-scoped visibility as well.
DROP POLICY IF EXISTS "Deal participants can view messages" ON public.project_messages;
CREATE POLICY "Project or deal participants can view messages"
  ON public.project_messages FOR SELECT TO authenticated
  USING (
    (project_id IS NOT NULL AND public.can_access_project(project_id))
    OR (project_id IS NULL AND public.can_access_deal(deal_id))
  );

DROP POLICY IF EXISTS "Deal participants can view files" ON public.project_files;
CREATE POLICY "Project or deal participants can view files"
  ON public.project_files FOR SELECT TO authenticated
  USING (
    (project_id IS NOT NULL AND public.can_access_project(project_id))
    OR (project_id IS NULL AND public.can_access_deal(deal_id))
  );

-- ---------- 7. Indexes ----------
CREATE INDEX projects_company_created_idx ON public.projects(company_id, created_at DESC);
CREATE INDEX projects_status_created_idx ON public.projects(status, created_at DESC);
CREATE INDEX projects_source_deal_idx ON public.projects(source_deal_id);
CREATE INDEX projects_created_by_idx ON public.projects(created_by);

CREATE INDEX project_members_user_project_idx ON public.project_members(user_id, project_id);
CREATE INDEX project_members_project_idx ON public.project_members(project_id);
CREATE INDEX project_members_assigned_by_idx ON public.project_members(assigned_by);

CREATE INDEX project_status_history_project_created_idx
  ON public.project_status_history(project_id, created_at DESC);
CREATE INDEX project_status_history_changed_by_idx
  ON public.project_status_history(changed_by);

CREATE INDEX project_tasks_project_idx ON public.project_tasks(project_id);
CREATE INDEX project_tasks_assignee_idx ON public.project_tasks(assignee_id);
CREATE INDEX project_tasks_status_idx ON public.project_tasks(status);

CREATE INDEX project_approvals_project_idx ON public.project_approvals(project_id);
CREATE INDEX project_approvals_deliverable_idx ON public.project_approvals(deliverable_id);
CREATE INDEX project_approvals_decision_idx ON public.project_approvals(decision);

CREATE INDEX project_deliverables_project_idx ON public.project_deliverables(project_id);
CREATE INDEX project_deliverables_published_idx
  ON public.project_deliverables(project_id, published_at);

CREATE INDEX notifications_outbox_recipient_idx
  ON public.notifications_outbox(recipient_id, status);
CREATE INDEX notifications_outbox_project_idx
  ON public.notifications_outbox(project_id);
CREATE INDEX notifications_outbox_available_idx
  ON public.notifications_outbox(status, available_at);

CREATE INDEX audit_events_project_created_idx
  ON public.audit_events(project_id, created_at DESC);
CREATE INDEX audit_events_company_idx ON public.audit_events(company_id);
CREATE INDEX audit_events_actor_idx ON public.audit_events(actor_id);
