-- 0041_client_read_scope_hardening.sql
--
-- Three client-facing SELECT surfaces were wider than the UI or the product
-- ever needed. All three were found by the 2026-09-02 CRM data-map audit and
-- re-verified against the production catalog (read-only, pg_policies) on
-- 2026-09-03 before this file was written:
--
--   * project_approvals  -> "Project participants can view shared approvals"
--                           USING private.can_access_project(project_id)
--                           Live: identical. No visibility column on the
--                           table; every approval row, including the
--                           reviewer's free-text `note`, is readable by any
--                           client on the project even when the deliverable
--                           it decides on is `internal`.
--   * notifications_outbox -> "Project participants can view own notifications"
--                           USING user_id = auth.uid()
--                           Live: identical. A user can read their own
--                           `email`-channel queue rows (payload carries a
--                           200-char message excerpt, 0032:205; for the
--                           admin, lead PII from create_lead_from_contact,
--                           0029:231-237). The one UI reader,
--                           lib/crm/projects.js listNotifications(), does
--                           not filter channel, so NotificationsPanel showed
--                           every event twice (in_app + email).
--   * deals              -> "Company members can view deals" (0001:189) and
--                           "Company members can submit a project brief"
--                           (0003:37). Live: both present. Clients could
--                           read `value`/`description` for their company's
--                           deals and insert deals directly. No page outside
--                           app/admin/** reads or writes deals; the client
--                           intake path is create_project() (0031), which is
--                           SECURITY DEFINER and validates source_deal_id
--                           itself. public.can_access_deal() is also
--                           SECURITY DEFINER, so the profiles / notes
--                           policies that call it are unaffected.
--
-- Two claims from the same audit were checked and found already resolved, so
-- nothing here touches them: private.shares_project_with(uuid) is granted to
-- authenticated (0040), and every project_* table already has ENABLE + FORCE
-- ROW LEVEL SECURITY in 0009:242-255 / 0010:114-121 (live relrowsecurity =
-- relforcerowsecurity = true on all eleven).
--
-- Policy renames follow 0027's convention: when the predicate's meaning
-- changes, the policy gets a new name rather than being recreated under the
-- old one.

-- ---------- 1. project_approvals: follow the deliverable's visibility -------
--
-- deliverable_id is nullable (0010:51, `on delete set null`) and
-- create_project_approval() accepts NULL (0010:358, 382): a project-level
-- approval not tied to a file is a first-class state, and one that WAS tied
-- to a since-deleted deliverable becomes NULL. Both stay visible to every
-- participant, exactly as today. Only approvals on an `internal` deliverable
-- are now staff-only, matching the deliverable's own SELECT policies
-- (0010:144-160).
drop policy if exists "Project participants can view shared approvals"
  on public.project_approvals;

create policy "Project participants can view visible approvals"
on public.project_approvals
for select
to authenticated
using (private.can_access_project(project_id)
  and (
    private.can_view_internal(project_id)
    or deliverable_id is null
    or exists (
      select 1
      from public.project_deliverables as deliverable
      where deliverable.id = project_approvals.deliverable_id
        and deliverable.visibility = 'shared'
    )
  )
);

-- ---------- 2. notifications_outbox: in_app rows only -----------------------
--
-- Matches mark_notifications_read() (0027:56-60), which already restricts
-- itself to channel = 'in_app', and is covered by
-- notifications_outbox_recipient_read_idx (user_id, channel, read_at,
-- created_at desc). The email worker runs as service_role through
-- claim_notification_email_batch() and is RLS-exempt, so delivery is
-- unaffected. Historical in_app rows stay readable by their owners
-- (docs/CRM-OPERATIONS.md: "read-state data").
drop policy if exists "Project participants can view own notifications"
  on public.notifications_outbox;

create policy "Recipients can view own in-app notifications"
on public.notifications_outbox
for select
to authenticated
using (
  user_id = (select auth.uid())
  and channel = 'in_app'
);

-- ---------- 3. deals: no client read or insert ------------------------------
--
-- Remaining deals policies after this: admin all (0005:70-75), PM owner
-- SELECT (0005:77). Client project intake is create_project() only.
drop policy if exists "Company members can view deals" on public.deals;
drop policy if exists "Company members can submit a project brief" on public.deals;

comment on policy "Project participants can view visible approvals" on public.project_approvals is
  'Clients see project-level approvals and approvals on shared deliverables; approvals on internal deliverables are staff-only. Replaced "Project participants can view shared approvals" in 0041.';

comment on policy "Recipients can view own in-app notifications" on public.notifications_outbox is
  'Only in_app rows are a user-facing feed; email/realtime rows are queue state for the service-role worker. Replaced "Project participants can view own notifications" in 0041.';
