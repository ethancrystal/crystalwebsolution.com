# CRM: 3-Role Model + Project Type Taxonomy

**Objective:** Replace the current 2-tier `admin`/`staff` split with 3 distinct
roles (Client, Project Manager, Administrator), scope Project Manager
visibility to only their assigned projects (not blanket access like `staff`
has today), and add a 7-value project-type taxonomy (Logo, Web, SEO, SMM, AI
Automation, Google Ads, Branding) to deals/projects.

**Revision note:** this plan was adversarially reviewed against the live
database and codebase before being finalized. The review found 9 confirmed
issues in the first draft — several critical (a PM could have self-inserted
into `company_members` and gained blanket access to an entire client's
projects; every `DELETE` policy would have stayed PM-accessible; migrated
staff accounts would have been locked out of `/admin` because
`auth.users.raw_app_meta_data` was never synced). All 9 are fixed below;
the specific findings are folded into the relevant steps rather than listed
separately, so a cold-start reader sees the *fixed* plan, not a diff.

**Open item flagged, not blocking:** the request said "5 different type of
projects" but then listed 7 (Logo, Web, SEO, SMM, AI Automation, Google Ads,
Branding). This plan builds all 7 as explicitly listed — the "5" is treated
as a slip. If that's wrong, tell me which 5 (or 7) before Step 1 ships.

**Confirmed mid-session:** "Admin assign the Project Managers" — PM
assignment (which project a PM is attached to, and who is a member of which
client company) is admin-driven only. PMs do not self-assign, reassign, or
add themselves/others to a company. This shapes every RLS decision below:
wherever the old model let "staff" do something broad, this plan asks
"should a PM specifically be allowed to do this, or only admin?" rather than
defaulting PM to inherit everything staff had.

**Already verified working, not in scope here:** signup/login
(`app/signup/page.jsx`, `app/login/page.jsx`) — live-tested this session
against the real Supabase project (test signup created + cleaned up,
`handle_new_user` trigger confirmed, bad-credential rejection confirmed).

## Current-state findings that shape this plan

- `deals.owner_id` is the intended PM-assignment column, but the review
  found the client-facing display of it is **currently broken, not just
  unenforced**: `app/dashboard/projects/[id]/page.jsx:56-62` fetches the
  owner's `profiles` row using the *client's own* session, but `0001`'s
  profiles SELECT policy only allows `auth.uid() = id` or `is_admin()` — a
  client can never read a PM's profile row under current RLS, so
  `ownerName` is always `null` and the UI always renders "Not yet assigned"
  regardless of actual assignment. Step 1 adds the missing policy (see
  task 9 below); this is a real bug fix bundled into this plan, not a
  pre-existing feature this plan merely "enforces."
