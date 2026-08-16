-- CRM security and notification hardening.
-- Apply this migration only after reviewing the live Payments foreign-table
-- dependency and verifying the exact live migration drift separately.

-- Clients must not be able to select staff-only project tasks through the
-- public API. Staff/admin access is preserved through private.can_view_internal.
drop policy if exists "Project participants can view shared tasks"
  on public.project_tasks;

create policy "Project participants can view visible tasks"
on public.project_tasks
for select
to authenticated
using (
  private.can_access_project(project_id)
  and (
    client_visible = true
    or private.can_view_internal(project_id)
  )
);

-- In-app notification read state is distinct from email delivery state.
alter table public.notifications_outbox
  add column if not exists read_at timestamptz;

create index if not exists notifications_outbox_recipient_read_idx
  on public.notifications_outbox (user_id, channel, read_at, created_at desc);

create index if not exists notifications_outbox_delivery_idx
  on public.notifications_outbox (status, channel, available_at, created_at);

create or replace function public.mark_notifications_read(p_notification_ids uuid[])
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_marked integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_notification_ids is null
     or cardinality(p_notification_ids) = 0
     or cardinality(p_notification_ids) <> (
       select count(distinct notification_row.notification_id)
       from pg_catalog.unnest(p_notification_ids) as notification_row(notification_id)
     ) then
    raise exception 'Notification ids must be a non-empty unique list.'
      using errcode = '22023';
  end if;

  update public.notifications_outbox
  set read_at = coalesce(read_at, now())
  where id = any (p_notification_ids)
    and user_id = v_user_id
    and channel = 'in_app';

  get diagnostics v_marked = row_count;
  return v_marked;
end;
$$;

revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- These helpers are used by RLS and trusted RPCs; they should not be callable
-- as arbitrary API endpoints. These functions are created by earlier CRM
-- migrations, so explicit signatures make the grant contract auditable.
revoke all on function private.project_notification_recipients(uuid, uuid, text) from public;
revoke all on function private.shares_project_with(uuid) from public;
revoke all on function public.pinned_admin_email() from public;
revoke all on function public.rls_auto_enable() from public;

-- The live project contains a Stripe-backed foreign table that is not part of
-- the repository schema. Remove direct API-role access if it exists, while
-- leaving the object itself intact until the billing dependency is reviewed.
do $$
begin
  if to_regclass('public."Payments"') is not null then
    execute 'revoke all privileges on table public."Payments" from public';
  end if;
end;
$$;

-- Attachments are read by project and message in the shared workspace.
create index if not exists project_attachments_project_message_idx
  on public.project_attachments (project_id, message_id, created_at);

create index if not exists project_tasks_project_visibility_idx
  on public.project_tasks (project_id, client_visible, created_at);
