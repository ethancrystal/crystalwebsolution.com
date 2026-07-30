-- Fixes the gap flagged in plans/crm-roles-project-types.md (lines 326-333):
-- "Any authenticated user can create notes" (0001) has no company_id/deal_id
-- scoping. Any authenticated session, including role='client', could insert
-- a note against an arbitrary deal_id/company_id it has no relationship to.
-- No app-code change required: NotesPanel.jsx is only rendered from
-- app/admin/* pages (already gated to admin/project_manager by
-- middleware.js), so no existing legitimate flow relies on the unscoped
-- check - this closes an API-level RLS hole, not a UI-reachable bug.
--
-- Additive to 0001-0006 - never edit those files in place.

DROP POLICY "Any authenticated user can create notes" ON public.notes;

-- Deal-scoped notes: reuse can_access_deal() exactly like project_messages/
-- project_files already do (0003), so admin/assigned-PM/company-member are
-- covered by the same helper the rest of the deal-scoped tables use. The
-- extra company_id equality check stops company_id being set independently
-- of deal_id (deals.company_id is the source of truth once deal_id is set).
CREATE POLICY "Deal participants can create deal notes" ON public.notes
  FOR INSERT WITH CHECK (
    deal_id IS NOT NULL
    AND public.can_access_deal(deal_id)
    AND company_id = (SELECT company_id FROM public.deals WHERE id = deal_id)
    AND created_by = auth.uid()
  );

-- Non-deal (company/contact-level) notes: blanket staff (admin+PM), mirroring
-- the companies/contacts SELECT/UPDATE precedent from 0005 - PM already has
-- blanket view/update of companies/contacts themselves, and NotesPanel.jsx is
-- rendered on Company/Contact detail pages with no deal_id today, so PM needs
-- to keep adding notes there (live-verified pre-existing UX, preserved here).
--
-- Postgres RLS requires INSERT...RETURNING to also satisfy a SELECT policy on
-- the new row. 0005 only gave PM deal_id-scoped notes SELECT ("PM can view
-- notes on assigned deals", requires deal_id IS NOT NULL) - live-tested this
-- session and confirmed a PM's own company-level insert failed with "new row
-- violates row-level security policy" for exactly this reason (WITH CHECK
-- passed, but no SELECT policy covered deal_id IS NULL for PM). The
-- companion "PM can view company notes" SELECT policy below closes that gap
-- instead of narrowing INSERT to admin-only, since narrowing would have
-- broken PM's existing company/contact-notes UX.
CREATE POLICY "Staff can create company notes" ON public.notes
  FOR INSERT WITH CHECK (
    deal_id IS NULL
    AND public.is_staff()
    AND created_by = auth.uid()
  );

CREATE POLICY "PM can view company notes" ON public.notes
  FOR SELECT USING (public.is_pm() AND deal_id IS NULL);

CREATE POLICY "Company members can create company notes" ON public.notes
  FOR INSERT WITH CHECK (
    deal_id IS NULL
    AND public.is_company_member(company_id)
    AND created_by = auth.uid()
  );
