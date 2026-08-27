-- 0038_cron_attachment_cleanup_storage_api.sql
-- Fix public.cleanup_stale_project_attachments (0034): it deleted rows
-- directly from storage.objects, which Supabase blocks ("Direct deletion
-- from storage tables is not allowed. Use the Storage API instead.") -- this
-- has been failing on nearly every crm-notifications cron invocation since
-- 0034 shipped. The RPC's job is now only to atomically claim and delete the
-- stale public.project_attachments rows (still under `for update skip
-- locked`, so concurrent cron runs still can't double-process the same row)
-- and return each removed row's storage_path. The actual object deletion
-- moves to the caller (app/api/cron/crm-notifications/route.js), which calls
-- the Storage API (supabase.storage.from('project-files').remove(...)) --
-- the only supported way to delete a Storage-backed object.

drop function if exists public.cleanup_stale_project_attachments(timestamptz);

create or replace function public.cleanup_stale_project_attachments(
  p_before timestamptz default now() - interval '24 hours'
)
returns table(storage_path text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $function$
begin
  p_before := coalesce(p_before, pg_catalog.now() - interval '24 hours');

  return query
  with stale as materialized (
    select attachment.id, attachment.storage_path
    from public.project_attachments as attachment
    where attachment.status = 'pending'
      and attachment.message_id is null
      and attachment.created_at < p_before
    for update skip locked
  ), removed_rows as (
    delete from public.project_attachments as attachment
    using stale
    where attachment.id = stale.id
      and attachment.status = 'pending'
      and attachment.message_id is null
    returning attachment.id
  )
  select stale.storage_path
  from stale
  join removed_rows on removed_rows.id = stale.id;
end
$function$;

revoke all on function public.cleanup_stale_project_attachments(timestamptz)
  from public, anon, authenticated;
grant execute on function public.cleanup_stale_project_attachments(timestamptz)
  to service_role, postgres;
