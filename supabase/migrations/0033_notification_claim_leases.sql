-- Gate C1: atomic notification email claims and lease-owned outcomes.
--
-- This migration is additive. It intentionally keeps the existing queue status
-- contract (pending, sent, failed) so readers and historical rows remain
-- compatible while the worker gains database ownership of each delivery attempt.
-- Apply only after live-ledger reconciliation and preview-database verification.

alter table public.notifications_outbox
  add column if not exists lease_id uuid,
  add column if not exists lease_acquired_at timestamptz,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists failure_code text,
  add column if not exists failed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.notifications_outbox'::pg_catalog.regclass
      and conname = 'notifications_outbox_lease_window_check'
  ) then
    alter table public.notifications_outbox
      add constraint notifications_outbox_lease_window_check
      check (
        (lease_id is null and lease_acquired_at is null and lease_expires_at is null)
        or (
          lease_id is not null
          and lease_acquired_at is not null
          and lease_expires_at is not null
          and lease_expires_at >= lease_acquired_at
        )
      );
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.notifications_outbox'::pg_catalog.regclass
      and conname = 'notifications_outbox_failure_code_check'
  ) then
    alter table public.notifications_outbox
      add constraint notifications_outbox_failure_code_check
      check (
        failure_code is null
        or failure_code in (
          'missing_recipient',
          'missing_template',
          'provider_retryable',
          'provider_terminal',
          'lease_conflict',
          'unknown'
        )
      );
  end if;
end;
$$;

create index if not exists notifications_outbox_email_claim_idx
  on public.notifications_outbox (available_at, lease_expires_at, created_at, id)
  where channel = 'email' and status = 'pending';

create or replace function public.claim_notification_email_batch(
  p_limit integer default 25,
  p_lease_seconds integer default 300
)
returns table (
  id uuid,
  project_id uuid,
  user_id uuid,
  event_type text,
  payload jsonb,
  attempts integer,
  lease_id uuid
)
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
begin
  if p_limit is null or p_limit < 1 or p_limit > 25 then
    raise exception 'Claim limit must be between 1 and 25.' using errcode = '22023';
  end if;

  if p_lease_seconds is null or p_lease_seconds < 60 or p_lease_seconds > 1800 then
    raise exception 'Lease duration must be between 60 and 1800 seconds.' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select notification.id
    from public.notifications_outbox as notification
    where notification.channel = 'email'
      and notification.status = 'pending'
      and notification.available_at <= pg_catalog.now()
      and notification.attempts < 25
      and (
        notification.lease_id is null
        or notification.lease_expires_at <= pg_catalog.now()
      )
    order by notification.available_at, notification.created_at, notification.id
    limit p_limit
    for update skip locked
  )
  update public.notifications_outbox as notification
  set lease_id = pg_catalog.gen_random_uuid(),
      lease_acquired_at = pg_catalog.now(),
      lease_expires_at = pg_catalog.now() + pg_catalog.make_interval(secs => p_lease_seconds),
      last_attempt_at = pg_catalog.now(),
      failure_code = null,
      failed_at = null,
      last_error = null,
      attempts = notification.attempts + 1
  from candidates
  where notification.id = candidates.id
  returning
    notification.id,
    notification.project_id,
    notification.user_id,
    notification.event_type,
    notification.payload,
    notification.attempts,
    notification.lease_id;
end;
$function$;

create or replace function public.mark_notification_email_sent(
  p_notification_id uuid,
  p_lease_id uuid
)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_updated integer;
begin
  update public.notifications_outbox
  set status = 'sent',
      sent_at = pg_catalog.coalesce(sent_at, pg_catalog.now()),
      last_error = null,
      failure_code = null,
      failed_at = null,
      lease_id = null,
      lease_acquired_at = null,
      lease_expires_at = null
  where id = p_notification_id
    and lease_id = p_lease_id
    and channel = 'email'
    and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$;

create or replace function public.mark_notification_email_failed(
  p_notification_id uuid,
  p_lease_id uuid,
  p_retryable boolean,
  p_failure_code text,
  p_error text default null,
  p_available_at timestamptz default null
)
returns integer
language plpgsql
security definer
set search_path to 'pg_catalog', 'public'
as $function$
declare
  v_updated integer;
  v_terminal boolean;
begin
  if p_failure_code is null
     or p_failure_code not in (
       'missing_recipient',
       'missing_template',
       'provider_retryable',
       'provider_terminal',
       'lease_conflict',
       'unknown'
     ) then
    raise exception 'Invalid notification failure code.' using errcode = '22023';
  end if;

  update public.notifications_outbox
  set status = case
                 when p_retryable and attempts < 5 then 'pending'
                 else 'failed'
               end,
      available_at = case
                      when p_retryable and attempts < 5
                        then pg_catalog.coalesce(p_available_at, pg_catalog.now())
                      else available_at
                    end,
      last_error = pg_catalog.left(pg_catalog.coalesce(p_error, ''), 500),
      failure_code = p_failure_code,
      failed_at = case
                    when p_retryable and attempts < 5 then null
                    else pg_catalog.now()
                  end,
      lease_id = null,
      lease_acquired_at = null,
      lease_expires_at = null
  where id = p_notification_id
    and lease_id = p_lease_id
    and channel = 'email'
    and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$function$;

revoke all on function public.claim_notification_email_batch(integer, integer)
  from public, anon, authenticated;
revoke all on function public.mark_notification_email_sent(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)
  from public, anon, authenticated;

grant execute on function public.claim_notification_email_batch(integer, integer)
  to service_role;
grant execute on function public.mark_notification_email_sent(uuid, uuid)
  to service_role;
grant execute on function public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)
  to service_role;
