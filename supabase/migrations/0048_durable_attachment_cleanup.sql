-- 0048_durable_attachment_cleanup.sql
--
-- Stale-upload cleanup that cannot lose track of a file.
--
-- Before: cleanup_stale_project_attachments (0034, storage-API variant in
-- 0038) deleted each stale attachment row and returned its storage_path; the
-- cron route then removed the storage object. If that removal failed, the
-- only record of the object was already gone, so it was orphaned for good.
--
-- Now a durable queue sits between the two steps:
--
--   claim_attachment_cleanup    moves stale attachment rows (pending, never
--                               attached to a message, older than p_before)
--                               into public.project_attachment_cleanup and
--                               deletes them from project_attachments, so they
--                               can no longer be finalized; then leases up to
--                               p_limit due queue entries and returns them.
--   complete_attachment_cleanup deletes queue entries whose storage objects
--                               were removed. Only then is the record gone.
--   fail_attachment_cleanup     keeps the entries, records the attempt and
--                               error, and schedules a retry with backoff
--                               (2^attempts minutes, capped at 24 hours).
--                               Entries are never dropped for failing.
--
-- Removing a storage object that is already gone succeeds (Supabase Storage
-- skips missing keys), so a retry after a partial success is harmless.
-- Overlapping cron runs do not double-process: a claim leases each entry by
-- pushing next_attempt_at forward by p_lease_seconds.
--
-- All three functions and the queue are service-role only, like 0034's
-- function. The old cleanup_stale_project_attachments is left in place so the
-- app keeps working if it deploys before this file is applied (the route
-- falls back to it when claim_attachment_cleanup does not exist). Applying
-- this file to production is a separate owner action.

create table if not exists public.project_attachment_cleanup (
  storage_path text primary key,
  attachment_id uuid not null,
  project_id uuid,
  queued_at timestamptz not null default now(),
  attempts integer not null default 0 check (attempts >= 0),
  last_attempt_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  next_attempt_at timestamptz not null default now()
);

create index if not exists project_attachment_cleanup_due_idx
  on public.project_attachment_cleanup (next_attempt_at);

alter table public.project_attachment_cleanup enable row level security;
revoke all on table public.project_attachment_cleanup from public, anon, authenticated;
grant select, insert, update, delete on table public.project_attachment_cleanup to service_role;

create or replace function public.claim_attachment_cleanup(
  p_before timestamptz default (now() - interval '24 hours'),
  p_limit integer default 50,
  p_lease_seconds integer default 600
)
returns table (storage_path text, attempts integer)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
begin
  p_before := coalesce(p_before, pg_catalog.now() - interval '24 hours');
  p_limit := least(greatest(coalesce(p_limit, 50), 1), 500);
  p_lease_seconds := least(greatest(coalesce(p_lease_seconds, 600), 30), 3600);

  -- 1. Queue stale uploads, then drop their attachment rows.
  with stale as materialized (
    select attachment.id, attachment.project_id, attachment.storage_path
    from public.project_attachments as attachment
    where attachment.status = 'pending'
      and attachment.message_id is null
      and attachment.created_at < p_before
    for update skip locked
  ), queued as (
    insert into public.project_attachment_cleanup (storage_path, attachment_id, project_id)
    select stale.storage_path, stale.id, stale.project_id
    from stale
    on conflict on constraint project_attachment_cleanup_pkey do nothing
    returning 1
  )
  delete from public.project_attachments as attachment
  using stale
  where attachment.id = stale.id
    and attachment.status = 'pending'
    and attachment.message_id is null;

  -- 2. Lease due entries so an overlapping run skips them.
  return query
  with due as (
    select entry.storage_path
    from public.project_attachment_cleanup as entry
    where entry.next_attempt_at <= pg_catalog.now()
    order by entry.next_attempt_at, entry.storage_path
    limit p_limit
    for update skip locked
  )
  update public.project_attachment_cleanup as entry
  set next_attempt_at = pg_catalog.now() + pg_catalog.make_interval(secs => p_lease_seconds)
  from due
  where entry.storage_path = due.storage_path
  returning entry.storage_path, entry.attempts;
end
$function$;

create or replace function public.complete_attachment_cleanup(p_storage_paths text[])
returns integer
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  with removed as (
    delete from public.project_attachment_cleanup as entry
    where entry.storage_path = any (coalesce(p_storage_paths, '{}'::text[]))
    returning 1
  )
  select count(*)::integer from removed;
$function$;

create or replace function public.fail_attachment_cleanup(p_storage_paths text[], p_error text default null)
returns integer
language sql
security definer
set search_path to 'pg_catalog', 'public', 'private'
as $function$
  with updated as (
    update public.project_attachment_cleanup as entry
    set attempts = entry.attempts + 1,
        last_attempt_at = pg_catalog.now(),
        last_error = pg_catalog.left(coalesce(p_error, 'Storage removal failed.'), 500),
        next_attempt_at = pg_catalog.now()
          + pg_catalog.make_interval(mins => least(pg_catalog.power(2, least(entry.attempts + 1, 11))::integer, 1440))
    where entry.storage_path = any (coalesce(p_storage_paths, '{}'::text[]))
    returning 1
  )
  select count(*)::integer from updated;
$function$;

revoke all on function public.claim_attachment_cleanup(timestamptz, integer, integer) from public, anon, authenticated;
revoke all on function public.complete_attachment_cleanup(text[]) from public, anon, authenticated;
revoke all on function public.fail_attachment_cleanup(text[], text) from public, anon, authenticated;
grant execute on function public.claim_attachment_cleanup(timestamptz, integer, integer) to service_role;
grant execute on function public.complete_attachment_cleanup(text[]) to service_role;
grant execute on function public.fail_attachment_cleanup(text[], text) to service_role;
