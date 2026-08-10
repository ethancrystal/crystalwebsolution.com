# Further CRM Completion & Hardening Plan

This document serves as the implementation specification and architectural roadmap for completing, hardening, and launching the Supabase-backed multi-role CRM (Client, Employee/Project Manager, and Admin portals). It addresses security gaps, usability needs, and integration steps compiled from deep-code audits.

---

## 1. Authentication & RBAC Hardening

### 1.1 Atomic Role Changes & Protection Rules
* **Issue**: Role changes currently update the database `profiles` table and user metadata (`app_metadata`) as separate, non-atomic calls (`app/admin/users/actions.js`). A failure between these calls leads to a "split-brain" state.
* **Remediation**:
  1. **Consolidate on Database Source**: Establish `profiles.role` as the single canonical source of truth for all RLS policies and page layouts.
  2. **Single Database Transaction**: Implement a Supabase database function (RPC) to update both tables atomically inside a single transaction:
     ```sql
     CREATE OR REPLACE FUNCTION private.update_user_role(p_user_id UUID, p_role public.user_role)
     RETURNS void AS $$
     BEGIN
       -- Verify target is not the last remaining admin
       IF p_role <> 'admin' AND EXISTS (
         SELECT 1 FROM public.profiles WHERE id = p_user_id AND role = 'admin'
       ) AND (
         SELECT count(*) FROM public.profiles WHERE role = 'admin'
       ) <= 1 THEN
         RAISE EXCEPTION 'Cannot demote the last remaining administrator.';
       END IF;

       -- Atomic update on profiles table
       UPDATE public.profiles SET role = p_role WHERE id = p_user_id;

       -- Sync to auth.users raw_app_meta_data
       UPDATE auth.users
       SET raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', to_jsonb(p_role))
       WHERE id = p_user_id;
     END;
     $$ LANGUAGE plpgsql SECURITY DEFINER;
     ```
  3. **Self-Demotion Safeguard**: Enforce inside the RPC that an active admin cannot demote themselves or the last remaining admin, preventing accidental lockout.

### 1.2 Multi-Portal Session Isolation
* **Issue**: Since all users sign in through `/login`, there is a risk of role leakage if an authenticated client attempts to manually access `/admin`, relying on middleware to bounce them.
* **Remediation**:
  1. Extend `lib/auth/roles.mjs` to validate absolute isolation at the portal chooser.
  2. Ensure the middleware `middleware.js` strictly compares the user's canonical database profile role with the requested path prefix.
  3. Force immediate cookie and session destruction if a mismatch is detected (e.g. client visiting `/admin`), preventing local cache session storage leaks.

---

## 2. Scoped RLS Policy Hardening

### 2.1 Project Manager Company/Contact Scoping
* **Issue**: Project Managers (Employees) currently have blanket `is_staff()` access allowing them to SELECT and UPDATE all companies and contacts, regardless of project assignment.
* **Remediation**:
  1. Replace the blanket policies in `supabase/migrations/` with `EXISTS` queries that scope PM access to companies and contacts involved in deals or projects explicitly assigned to them.
  2. Implement the following policy updates:
     ```sql
     -- Scoped SELECT for contacts assigned to PMs via projects
     CREATE POLICY pm_scoped_contacts ON public.contacts
     FOR SELECT
     USING (
       is_admin() OR (
         is_staff() AND EXISTS (
           SELECT 1 FROM public.project_assignments pa
           JOIN public.projects p ON pa.project_id = p.id
           WHERE pa.user_id = auth.uid() AND p.company_id = contacts.company_id
         )
       )
     );
     ```

### 2.2 Security Definer Path Hardening
* **Issue**: Security Definer functions run with the privileges of the creator and are susceptible to search-path injection if `search_path` is not explicitly set.
* **Remediation**:
  1. Apply `SET search_path = pg_catalog, public` to every Security Definer trigger and helper function.
  2. Add `REVOKE EXECUTE ON FUNCTION` for internal triggers from public/authenticated roles, granting them only to the service role or trigger system.

---

## 3. Product & UI Polish

### 3.1 Skeleton & Spinner Loading Pass
* **Issue**: Detail, edit, and workspace pages across the CRM currently rely on raw `"Loading..."` text, creating sudden layout shifts.
* **Remediation**:
  1. Expand the use of `components/crm/Skeleton.jsx` and `components/crm/Spinner.jsx` to all client/employee/admin workspace detail/edit views.
  2. Wrap server-action submissions (like "Save Draft", "Submit Brief", "Assign Task") with inline loading states on buttons (disabling the button and displaying a spinner).

### 3.2 Companies/Contacts Notes Panel Integration
* **Issue**: The `NotesPanel` component expects a `projectId` prop. However, the companies and contacts detail pages currently pass `companyId`/`contactId`, resulting in a quiet mismatch where notes fail to load.
* **Remediation**:
  1. Refactor `components/crm/NotesPanel.jsx` to support polymorphic bindings (`entity_type` and `entity_id`).
  2. Alternatively, create a dedicated company-note resolver table (`company_notes`) to store general client-relationship interactions separate from project deliverables.

---

## 4. Operational Completion Checklist

- [ ] **Database Migration Reconciliation**: Create local migration file `0015_reconcile_coalesce.sql` matching the live `fix_handle_new_user_coalesce` hotfix to ensure local migration parity.
- [ ] **Task Priority/Visibility Parameters**: Expose `priority` and `client_visible` to the `create_project_task`/`update_project_task` RPC signatures.
- [ ] **Fix `updateProjectTask` Revalidation**: Correct the ID passed to `revalidateAllProjectPaths` in the `updateProjectTask` server action before exposing any task editing UI to PMs.
- [ ] **E2E Click-through Verification**: Establish and run Playwright-driven End-to-End tests simulating Client, Employee, and Admin personas completing a real workspace lifecycle from signup/invite, brief submission, assignment, task update, to completion.
