<!-- markdownlint-disable-file -->

# Task Research Notes: Notes Scoping Fix

## Research Executed

### File Analysis

- supabase/migrations/0001_crm_schema.sql
  - Lines 86-95: `notes` table schema - `company_id UUID NOT NULL`, `contact_id UUID` (nullable, FK to contacts), `deal_id UUID` (nullable, FK to deals), `content`, `created_by UUID NOT NULL`.
  - Lines 212-219: original notes RLS - `"Staff can view all notes"` (`is_staff()`), `"Company members can view notes"` (`is_company_member(company_id)`), and the flagged gap: `"Any authenticated user can create notes"` `FOR INSERT WITH CHECK (auth.role() = 'authenticated')` - no `company_id`/`deal_id`/`created_by` scoping at all.
  - No `UPDATE` policy for `notes` exists anywhere across 0001-0006 - RLS default-denies all updates today (out of scope for this fix; noted for completeness only).
- supabase/migrations/0002_crm_security_hardening.sql
  - Line 51-52: `"Staff can delete notes"` (`is_staff()`) - the only other notes policy added here.
- supabase/migrations/0005_pm_scoping_and_project_type.sql
  - Lines 128-138: notes `SELECT` was re-scoped here - `"Admin can view all notes"` (`is_admin()`), `"PM can view notes on assigned deals"` (`is_pm() AND deal_id IS NOT NULL AND can_access_deal(deal_id)`); `"Company members can view notes"` from 0001 explicitly left unchanged. Lines 136-138 contain the exact pre-existing comment flagging this task's gap as deferred, out of scope for that migration.
  - Lines 149-150: `"Staff can delete notes"` replaced with `"Admin can delete notes"` (`is_admin()`).
  - Lines 176-186 (`is_pm()` helper) and lines 194-198 (`is_staff()` redefined as `is_admin() OR is_pm()`) - the two building-block functions every policy below composes with.
  - Explicit design precedent (companies/contacts section, mirrored in the plan doc's Step 1 rationale): company/contact `SELECT`/`UPDATE` were deliberately **left on blanket `is_staff()`**, not split into per-assignment PM policies - "this plan doesn't tighten that, only deal/message/file/task-assignment scoping." This is the direct precedent for how company-level (non-deal) notes should be scoped: blanket staff, not per-PM-assignment.
- supabase/migrations/0006_admin_only_company_contact_creation.sql
  - Companies/contacts `INSERT` was made `is_admin() AND created_by = auth.uid()` - establishes the project's convention of pairing an `is_admin()`/`is_pm()` check with a `created_by = auth.uid()` (or `sender_id`/`uploaded_by = auth.uid()`) ownership check on every `INSERT ... WITH CHECK` added since 0003, so the actor field can't be spoofed to misattribute authorship. The original 0001 notes INSERT policy predates this convention and has no such check.
- supabase/migrations/0003_project_delivery.sql
  - Lines 32-39: `"Company members can submit a project brief"` - the established pattern for a client-scoped `INSERT` policy: `is_company_member(company_id) AND owner_id = auth.uid()`, added as a **second, additive** permissive policy alongside the staff one rather than replacing it (RLS policies are OR'd per command).
  - Lines 44-52: `can_access_deal(p_deal_id)` - the shared helper already reused by `project_messages`, `project_files`, and the Storage bucket policies (`FOR SELECT`/`FOR INSERT WITH CHECK (public.can_access_deal(deal_id) AND sender_id = auth.uid())` pattern for messages, `uploaded_by` for files). This is the exact helper to reuse for deal-scoped notes rather than re-deriving PM/company-member logic inline.
  - This function was live-verified end-to-end (admin/PM-assigned/isolated-PM/company-member) in this session's Step 6 verification pass, so reusing it here inherits already-proven correctness rather than introducing new untested logic.
- plans/crm-roles-project-types.md
  - Lines 326-333: the exact task description this fix addresses, written by the prior planning session - confirms this is explicitly deferred, not accidentally missed, and must ship as its own additive migration, never folded backward into 0001-0006.

### Code Search Results

- `from('notes')` / `NotesPanel` usages
  - `components/crm/NotesPanel.jsx` - the only component that reads or writes `notes`. On submit it always sends `{ company_id, contact_id, deal_id, content, created_by: user.id }`, with `contact_id`/`deal_id` `null` unless supplied by the parent page. `created_by` is already always the current session's own `user.id` client-side - the missing server-side `created_by = auth.uid()` check would only matter against a direct API call bypassing this UI, not against anything the UI itself can trigger.
  - `app/admin/companies/[id]/page.jsx:185` - `<NotesPanel companyId={company.id} />` (no `contactId`, no `dealId`).
  - `app/admin/contacts/[id]/page.jsx:218` - `<NotesPanel companyId={contact.company_id} contactId={contact.id} />` (no `dealId`).
  - `app/admin/deals/[id]/page.jsx:267` - `<NotesPanel companyId={deal.company_id} contactId={deal.contact_id} dealId={id} />` (all three set).
  - **Critical finding**: all three call sites live under `app/admin/*`, which `middleware.js` already gates to `admin`/`project_manager` only. There is **no client-facing UI that renders `NotesPanel` today** (nothing under `app/dashboard/*` imports it). The gap is real at the RLS/API layer (any authenticated `client` session can hand-craft a Supabase REST/JS call and insert a note against an arbitrary `deal_id`/`company_id` it has no relationship to) but is not currently reachable by clicking through the app's own UI. This changes urgency, not correctness - the fix should still close the RLS hole exactly as if the UI already exposed it, since RLS is the actual security boundary, but no app-code behavior change is required as a side effect of the migration (no existing legitimate client-side flow currently depends on the unscoped INSERT).
- `is_company_member`, `can_access_deal`, `is_pm`, `is_staff` callers
  - Confirmed via the migration file scan above; no other files (JS or SQL) reference notes RLS assumptions beyond `NotesPanel.jsx`'s own comment (line 22-24) noting "Notes RLS (0001_crm_schema.sql) scopes visibility by company_id, so companyId should always be supplied" - this comment describes the existing SELECT scoping (still correct, unaffected by this fix) and does not reference the INSERT gap.

### Project Conventions

- Additive-only migrations: every migration file (0002-0006) opens with a comment stating it is additive to prior files and prior files are never edited in place. The next file for this fix must be `0007_notes_creation_scoping.sql` (or equivalent descriptive name), following the exact `DROP POLICY "..." ON public.notes; CREATE POLICY "..." ON public.notes FOR INSERT WITH CHECK (...);` idiom used throughout 0002/0005/0006.
- Policy naming: policies are named `"<Role> can <verb> <table/scope>"` in Title Case, matching exactly what shows up in `pg_policies`/Supabase dashboard - e.g. `"Admin can view all notes"`, `"PM can view notes on assigned deals"`, `"Company members can submit a project brief"`.
- Every `INSERT ... WITH CHECK` added since 0003 pairs the role/scope check with an actor-identity check (`owner_id = auth.uid()`, `sender_id = auth.uid()`, `uploaded_by = auth.uid()`, `created_by = auth.uid()` in 0006) so the row's ownership/authorship field can't be spoofed independently of the session doing the insert.
- RLS policies are additive per command (Postgres OR's all matching permissive policies together) - the established pattern (0003's brief-submission policy) is to **add** a second/third narrower policy alongside a broader one rather than trying to encode every role's condition into one giant `WITH CHECK`.

## Key Discoveries

### Project Structure

Notes are a single flat table (`public.notes`) shared across three parent-entity contexts (company-only, company+contact, company+deal), rendered through one shared component (`NotesPanel.jsx`) on three admin-only detail pages. There is no separate "deal notes" vs "company notes" table - the same row shape and the same INSERT policy set must correctly cover both the deal-scoped case and the non-deal (company/contact) case.

### Implementation Patterns

Two structurally different INSERT needs exist, matching two already-established patterns elsewhere in the schema:

1. **Deal-scoped notes** (`deal_id IS NOT NULL`) - mirror `project_messages`/`project_files`: reuse `can_access_deal(deal_id)` directly, which already correctly resolves to admin-always / PM-if-assigned / company-member-of-that-deal's-company. This is the same helper Step 6 of the prior plan already verified live (PM-A can access their assigned deal, PM-B cannot, company member can).
2. **Non-deal notes** (`deal_id IS NULL`, i.e. attached only to a company or a company+contact) - mirror the companies/contacts SELECT/UPDATE precedent: blanket `is_staff()` for admin+PM alike (0005 explicitly chose not to tighten this), plus `is_company_member(company_id)` for the owning company's own members (mirroring the notes SELECT policy already scoped this way since 0001).

A `company_id` vs `deal_id` consistency gap exists in the naive version of pattern 1: a policy that only checks `can_access_deal(deal_id)` would still let the row's `company_id` column be set to an unrelated company (the two columns are independent inputs from the client). The fix must additionally assert `company_id = (SELECT company_id FROM public.deals WHERE id = deal_id)` so the note's stated company can't be spoofed independently of its deal.

### Complete Examples

```sql
-- 0007_notes_creation_scoping.sql
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

-- Non-deal (company/contact-level) notes: mirrors the companies/contacts
-- SELECT/UPDATE precedent from 0005 - blanket staff access (admin+PM alike,
-- deliberately not split further, matching that migration's own stated
-- rationale), plus the owning company's own members (mirrors the existing
-- notes SELECT policy's is_company_member(company_id) scoping from 0001).
CREATE POLICY "Staff can create company notes" ON public.notes
  FOR INSERT WITH CHECK (
    deal_id IS NULL
    AND public.is_staff()
    AND created_by = auth.uid()
  );

-- Live-tested addition (not in the first draft): Postgres RLS requires
-- INSERT...RETURNING to also satisfy a SELECT policy on the new row. 0005
-- only gave PM deal_id-scoped notes SELECT, so without this, a PM's own
-- company-level insert above would fail with "new row violates row-level
-- security policy" despite passing WITH CHECK - confirmed live via direct
-- JWT-impersonated SQL before this policy was added.
CREATE POLICY "PM can view company notes" ON public.notes
  FOR SELECT USING (public.is_pm() AND deal_id IS NULL);

CREATE POLICY "Company members can create company notes" ON public.notes
  FOR INSERT WITH CHECK (
    deal_id IS NULL
    AND public.is_company_member(company_id)
    AND created_by = auth.uid()
  );
```

### API and Schema Documentation

`public.notes` columns relevant to this fix (from 0001, unchanged):

- `company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE`
- `contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL` (nullable)
- `deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL` (nullable)
- `created_by UUID NOT NULL REFERENCES auth.users(id)`

`public.can_access_deal(p_deal_id UUID) RETURNS BOOLEAN` (0003, unchanged, already live-verified in this session's Step 6 pass):

```sql
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
```

### Technical Requirements

- Must be a new, additive migration file (`0007_notes_creation_scoping.sql`), never editing 0001-0006 in place - confirmed hard project convention, stated in every migration file's header comment.
- Must `DROP POLICY "Any authenticated user can create notes" ON public.notes;` before adding the replacements, matching the `DROP POLICY ...; CREATE POLICY ...;` idiom used throughout 0002/0005/0006 (Postgres has no `CREATE OR REPLACE POLICY`).
- No application code changes required - verified no client-facing call site exists that depends on the current unscoped behavior.
- No data backfill needed - this only changes the `INSERT` check, existing rows are unaffected.

## Recommended Approach

Add `0007_notes_creation_scoping.sql` with three replacement `INSERT` policies (shown in full above) in place of the single unscoped one:

1. `"Deal participants can create deal notes"` - `deal_id IS NOT NULL AND can_access_deal(deal_id) AND company_id` matches the deal's own company AND `created_by = auth.uid()`.
2. `"Staff can create company notes"` - `deal_id IS NULL AND is_staff() AND created_by = auth.uid()` (blanket admin+PM, matching the existing companies/contacts precedent).
3. `"Company members can create company notes"` - `deal_id IS NULL AND is_company_member(company_id) AND created_by = auth.uid()` (matches the existing notes SELECT scoping for clients).

This was the only approach evaluated in depth - it directly reuses two already-proven helpers (`is_staff()`, `can_access_deal()`) and two already-established policy shapes (the companies/contacts blanket-staff precedent, and the 0003 brief-submission client-scoping precedent) rather than inventing new logic, and requires no application code changes since no existing UI path depends on the current unscoped behavior.

## Implementation Guidance

- **Objectives**: Close the unscoped notes-creation RLS gap flagged in `plans/crm-roles-project-types.md` without touching any other table, policy, or app code.
- **Key Tasks**:
  1. Write `supabase/migrations/0007_notes_creation_scoping.sql` with the `DROP POLICY` + three `CREATE POLICY` statements above.
  2. Apply via the same mechanism prior migrations used (`mcp__supabase__apply_migration`, or equivalent), confirm via `list_migrations`.
  3. Verify: as PM-A, insert a note with `deal_id` = an assigned deal (should succeed); as PM-B, attempt the same `deal_id` (should fail/0 rows); as a client, insert a note with `deal_id`/`company_id` belonging to a different company (should fail); as a client, insert a note against their own `company_id` with `deal_id = NULL` (should succeed); as a client, attempt to set `company_id` to their own company but `deal_id` to a deal belonging to a *different* company (should fail on the `company_id = (SELECT company_id FROM deals ...)` check).
  4. Re-run (or extend) something equivalent to the prior Step 6 live-verification pattern used this session (`signInWithPassword` per role against the real project, admin service-role client for setup/cleanup) rather than trusting the SQL in isolation.
- **Dependencies**: Live Supabase project access (service-role key) to apply and verify the migration; no code dependencies since no app files change.
- **Success Criteria**: `0007` applied and listed; the four verification cases above all pass; `rg` for `"Any authenticated user can create notes"` returns no matches in `supabase/migrations/`; no regression in the existing three `NotesPanel.jsx` call sites (admin/PM can still add notes from all three detail pages, since `is_staff()`/`can_access_deal()` both cover those sessions).
