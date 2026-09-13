import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SITE_ORIGIN } from '../../lib/seo.mjs';

const migrationPath = 'supabase/migrations/0042_repoint_cron_and_pinned_admin.sql';
const historicalSchedulerPath = 'supabase/migrations/0025_schedule_notification_drain.sql';
const historicalPinPath = 'supabase/migrations/0014_signup_account_type_and_single_admin.sql';

const DRAIN_PATH = '/api/cron/crm-notifications';
const NEW_ADMIN = 'ethan@cdsportswearinc.com';
const OLD_ADMIN = 'ethan@crystalwebsolution.com';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function statementsOf(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('0042 reschedules drain-crm-outbox onto the current production origin', async () => {
  const sql = await readMigration();
  const statements = statementsOf(sql);
  const drainUrl = `${SITE_ORIGIN}${DRAIN_PATH}`;

  assert.match(sql, /cron\.unschedule\(jobid\)/);
  assert.match(sql, /where jobname = 'drain-crm-outbox'/i);
  assert.match(statements, /cron\.schedule\(\s*'drain-crm-outbox',\s*'\*\/5 \* \* \* \*'/);
  assert.match(statements, new RegExp(`url := '${escapeRegExp(drainUrl)}'`));
  assert.match(statements, /x-cron-secret/);
  assert.match(statements, /vault\.decrypted_secrets/);
  assert.match(statements, /name = 'crm_cron_secret'/);
  assert.doesNotMatch(statements, /crystalwebsolution\.com\/api\/cron/);
  assert.doesNotMatch(statements, /cdsportswearusa\.com\/api\/cron/);
});

test('0042 replaces pinned_admin_email with the owner-approved mailbox and keeps 0015/0027 contracts', async () => {
  const sql = await readMigration();
  const statements = statementsOf(sql);

  assert.match(statements, /create or replace function public\.pinned_admin_email\(\)/i);
  assert.match(statements, new RegExp(`SELECT '${escapeRegExp(NEW_ADMIN)}'::TEXT`));
  assert.match(statements, /set search_path to ''/);
  assert.match(
    statements,
    /revoke all on function public\.pinned_admin_email\(\)\s+from public,\s*anon,\s*authenticated/i,
  );
  assert.doesNotMatch(statements, new RegExp(`SELECT '${escapeRegExp(OLD_ADMIN)}'::TEXT`));
});

test('0042 aligns Auth with the new pin without merging two existing accounts', async () => {
  const sql = await readMigration();
  const statements = statementsOf(sql);

  assert.match(statements, /from auth\.users/);
  assert.match(statements, /update auth\.users/);
  assert.match(statements, /update auth\.identities/);
  assert.match(statements, /v_old_id is not null and v_new_id is null/);
  assert.match(statements, /role = 'project_manager'::public\.user_role/);
  assert.match(statements, /id is distinct from v_new_id/);
  assert.match(statements, /role = 'admin'::public\.user_role/);
});

test('historical 0014/0025 keep their original values; 0042 is the live replacement', async () => {
  const [pin, scheduler] = await Promise.all([
    readFile(historicalPinPath, 'utf8'),
    readFile(historicalSchedulerPath, 'utf8'),
  ]);

  assert.match(pin, /ethan@crystalwebsolution\.com/);
  assert.match(scheduler, /https:\/\/www\.crystalwebsolution\.com\/api\/cron\/crm-notifications/);
});
