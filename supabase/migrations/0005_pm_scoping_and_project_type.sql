-- PM role scoping + project_type taxonomy for Crystal Web Solution's CRM
-- Additive to 0001-0003 and 0004_project_manager_role.sql - never edit
-- those files in place once applied.
--
-- See plans/crm-roles-project-types.md for full rationale (adversarially
-- reviewed against this live schema before finalizing - 9 confirmed issues
-- fixed, several critical: a naive is_staff() redefinition would have let
-- a PM self-insert into company_members and gain full access to an
-- unrelated client's projects; blanket DELETE policies would have stayed
-- PM-accessible; migrating profiles.role without also syncing
-- auth.users.raw_app_meta_data would have locked out every existing staff
-- account since middleware reads only the JWT claim).

-- ---------- 1. Migrate role data ----------
UPDATE public.profiles SET role = 'project_manager' WHERE role = 'staff';

-- ---------- 2. Sync app_metadata.role for the same accounts ----------
-- profiles.role and auth.users.raw_app_meta_data.role are independent
-- sources of truth (is_admin()/is_staff() check both; middleware.js checks
-- only the JWT claim). Already-issued access tokens for affected users
-- still carry the old claim until they refresh (~1hr, automatic).
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'project_manager')
WHERE id IN (SELECT id FROM public.profiles WHERE role = 'project_manager');

-- ---------- 3. is_pm() helper ----------
CREATE OR REPLACE FUNCTION public.is_pm() RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'project_manager'
         OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'project_manager'
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- ---------- 4. is_staff() = admin or PM (read/update scope unchanged) ----------
CREATE OR REPLACE FUNCTION public.is_staff() RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR public.is_pm()
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

-- Close existing function_search_path_mutable advisories on the other
-- helpers while touching this area (cheap, not scope creep - these are
-- already being conceptually touched by this migration). Parameter names
-- must match the original 0001 signatures exactly or CREATE OR REPLACE
-- errors (42P13).
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN AS $$
  SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
         OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
$$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_company_member(company_id UUID) RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE company_id = is_company_member.company_id AND user_id = auth.uid()
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- ---------- 5. company_members: admin-only INSERT/UPDATE ----------
-- Critical fix: under a naive is_staff() redefinition, a PM could INSERT
-- INTO company_members for any company, flipping is_company_member() true
-- and (combined with the rewritten can_access_deal() below) granting that
-- PM full access to every deal/message/file for that company.
DROP POLICY "Staff can manage members" ON public.company_members;
CREATE POLICY "Admin can manage members" ON public.company_members
  FOR INSERT WITH CHECK (public.is_admin());
DROP POLICY "Staff can update members" ON public.company_members;
CREATE POLICY "Admin can update members" ON public.company_members
  FOR UPDATE USING (public.is_admin());

-- ---------- 6. deals INSERT: admin-only (PM does not self-originate deals) ----------
DROP POLICY "Staff can create deals" ON public.deals;
CREATE POLICY "Admin can create deals" ON public.deals
  FOR INSERT WITH CHECK (public.is_admin());

-- ---------- 7. deals SELECT/UPDATE: tiered by assignment ----------
DROP POLICY "Staff can view all deals" ON public.deals;
CREATE POLICY "Admin can view all deals" ON public.deals
  FOR SELECT USING (public.is_admin());
CREATE POLICY "PM can view assigned deals" ON public.deals
  FOR SELECT USING (public.is_pm() AND owner_id = auth.uid());

DROP POLICY "Deal owner and staff can update" ON public.deals;
CREATE POLICY "Admin can update any deal" ON public.deals
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "PM can update assigned deal fields" ON public.deals
  FOR UPDATE USING (public.is_pm() AND owner_id = auth.uid())
  WITH CHECK (public.is_pm() AND owner_id = auth.uid());

