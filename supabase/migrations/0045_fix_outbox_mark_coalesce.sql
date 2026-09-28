-- 0045_fix_outbox_mark_coalesce.sql
--
-- Restores the two notification-outbox completion RPCs that 0033 broke.
--
-- 0033 (notification_claim_leases, applied live 2026-08-17) redefined
-- public.mark_notification_email_sent and
-- public.mark_notification_email_failed using pg_catalog.coalesce(...).
-- COALESCE is SQL grammar, not a catalogued function, so a schema-qualified
-- call can never resolve:
--
--     ERROR: 42883: function pg_catalog.coalesce(timestamp with time zone,
--            timestamp with time zone) does not exist
--
-- plpgsql resolves functions only when a statement first runs, so CREATE
-- accepted both bodies and every call has failed since. 0016 fixed the
-- same mistake in post_project_message and onboard_client_company.
--
-- Effect in production (confirmed read-only on 2026-09-27): the drain
-- route (app/api/cron/crm-notifications) claims a row, sends it, then
-- cannot mark it sent, so the lease expires and the row is claimed and
-- sent again. Failures were never recorded either. Four lead.created rows
-- used all 25 claims and sit pending with stale leases; they are left for
-- a separate owner-approved statement (see the v1.70 PR), not changed here.
--
-- Fix: both functions exactly as 0033 defines them, with coalesce( in
-- place of pg_catalog.coalesce(. Signatures, security definer,
-- search_path, grants and behaviour are unchanged. A smoke check at the
-- end calls both RPCs, so this file fails at apply time if either body
-- still cannot run.
--
-- Do not edit 0033; this file is the live replacement. Applying this file
-- to production is a separate owner action; merging the PR deploys the
-- Next.js app but does not run SQL.

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
      sent_at = coalesce(sent_at, pg_catalog.now()),
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
                        then coalesce(p_available_at, pg_catalog.now())
                      else available_at
                    end,
      last_error = pg_catalog.left(coalesce(p_error, ''), 500),
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

revoke all on function public.mark_notification_email_sent(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)
  from public, anon, authenticated;

grant execute on function public.mark_notification_email_sent(uuid, uuid)
  to service_role;
grant execute on function public.mark_notification_email_failed(uuid, uuid, boolean, text, text, timestamptz)
  to service_role;

-- Smoke check. The nil ids match no outbox row, so nothing is written, but
-- each call makes plpgsql resolve the whole UPDATE: with 0033's bodies both
-- calls raise 42883 and this migration fails instead of shipping silently.
do $smoke$
begin
  if public.mark_notification_email_sent(
       '00000000-0000-0000-0000-000000000000',
       '00000000-0000-0000-0000-000000000000'
     ) <> 0
     or public.mark_notification_email_failed(
       '00000000-0000-0000-0000-000000000000',
       '00000000-0000-0000-0000-000000000000',
       false,
       'unknown',
       'smoke check',
       null
     ) <> 0 then
    raise exception '0045 smoke check: a nil id completed an outbox row.';
  end if;
end;
$smoke$;
