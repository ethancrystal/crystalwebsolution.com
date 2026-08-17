-- 0034_notification_attachment_cleanup_rpc.sql
-- Restore the trusted attachment-cleanup RPC expected by the notification worker.
-- This migration is additive: it does not touch notification rows, lease functions,
-- queue statuses, ready attachments, or message-linked attachments.

create or replace function public.cleanup_stale_project_attachments(
  p_before timestamptz default now() - interval '24 hours'
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private, storage
as $function$
declare
  v_deleted integer := 0;
begin
  p_before := coalesce(p_before, pg_catalog.now() - interval '24 hours');

  with stale as materialized (
    select attachment.id, attachment.storage_path
    from public.project_attachments as attachment
    where attachment.status = 'pending'
      and attachment.message_id is null
      and attachment.created_at < p_before
    for update skip locked
  ), removed_objects as (
    delete from storage.objects as object
    using stale
    where object.bucket_id = 'project-files'
      and object.name = stale.storage_path
    returning stale.id
  ), removed_rows as (
    delete from public.project_attachments as attachment
    using stale
    where attachment.id = stale.id
      and attachment.status = 'pending'
      and attachment.message_id is null
    returning attachment.id
  ), counts as (
    select
      (select pg_catalog.count(*) from removed_rows) as deleted_rows,
      (select pg_catalog.count(*) from removed_objects) as deleted_objects
  )
  select deleted_rows::integer
  into v_deleted
  from counts;

  return v_deleted;
end
$function$;

revoke all on function public.cleanup_stale_project_attachments(timestamptz)
  from public, anon, authenticated;
grant execute on function public.cleanup_stale_project_attachments(timestamptz)
  to service_role, postgres;
