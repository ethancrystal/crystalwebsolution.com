-- 0025_schedule_notification_drain.sql
--
-- CRM-IMPLEMENTATION-PLAN.md decision 4: drain the notifications_outbox
-- every 5 minutes instead of relying solely on the daily Vercel cron
-- backstop (vercel.json, 0 13 * * *) -- $0 on the Supabase free plan via
-- pg_cron + pg_net calling the app's own drain endpoint
-- (app/api/cron/crm-notifications/route.js), which already authorizes via
-- a constant-time x-cron-secret comparison against CRM_CRON_SECRET /
-- CRON_SECRET and fails closed with neither configured.
--
-- The secret is generated here and stored in Supabase Vault rather than
-- reusing the existing Vercel CRM_CRON_SECRET value, because this session
-- has no read access to Vercel env var values -- only to set them via the
-- dashboard, which the owner does. The generated value must be copied into
-- Vercel's CRM_CRON_SECRET (Production) to match; until that happens, this
-- job's calls will 401 against the live endpoint (harmless -- the endpoint
-- fails closed, nothing is exposed, retries simply keep 401ing).
--
-- pg_net and supabase_vault are already installed on this project
-- (confirmed via list_extensions); pg_cron is not, hence the explicit
-- CREATE EXTENSION below.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant cron usage to postgres (the role migrations run as) so it can
-- schedule/unschedule jobs; matches Supabase's documented pg_cron setup.
GRANT USAGE ON SCHEMA cron TO postgres;

DO $$
DECLARE
  v_secret TEXT;
BEGIN
  -- Idempotent: skip secret generation if this migration is ever re-run
  -- against a database that already has it (e.g. branch/reset scenarios).
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'crm_cron_secret'
  ) THEN
    v_secret := encode(extensions.gen_random_bytes(32), 'hex');
    PERFORM vault.create_secret(v_secret, 'crm_cron_secret',
      'Shared secret for the pg_cron -> /api/cron/crm-notifications drain call. Must match CRM_CRON_SECRET in Vercel (Production).');
  END IF;
END $$;

-- Unschedule first so re-running this migration (or a future edit to the
-- URL/schedule) doesn't accumulate duplicate jobs under the same name.
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'drain-crm-outbox';

SELECT cron.schedule(
  'drain-crm-outbox',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.crystalwebsolution.com/api/cron/crm-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'crm_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 8000
  );
  $$
);