-- ---------- 8. can_access_deal(): PM-per-assignment instead of blanket staff ----------
CREATE OR REPLACE FUNCTION public.can_access_deal(p_deal_id UUID) RETURNS BOOLEAN AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public.deals d
    WHERE d.id = p_deal_id
      AND (
        (public.is_pm() AND d.owner_id = auth.uid())
        OR public.is_company_member(d.company_id)
      )
  )
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- ---------- 9. profiles: let deal participants see the assigned owner ----------
-- Fixes a standing bug: app/dashboard/projects/[id]/page.jsx has always
-- shown "Not yet assigned" for clients because the old profiles SELECT
-- policy only allowed auth.uid()=id or is_admin() - a client could never
-- read a PM's profile row. Must be created after can_access_deal() above.
CREATE POLICY "Deal participants can view assigned owner profile" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.deals d
      WHERE d.owner_id = profiles.id AND public.can_access_deal(d.id)
    )
  );

-- ---------- 10. tasks: same per-assignment scoping as deals ----------
DROP POLICY "Staff can view all tasks" ON public.tasks;
CREATE POLICY "Admin can view all tasks" ON public.tasks
  FOR SELECT USING (public.is_admin());
-- "Assigned user can view task" (USING auth.uid() = assigned_to) from 0001
-- is unchanged and already gives a PM their own assigned tasks.

DROP POLICY "Staff can create tasks" ON public.tasks;
CREATE POLICY "Admin can create tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY "Assigned user and staff can update" ON public.tasks;
CREATE POLICY "Admin can update any task" ON public.tasks
  FOR UPDATE USING (public.is_admin());
CREATE POLICY "Assigned user can update own task" ON public.tasks
  FOR UPDATE USING (auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = assigned_to);

-- ---------- 11. notes: scope by deal_id where present ----------
DROP POLICY "Staff can view all notes" ON public.notes;
CREATE POLICY "Admin can view all notes" ON public.notes
  FOR SELECT USING (public.is_admin());
CREATE POLICY "PM can view notes on assigned deals" ON public.notes
  FOR SELECT USING (public.is_pm() AND deal_id IS NOT NULL AND public.can_access_deal(deal_id));
-- "Company members can view notes" from 0001 (is_company_member(company_id))
-- is unchanged and continues to cover the client side.
-- Known pre-existing gap, out of scope: "Any authenticated user can create
-- notes" (0001) has no company/deal scoping at all - predates the PM role
-- and is not made worse by this migration; needs its own follow-up.

-- ---------- 12. DELETE policies: admin-only everywhere ----------
DROP POLICY "Staff can delete companies" ON public.companies;
CREATE POLICY "Admin can delete companies" ON public.companies FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete contacts" ON public.contacts;
CREATE POLICY "Admin can delete contacts" ON public.contacts FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete deals" ON public.deals;
CREATE POLICY "Admin can delete deals" ON public.deals FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete tasks" ON public.tasks;
CREATE POLICY "Admin can delete tasks" ON public.tasks FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete notes" ON public.notes;
CREATE POLICY "Admin can delete notes" ON public.notes FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete company_members" ON public.company_members;
CREATE POLICY "Admin can delete company_members" ON public.company_members FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete messages" ON public.project_messages;
CREATE POLICY "Admin can delete messages" ON public.project_messages FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete files" ON public.project_files;
CREATE POLICY "Admin can delete files" ON public.project_files FOR DELETE USING (public.is_admin());
DROP POLICY "Staff can delete project files from storage" ON storage.objects;
CREATE POLICY "Admin can delete project files from storage" ON storage.objects
  FOR DELETE USING (bucket_id = 'project-files' AND public.is_admin());

-- ---------- 13. project_type taxonomy on deals ----------
ALTER TABLE public.deals ADD COLUMN project_type TEXT;
ALTER TABLE public.deals ADD CONSTRAINT deals_project_type_check
  CHECK (project_type IN ('logo', 'web', 'seo', 'smm', 'ai_automation', 'google_ads', 'branding'));
CREATE INDEX idx_deals_project_type ON public.deals(project_type);
