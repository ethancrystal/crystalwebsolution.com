-- Under the confirmed "admin assigns" model, a PM has no legitimate reason to
-- originate a new client company or contact any more than they do a deal
-- or task (0005 already made deal/task creation admin-only). 0005 didn't
-- touch these two INSERT policies, so PMs could still create companies/
-- contacts directly under is_staff() — this closes that gap for
-- consistency with the rest of the admin-driven creation model.
--
-- Additive to 0001-0005 - never edit those files in place once applied.

DROP POLICY "Staff can create companies" ON public.companies;
CREATE POLICY "Admin can create companies" ON public.companies
  FOR INSERT WITH CHECK (public.is_admin() AND created_by = auth.uid());

DROP POLICY "Staff can create contacts" ON public.contacts;
CREATE POLICY "Admin can create contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_admin() AND created_by = auth.uid());

-- SELECT/UPDATE on companies/contacts stay on is_staff() (admin or PM) -
-- a PM still needs to view and update the companies/contacts tied to
-- their assigned deals; only origination is admin-only.