- `deals.project_status` (from migration `0003`) deliberately used
  `TEXT + CHECK` instead of a Postgres enum. We're about to feel exactly why:
  `user_role` (an enum from `0001`) is painful to extend/shrink — Postgres
  has no `DROP VALUE` for enums, only `ADD VALUE`, and (confirmed live
  against this project's Postgres 17.6) a new enum value cannot be *used* in
  the same transaction it was added in. **`project_type` will follow the
  `project_status` precedent (`TEXT + CHECK`)**, not a new enum.
- `is_staff()` currently grants **blanket** access to companies/deals/
  contacts/tasks/notes/company_members to both `admin` and `staff` alike,
  across SELECT, UPDATE, INSERT, *and* DELETE. Simply redefining
  `is_staff()` as "admin or PM" (the obvious first move) would hand a PM
  every one of those blanket grants too — including the ability to
  self-insert into `company_members` for any company (which flips
  `is_company_member()` true and, combined with the new `can_access_deal()`,
  would grant that PM full access to every deal/message/file for that
  company) and to delete any company/deal/task/note/message/file, PM-owned
  or not. Step 1 below does **not** take the shortcut of redefining
  `is_staff()` globally — each policy that currently reads `is_staff()` is
  individually re-evaluated: does a PM need this, scoped how, or is this
  admin-only.
- There is **no admin UI to create/invite staff/PM/admin accounts today** —
  `app/admin/` has companies/contacts/deals/tasks but no `users` page. Since
  `app_metadata.role` is service-role-only by design (`0001`'s
  `handle_new_user` trigger, intentionally not client-settable), this is a
  real gap that must be closed for admins to actually create and assign PM
  accounts.
- `middleware.js` gates `/admin/*` by reading `user.app_metadata.role`
  (JWT claim) and allow-listing `'admin'` / `'staff'`. This is a **second,
  independent source of truth from `profiles.role`** — migrating
  `profiles.role` alone (the obvious first move) leaves `app_metadata.role`
  stale, and since middleware reads only the JWT claim, every existing
  staff account would be locked out of `/admin` the moment `'staff'` is
  dropped from the allow-list, even though `profiles.role` correctly says
  `project_manager`. Step 1 must update `auth.users.raw_app_meta_data`
  directly, not just `profiles.role`.
- `app/dashboard/page.jsx:57,78` branches on
  `role === 'admin' || role === 'staff'` to decide admin-dashboard vs
  client-dashboard rendering. After Step 1's data migration, a PM's role is
  `project_manager`, matching neither branch — a PM landing here would fall
  into the **client** branch and be shown the client dashboard (calling
  `loadClientProjects(profile.company_id)`, which is `null` for a PM/staff
  account, since only clients have `company_id` set).

---

## Dependency graph (corrected — see Step 3/4/5 notes for why)

```
Step 1 (schema + RLS + app_metadata sync)
  └─▶ Step 3 (middleware + route guards + dashboard role-branch fix)
        ├─▶ Step 2+4 combined (admin user-mgmt UI + project_type UI —
        │     BOTH touch app/admin/deals/[id]/edit/page.jsx; run as one
        │     coordinated PR/session, not two independent parallel agents,
        │     or the second one to land will silently clobber the first's
        │     edits to that file)
        └─▶ Step 5 (PM-scoped dashboard views — needs Step 3's route-policy
              decisions, e.g. whether PM can create companies, as an input;
              this is a real sequential dependency, not parallel work)
              └─▶ Step 6 (end-to-end role verification) — depends on ALL of
                    Step 1, 3, 2+4, 5
```

Step 1 must land and be verified before anything else starts — every other
step reads its RLS/role decisions. Step 3 must land next because it both
fixes the dashboard role-branch bug (a prerequisite for any PM ever seeing
a working UI at all) and makes the route-policy decisions (e.g. "can PM
create companies directly?") that Step 5 depends on as an input, and that
Step 2's `/admin/users` guard ownership question depends on (Step 3 owns
that guard at the middleware level; Step 2's page-level check is
defense-in-depth, not the primary gate — no more circular "whichever guards
itself first" ambiguity).

---

## Step 1 — Schema migration: PM role + project_type taxonomy

**Model tier:** strongest available (this step gets the RLS security model
right or everything downstream inherits the mistake — the adversarial
review already caught 6 of this step's own issues once; treat that as the
bar for how carefully this needs to be executed, not as "already solved").

**Context brief:** Migrations `0001`–`0003` are already applied to the live
Supabase project (`wmnjosiikehsuaqucvja.supabase.co`, Postgres 17.6) and
verified working (signup/login tested live this session). This step is
**two separate migrations**, applied via `mcp__supabase__apply_migration`
the same way `0002`/`0003` were — additive-only, never editing `0001`–`0003`
in place.

**Why two migrations, not one (confirmed, not hypothetical):** a live test
against this exact project confirmed `ALTER TYPE ... ADD VALUE 'x'` followed
by any use of `'x'` (including inside a `CREATE FUNCTION` body that
references it) in the same multi-statement `apply_migration` call fails
with `55P04: unsafe use of new value ... must be committed before they can
be used`. This is not a "verify and split if it errors" contingency — it
**will** error. Task 1 is its own migration file; everything else is a
second file.

### 0004_project_manager_role.sql (migration A — enum value only)

1. `ALTER TYPE public.user_role ADD VALUE 'project_manager';`

That's the entire file. Apply it, confirm via
`mcp__supabase__list_migrations`, then move to migration B.

### 0005_pm_scoping_and_project_type.sql (migration B — everything else)

2. Migrate role data:
   ```sql
   UPDATE public.profiles SET role = 'project_manager' WHERE role = 'staff';
   ```
3. **Sync `app_metadata.role` for the same accounts** — `profiles.role` and
   `auth.users.raw_app_meta_data.role` are independent sources of truth
   (`is_admin()`/`is_staff()` check both; `middleware.js` checks only the
   JWT claim). Skipping this locks out every migrated account the moment
   Step 3 removes `'staff'` from middleware's allow-list:
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'project_manager')
   WHERE id IN (SELECT id FROM public.profiles WHERE role = 'project_manager');
   ```
   **Operational note for whoever executes this:** this updates the stored
   claim, but any *already-issued* access token for an affected user still
   carries the old claim until it refreshes (Supabase access tokens are
   short-lived JWTs, typically ~1hr, refreshed automatically on the next
   API call after expiry — so this self-heals within the hour without
   manual intervention, but if immediate effect is needed, affected users
   can be force-logged-out via the admin API to require a fresh login).
4. Add `public.is_pm()` helper, mirroring `is_admin()`'s shape, with
   `SET search_path = public` (also add this to the *existing* `is_admin`/
   `is_staff`/`is_company_member` while touching this area — the live
   security advisor already flags all of them as `function_search_path_mutable`
   WARN; this closes an existing advisory finding, not scope creep, since
   this migration already has to `CREATE OR REPLACE` `is_staff()` anyway):
   ```sql
   CREATE OR REPLACE FUNCTION public.is_pm() RETURNS BOOLEAN AS $$
     SELECT (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'project_manager'
            OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'project_manager'
   $$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
   ```
5. Redefine `is_staff()` as "admin or PM" **for read/update purposes only**
   — it keeps its current callers on `companies`/`contacts` SELECT/UPDATE
   and `tasks`/`notes` SELECT unchanged in *meaning* (any staff-tier person
   can see/update company and contact records; this plan doesn't tighten
   that, only deal/message/file/task-assignment scoping, per the user's
   stated requirement being specifically about per-project thread scoping):
   ```sql
   CREATE OR REPLACE FUNCTION public.is_staff() RETURNS BOOLEAN AS $$
     SELECT public.is_admin() OR public.is_pm()
   $$ LANGUAGE SQL SECURITY DEFINER SET search_path = public;
   ```
6. **`company_members` — restrict INSERT/UPDATE to admin-only.** This is
   the critical fix: under a naive `is_staff()` redefinition, a PM could
   `INSERT INTO company_members (company_id, user_id) VALUES (<any company>,
   auth.uid())`, which flips `is_company_member()` true for that PM against
   an arbitrary company, which (combined with task 8's `can_access_deal()`)
   would grant that PM full access to every deal/message/file for that
   company — completely bypassing the per-assignment model. Company
   membership is exactly the kind of thing "admin assigns" (confirmed
   mid-session) should mean:
   ```sql
   DROP POLICY "Staff can manage members" ON public.company_members;
   CREATE POLICY "Admin can manage members" ON public.company_members
     FOR INSERT WITH CHECK (public.is_admin());
   DROP POLICY "Staff can update members" ON public.company_members;
   CREATE POLICY "Admin can update members" ON public.company_members
     FOR UPDATE USING (public.is_admin());
   ```
7. **`deals` INSERT — restrict to admin-only** (drop PM from deal creation
   entirely, rather than trying to constrain `owner_id` on creation). A PM
   manages assigned work; under the confirmed "admin assigns" model, a PM
   has no legitimate reason to originate a new deal for an arbitrary
   company and self-assign it. Clients retain their own deal-creation path
   from `0003`'s `"Company members can submit a project brief"` policy,
   unaffected by this change:
   ```sql
   DROP POLICY "Staff can create deals" ON public.deals;
   CREATE POLICY "Admin can create deals" ON public.deals
     FOR INSERT WITH CHECK (public.is_admin());
   ```
8. Replace the blanket "Staff can view all deals" policy with tiered
   access, and split UPDATE so only admin can reassign `owner_id`:
   ```sql
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
   ```
   (`"Company members can view deals"` from `0001` stays as-is.) The
   `WITH CHECK` on the PM policy stops a PM from reassigning `owner_id` to
   someone else (the row must still satisfy `owner_id = auth.uid()`
   post-update) without needing a separate trigger — this was checked
   against the review and confirmed sufficient; a `BEFORE UPDATE`
   column-level trigger (mirroring `0002`'s `prevent_unauthorized_profile_changes`)
   would be redundant here, not a missing piece.
9. **Add the missing profiles-visibility policy** that fixes the "PM name
   always shows as Not yet assigned" bug identified above — let anyone who
   can access a deal see the profile of that deal's assigned owner (used by
   both the client dashboard and, later, Step 2's admin/PM views):
   ```sql
   CREATE POLICY "Deal participants can view assigned owner profile" ON public.profiles
     FOR SELECT USING (
       EXISTS (
         SELECT 1 FROM public.deals d
         WHERE d.owner_id = profiles.id AND public.can_access_deal(d.id)
       )
     );
   ```
   This must be created **after** task 10 defines `can_access_deal()` in
   this same migration — order matters within the file.
10. Update `public.can_access_deal()` (from `0003`) so deal-scoped access
    (used by `project_messages`, `project_files`, and the Storage bucket
    policies) reflects PM-per-assignment instead of blanket staff access:
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
    This delivers the "exactly 3 participants per project" requirement:
    admin (always), the one PM assigned via `owner_id`, and the client's
    company members — nobody else. `project_messages`/`project_files`/the
    Storage bucket policies already call this function, so they inherit the
    fix automatically.
11. **Extend the same per-assignment scoping to `tasks` and `notes`** —
    both currently have a blanket `"Staff can view all X"` SELECT policy
    that would otherwise let a PM read every task and every note across
    every client, contradicting the "exactly 3 participants" guarantee
    task 10 establishes for messages/files. Tasks already have an
    `assigned_to` column (the exact analog of `deals.owner_id`) and an
    existing `"Assigned user can view task"` policy that already scopes
    correctly per-user regardless of role — only the blanket policy needs
    narrowing:
    ```sql
    DROP POLICY "Staff can view all tasks" ON public.tasks;
    CREATE POLICY "Admin can view all tasks" ON public.tasks
      FOR SELECT USING (public.is_admin());
    -- "Assigned user can view task" (USING auth.uid() = assigned_to) from
    -- 0001 is unchanged and already gives a PM their own assigned tasks.

    DROP POLICY "Staff can create tasks" ON public.tasks;
    CREATE POLICY "Admin can create tasks" ON public.tasks
      FOR INSERT WITH CHECK (public.is_admin());
    -- Mirrors the deals-creation decision in task 7: task assignment is
    -- admin-driven, not PM-self-service, consistent with "Admin assign".

    DROP POLICY "Assigned user and staff can update" ON public.tasks;
    CREATE POLICY "Admin can update any task" ON public.tasks
      FOR UPDATE USING (public.is_admin());
    CREATE POLICY "Assigned user can update own task" ON public.tasks
      FOR UPDATE USING (auth.uid() = assigned_to)
      WITH CHECK (auth.uid() = assigned_to);
    ```
    Notes are looser-structured (optional `deal_id`, `contact_id`, or
    neither), so scope by `deal_id` where present:
    ```sql
    DROP POLICY "Staff can view all notes" ON public.notes;
    CREATE POLICY "Admin can view all notes" ON public.notes
      FOR SELECT USING (public.is_admin());
    CREATE POLICY "PM can view notes on assigned deals" ON public.notes
      FOR SELECT USING (public.is_pm() AND deal_id IS NOT NULL AND public.can_access_deal(deal_id));
    -- "Company members can view notes" from 0001 (is_company_member(company_id))
    -- is unchanged and continues to cover the client side.
    ```
    **Known pre-existing gap, explicitly out of scope for this plan:**
    `"Any authenticated user can create notes"` (`0001:218-219`, `CHECK
    (auth.role() = 'authenticated')`) has no company/deal scoping at all —
    any logged-in user of any role, including `client`, can already insert
    a note against an arbitrary `deal_id`/`company_id` today. This predates
    the PM role entirely and is not made worse by this plan; flagging it
    here so it isn't mistaken for something this plan was supposed to fix,
    but it needs its own follow-up plan, not folded into this one.
12. **Restrict every `DELETE` policy from `0002`/`0003` to admin-only** — all
    six of `0002`'s DELETE policies (companies, contacts, deals, tasks,
    notes, company_members) and all three of `0003`'s (project_messages,
    project_files, storage.objects) currently use `is_staff()`, which after
    task 5 includes PM. RLS evaluates DELETE policies independently of
    SELECT/UPDATE — none of the scoping added above narrows delete access
    on its own. No PM should be able to delete anything under the confirmed
    "admin assigns/administers" model:
    ```sql
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
    ```
    Note `app/admin/deals/[id]/page.jsx` already ships a delete button in
    the UI today — Step 2/3 need to hide/disable it for PM sessions (the
    RLS change makes it fail safely either way, but a visible button that
    silently no-ops is a bad UX and should be gated client-side too).
13. Add `deals.project_type TEXT` with a `CHECK` constraint (mirrors
    `project_status`'s pattern from `0003`):
    ```sql
    ALTER TABLE public.deals ADD COLUMN project_type TEXT;
    ALTER TABLE public.deals ADD CONSTRAINT deals_project_type_check
      CHECK (project_type IN ('logo', 'web', 'seo', 'smm', 'ai_automation', 'google_ads', 'branding'));
    CREATE INDEX idx_deals_project_type ON public.deals(project_type);
    ```
    Nullable (no `NOT NULL`/`DEFAULT`) — existing rows have no meaningful
    type to backfill; new rows set it explicitly from the UI (Step 4). The
    canonical value set for reference (also used verbatim in Step 4's
    shared label map): `logo`, `web`, `seo`, `smm`, `ai_automation`,
    `google_ads`, `branding`.
14. Re-read `0002`'s `prevent_unauthorized_profile_changes` trigger body
    from the live database before assuming it needs no change. It should
    not — it only blocks non-admins from changing `role`/`company_id`,
    regardless of which specific role — and separately, the bulk `UPDATE`
    in task 2 above runs in a migration/service context where
    `auth.uid()`/`auth.jwt()` are `NULL`, so `is_admin()` evaluates `NULL`
    and the trigger's `IF` condition never fires (`TRUE AND NOT NULL` is
    `NULL`, not `TRUE`) — this was confirmed during the plan's review, not
    just assumed, but re-verify against the live function body at execution
    time regardless, since the live schema is the source of truth.

**Verification:**
- `mcp__supabase__list_migrations` shows both `0004_project_manager_role`
  and `0005_pm_scoping_and_project_type` applied, in that order.
- `mcp__supabase__get_advisors({type: "security"})` — confirm no *new*
  WARN/ERROR beyond what existed pre-migration (the `search_path` fixes in
  task 4 should *reduce* the count).
- `execute_sql`: `SELECT role, count(*) FROM public.profiles GROUP BY role;`
  — confirm zero rows remain with `role = 'staff'`.
- `execute_sql`: `SELECT id, raw_app_meta_data->>'role' FROM auth.users
  WHERE id IN (SELECT id FROM public.profiles WHERE role = 'project_manager');`
  — confirm every row shows `project_manager`, not `staff` or null.
- `execute_sql`: manually exercise `can_access_deal()`, and attempt (as a
  simulated PM session, e.g. via `SET request.jwt.claims` in a test
  transaction, or more simply by testing through the live API with a real
  PM test account) an `INSERT INTO company_members` for a company the PM
  isn't assigned to, and a `DELETE` on any table — both must fail.

**Exit criteria:** both migrations applied in order, advisor check clean,
`staff`-role count is 0, `app_metadata.role` synced for all migrated
accounts, a PM test account manually confirmed unable to self-insert into
`company_members`, unable to delete anything, unable to reassign
`owner_id` away from themselves, and able to see the assigned owner's name
on a deal they have access to (fixes the "Not yet assigned" bug).

**Rollback:** enum `ADD VALUE` cannot be rolled back by a `DROP`, but is
inert if unused — if this step needs reverting, a follow-up migration can
`UPDATE profiles SET role = 'staff' WHERE role = 'project_manager'`, revert
`auth.users.raw_app_meta_data` the same way, and restore the previous
policy/function bodies from `0001`/`0003`. Nothing here is destructive (no
`DROP COLUMN`/`DROP TABLE`), so rollback is always a forward-fix migration,
consistent with how `0002`/`0003` were designed.

---

## Step 2+4 — Admin user-management UI + project_type UI (combined)

**Model tier:** default.

**Why combined:** both steps need to edit
`app/admin/deals/[id]/edit/page.jsx` (Step 2 adds the PM-assignment
dropdown, Step 4 adds the project-type selector) — running them as
independent parallel agents risks one silently overwriting the other's
edit to that file. Execute as one PR/session covering both task lists
below, in the order given (user-management first, since project_type is
cosmetic-ish by comparison and doesn't block anything else).

**Context brief:** No `app/admin/users*` route exists today, and no UI
exists to set `deals.project_type`. `lib/supabase/admin.js` already exposes
a service-role client (check its current callers before adding a new one,
to match the established calling convention). Step 1 has already applied
and been verified — confirm this (`mcp__supabase__list_migrations`) before
starting; every task below assumes the new columns/policies exist.

**Tasks (user management):**
1. New `app/admin/users/page.jsx` (list all profiles + role, admin-only,
   follow the visual/structural pattern of `app/admin/contacts/page.jsx`).
2. New `app/admin/users/invite/page.jsx` + a server action (in a new
   `app/admin/users/actions.js`, mirroring `app/auth/actions.js`'s
   `'use server'` pattern) that uses the service-role admin client to
   `supabase.auth.admin.createUser()` (or `.inviteUserByEmail()` — decide
   based on whether Supabase email/SMTP is configured for this project;
   check the project's auth settings, not an assumption) with
   `app_metadata: { role: 'project_manager' | 'admin' }`.
3. **PM-to-project assignment**: add an "Assign Project Manager" control to
   `app/admin/deals/[id]/edit/page.jsx` — a dropdown of all
   `project_manager`-role profiles, writing to `deals.owner_id`. This goes
   through the normal authenticated client, satisfying Step 1's
   `"Admin can update any deal"` policy directly (no service-role bypass
   needed — an admin session already has the RLS grant).
4. A role-change action for existing users (admin reassigns someone from PM
   to admin or vice versa): first test whether an admin acting through the
   normal authenticated client can already do this against `0002`'s
   `prevent_unauthorized_profile_changes` trigger (the trigger checks
   `is_admin()` of the *acting* session, which should permit it) before
   building a service-role fallback path that may turn out to be
   unnecessary.
5. Hide/disable the existing delete button on `app/admin/deals/[id]/page.jsx`
   for non-admin sessions (Step 1 task 12 makes it fail at the RLS layer
   either way, but a visibly-clickable button that silently no-ops is bad
   UX for a PM user).
6. Page-level admin-only check on `app/admin/users/*` as defense-in-depth
   (Step 3 owns the primary route-level guard at the middleware layer —
   this is a second check, not competing ownership of "the" guard).

**Tasks (project_type UI):**
7. Define the canonical label map once in `lib/projectTypes.js`:
   ```js
   export const PROJECT_TYPES = {
     logo: 'Logo', web: 'Web', seo: 'SEO', smm: 'SMM',
     ai_automation: 'AI Automation', google_ads: 'Google Ads', branding: 'Branding',
   };
   ```
   These keys must match Step 1 task 13's `CHECK` constraint values
   exactly. Every file below imports from here rather than hardcoding the
   list again.
8. Add a `project_type` `<select>` to `app/admin/deals/new/page.jsx` and
   `app/admin/deals/[id]/edit/page.jsx` (already being edited per task 3
   above — same file, same PR).
9. Add the same selector to the client brief-submission flow, at
   `components/crm/BriefSubmissionForm.jsx` (not a page under `app/` — this
   is a shared component; locate its current callers with a search before
   assuming where it's rendered from).
10. Add a small colored badge/tag showing `project_type` on
    `app/admin/deals/page.jsx`, `app/admin/deals/pipeline/page.jsx`, and
    `app/dashboard/projects/[id]/page.jsx`, using the same label map.

**Verification:**
- Create a PM account through the new UI, assign them to a test deal via
  the new dropdown, confirm `deals.owner_id` updates and
  `profiles.role`/`app_metadata.role` both set correctly.
- Confirm a PM session cannot reach `/admin/users`, cannot see/use the
  deal delete button, and cannot reassign `owner_id` on any deal.
- Create a deal of each of the 7 `project_type` values through the UI,
  confirm the value round-trips and displays correctly everywhere listed
  in task 10.

**Exit criteria:** an admin can create a PM account and assign them to a
project end-to-end without touching SQL or the Supabase dashboard directly;
every place a deal/project is created or listed shows/sets `project_type`
using the shared label map, no hardcoded duplicate list.

**Rollback:** new routes/files + Step 1's already-applied schema — revert
the PR; no further schema rollback needed here (Step 1 owns that).

---

## Step 3 — Middleware, route guards, and dashboard role-branch fix

**Model tier:** default.

**Context brief:** `middleware.js:50` hardcodes
`userRole !== 'admin' && userRole !== 'staff'` to gate `/admin/*`.
Separately, `app/dashboard/page.jsx:57,78` hardcodes
`role === 'admin' || role === 'staff'` to decide which dashboard variant to
render — **this second one breaks for a PM after Step 1's migration** (a PM
falls into neither branch and gets shown the client dashboard, calling
`loadClientProjects(profile.company_id)` which is `null` for a PM). Read
both files fresh at execution time, not from this plan's summary.

**Tasks:**
1. Update `middleware.js`'s `/admin` gate to allow `'admin'` and
   `'project_manager'` (drop `'staff'` entirely — no account should carry
   that role after Step 1's data migration).
2. **Fix `app/dashboard/page.jsx`'s role branch** — a PM should never land
   on the client dashboard at all; if a PM somehow reaches `/dashboard`
   (e.g. stale bookmark), redirect to `/admin` instead of falling through
   to client-rendering logic that assumes `company_id` is set.
3. Add an explicit admin-only route guard for `/admin/users/*` in
   middleware (the primary gate; Step 2's page-level check is
   defense-in-depth, not a competing implementation).
4. **Decide, explicitly, whether PM can create companies/contacts/deals
   directly** — Step 1 already made deal/task creation admin-only (tasks 7
   and 11), so the answer for deals/tasks is already "no, admin only." This
   task just needs to confirm the same applies to
   `/admin/companies/new` and `/admin/contacts/new` (Step 1 did *not*
   touch those INSERT policies, so they remain `is_staff()` — i.e. PM
   *can* currently create companies/contacts under Step 1's design; decide
   here whether that's intended or whether those two INSERT policies also
   need the admin-only treatment applied in Step 1, and if so, note that
   as a small follow-up migration rather than silently deciding in the UI
   layer while RLS still allows it). Document the decision inline as a
   comment, matching this repo's existing convention (see the extensive
   rationale comments throughout `0002`/`0003`). **This decision is a
   required input to Step 5** — do not defer it further.

**Verification:** log in as a PM test account, confirm `/admin/deals`
(their assigned subset only, via RLS) loads, confirm `/admin/users`
redirects away, confirm hitting `/dashboard` directly redirects to
`/admin` rather than rendering a broken client view.

**Exit criteria:** middleware correctly distinguishes all 3 roles; no route
accessible to a role that shouldn't reach it; the company/contact-creation
question from task 4 has an explicit, documented answer.

**Rollback:** revert the middleware/dashboard diff; no schema/data impact.

---

## Step 5 — PM-scoped dashboard views

**Model tier:** default.

**Context brief:** `app/admin/page.jsx` currently shows global counts
(`companies`, `contacts`, `deals`, `tasks`) with no role awareness — since
Step 1's RLS already scopes what a PM's queries *return*, a PM hitting this
page today would silently see "their" counts mislabeled as if they were
global stats. This step is copy/framing, not new access control (Step 1
already did the actual security work). **Depends on Step 3 task 4's
decision** about company/contact creation, to know which quick-actions to
show a PM.

**Tasks:**
1. Read the logged-in user's role. No existing admin page currently reads
   role at all (there is no pre-existing pattern to copy — pick a method
   consistent with what middleware already uses, i.e.
   `user.app_metadata.role` from `supabase.auth.getUser()`, rather than a
   second `profiles` query, to avoid two divergent ways of answering "what
   role is this session" in the same app).
2. For a PM session, relabel the dashboard ("My Assigned Projects" instead
   of "Deals", etc.) and hide whichever quick-actions Step 3 task 4 decided
   PMs shouldn't have (at minimum "+ New User", which is always admin-only
   regardless of Step 3's company/contact decision).
3. Apply the same role-aware framing to `app/admin/deals/pipeline/page.jsx`
   if it also currently assumes a global, admin-only view.

**Verification:** log in as PM and admin test accounts side by side,
confirm the dashboard framing and visible actions differ appropriately per
Step 3's documented decision, confirm no PM-visible page ever displays
another PM's data (already guaranteed by Step 1's RLS — this step is a UX
check, not a security check).

**Exit criteria:** dashboard framing accurately describes what each role is
actually looking at, and matches Step 3's task 4 decision exactly (no
quick-action shown that RLS would actually reject).

**Rollback:** UI-only, revert the PR.

---

## Step 6 — End-to-end role verification

**Model tier:** default, but budget real testing time — this is the step
that actually proves the security model works, not just that it compiles.

**Context brief:** This session already established the pattern for this
kind of check: live-created a throwaway signup, verified the
`handle_new_user` trigger and RLS defaults, then cleaned up via
`execute_sql` `DELETE FROM auth.users`. Repeat that pattern here across all
3 roles and the full project-lifecycle thread, using the browser preview
tools (`preview_start`/`navigate`/`computer`/`read_page`) the same way, not
just reading code.

**Tasks:**
1. Create 4 throwaway test accounts: 1 admin, 2 PMs (A and B — enough to
   prove PM-to-PM isolation), 1 client-company-member.
2. As the admin test account, create one deal/project, set a
   `project_type`, and assign it to PM-A via the assignment UI. Then
   verify each of the following individually (not just "the page loaded" —
   confirm at the data/API level too):
   - PM-A sees it in their deal list, can message/upload files, can see
     their own name correctly (not "Not yet assigned").
   - PM-B does **not** see it in their deal list; a direct API/URL access
     attempt for that deal's id is denied by RLS.
   - PM-A **cannot** change `owner_id` on this deal (to themselves-noop,
     to PM-B, or to anything) — attempt it directly via the API, not just
     absence of a UI control.
   - PM-A **cannot** `DELETE` this deal, its messages, or its files.
   - PM-A **cannot** `INSERT INTO company_members` for the client's company.
   - The client company member sees it, can message/upload files, and sees
     PM-A's name correctly on the assigned-owner field.
   - Admin sees it and can do everything regardless.
3. Confirm `project_messages`/`project_files` end up scoped to exactly the
   3 intended parties (admin, PM-A, client) — post one message as each
   allowed party, confirm PM-B's `SELECT` returns zero rows for that
   thread.
4. Confirm `app_metadata.role` is correct for both PM test accounts by
   checking `auth.users.raw_app_meta_data` directly, not just
   `profiles.role`.
5. Clean up all test accounts/companies/deals afterward, same as this
   session already did for the earlier signup test.

**Verification:** documented pass/fail per bullet in task 2-4, not just "it
loaded" — this step's entire job is catching an RLS policy that looks
right in Step 1's SQL but doesn't actually behave right.

**Exit criteria:** every bullet in task 2-4 passes; test data cleaned up;
no orphaned test accounts left in the live Supabase project.

**Rollback:** N/A — verification-only step, nothing to roll back.

---

## Notes for whoever executes this

- Step 1 is one required sequential unit (its two migrations must land in
  order and be verified before Step 3 starts); Step 3 must land before
  Step 2+4 and Step 5 start (both depend on its decisions/fixes); Step 2+4
  and Step 5 can then run in parallel (disjoint files: `app/admin/users/*`,
  `app/admin/deals/[id]/edit/page.jsx`, `lib/projectTypes.js` vs.
  `app/admin/page.jsx`, `app/admin/deals/pipeline/page.jsx`). Step 6 waits
  for everything.
- Every SQL task in Step 1 should be applied via
  `mcp__supabase__apply_migration` the same way `0002`/`0003` were this
  session — not hand-run through the dashboard — so `list_migrations` stays
  the single source of truth for what's actually deployed.
- Re-read the *current* deployed function/policy bodies at execution time
  rather than trusting this plan's inline SQL snippets verbatim — they
  illustrate the intended change, but the live schema is the source of
  truth and may have drifted by the time this plan is executed.
