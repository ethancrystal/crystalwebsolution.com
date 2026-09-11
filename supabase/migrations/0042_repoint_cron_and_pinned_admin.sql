-- 0042_repoint_cron_and_pinned_admin.sql
--
-- After two production domain moves (crystalwebsolution.com ->
-- cdsportswearusa.com -> cdsportswearinc.com) two live-database
-- references still named the original, now-dark host:
--
-- 1. The pg_cron job `drain-crm-outbox` (0025) POSTs to
--    https://www.crystalwebsolution.com/api/cron/crm-notifications.
--    If 0025 actually ran against production, every 5-minute drain
--    has been failing against a dead host. Vercel Cron (vercel.json,
--    daily 13:00 UTC) is the only remaining backstop until this
--    migration is applied.
--
-- 2. public.pinned_admin_email() (0014, search_path-pinned in 0015)
--    still returns ethan@crystalwebsolution.com. Lead-capture RPCs
--    (0026, 0029) look up the admin actor by that address, so they
--    miss the live admin until the pin matches the login they use.
--    Owner-approved 2026-09-11: move the pin to
--    ethan@cdsportswearinc.com.
--
-- Do not edit 0014/0015/0025; this file is the live replacement.
-- The drain URL matches SITE_ORIGIN in lib/seo.mjs (www, not apex).
-- Applying this file to production is a separate owner action; merging
-- the PR deploys the Next.js app but does not run SQL.

-- ---------- 1. Drain job URL ----------

CREATE EXTENSION IF NOT EXISTS pg_cron;
GRANT USAGE ON SCHEMA cron TO postgres;

-- Unschedule first so re-running this migration does not accumulate
-- duplicate jobs under the same name (same idiom as 0025).
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'drain-crm-outbox';

SELECT cron.schedule(
  'drain-crm-outbox',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.cdsportswearinc.com/api/cron/crm-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crm_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
  $$
);

-- ---------- 2. Pinned admin address ----------

create or replace function public.pinned_admin_email()
returns text
language sql
immutable
set search_path to ''
as $$
  SELECT 'ethan@cdsportswearinc.com'::TEXT
$$;

COMMENT ON FUNCTION public.pinned_admin_email() IS
  'The single address permitted to hold the admin role. 0042 moved this from ethan@crystalwebsolution.com (retired domain) to ethan@cdsportswearinc.com. Change here to move it again.';

-- Keep the 0027 containment contract: the helper is not an API endpoint.
-- CREATE OR REPLACE preserves ACLs, but re-asserting the revoke makes the
-- contract auditable in this file the same way 0027 did.
revoke all on function public.pinned_admin_email()
  from public, anon, authenticated;

-- Align Auth + the admin row with the new pin.
--
-- - If the old mailbox exists and the new one does not, rename in place
--   so the current admin keeps their password and role.
-- - If the new mailbox already exists, do not merge accounts: demote any
--   other admin (unique index profiles_single_admin_idx) and promote the
--   named address. Demote-before-promote is required by that index.
-- - If neither address is present (fresh/test databases), this is a no-op
--   and later fixtures should read public.pinned_admin_email().
do $$
declare
  v_old constant text := 'ethan@crystalwebsolution.com';
  v_new constant text := 'ethan@cdsportswearinc.com';
  v_old_id uuid;
  v_new_id uuid;
begin
  select id into v_old_id
  from auth.users
  where lower(email) = v_old;

  select id into v_new_id
  from auth.users
  where lower(email) = v_new;

  if v_old_id is not null and v_new_id is null then
    update auth.users
    set email = v_new,
        updated_at = now()
    where id = v_old_id;

    update auth.identities
    set identity_data = jsonb_set(
          coalesce(identity_data, '{}'::jsonb),
          '{email}',
          to_jsonb(v_new)
        ),
        provider_id = case
          when provider_id = v_old then v_new
          else provider_id
        end,
        updated_at = now()
    where user_id = v_old_id
      and provider = 'email';

    v_new_id := v_old_id;
  end if;

  if v_new_id is not null then
    update public.profiles
    set role = 'project_manager'::public.user_role
    where role = 'admin'::public.user_role
      and id is distinct from v_new_id;

    update public.profiles
    set role = 'admin'::public.user_role
    where id = v_new_id
      and role is distinct from 'admin'::public.user_role;
  end if;
end;
$$;
