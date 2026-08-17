import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MIGRATION_PATH = 'supabase/migrations/0033_notification_claim_leases.sql';
const ROUTE_PATH = 'app/api/cron/crm-notifications/route.js';

async function readMigration() {
  return readFile(MIGRATION_PATH, 'utf8');
}

async function readRoute() {
  return readFile(ROUTE_PATH, 'utf8');
}

test('claim lease migration adds additive ownership fields without a processing status', async () => {
  const sql = await readMigration();

  for (const field of [
    'lease_id',
    'lease_acquired_at',
    'lease_expires_at',
    'last_attempt_at',
    'failure_code',
    'failed_at',
  ]) {
    assert.match(sql, new RegExp(`add column if not exists ${field}`, 'i'));
  }
  assert.doesNotMatch(sql, /status\s*=\s*'processing'/i);
  assert.doesNotMatch(sql, /add constraint[^;]+status[^;]+processing/i);
});

test('claim RPC atomically selects due email rows and recovers expired leases', async () => {
  const sql = await readMigration();

  assert.match(sql, /claim_notification_email_batch/i);
  assert.match(sql, /channel\s*=\s*'email'/i);
  assert.match(sql, /status\s*=\s*'pending'/i);
  assert.match(sql, /available_at\s*<=\s*(?:pg_catalog\.)?now\(\)/i);
  assert.match(sql, /lease_id\s+is\s+null/i);
  assert.match(sql, /lease_expires_at\s+<=\s+(?:pg_catalog\.)?now\(\)/i);
  assert.match(sql, /FOR\s+UPDATE\s+SKIP\s+LOCKED/i);
  assert.match(sql, /RETURNING/i);
  assert.match(sql, /gen_random_uuid\(\)/i);
  assert.match(sql, /attempts\s*=\s*notification\.attempts\s*\+\s*1/i);
  assert.match(sql, /LIMIT\s+p_limit/i);
});

test('claim and completion RPCs are trusted fixed-search-path functions', async () => {
  const sql = await readMigration();

  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.claim_notification_email_batch/i);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.mark_notification_email_sent/i);
  assert.match(sql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.mark_notification_email_failed/i);
  assert.match(sql, /SECURITY\s+DEFINER/i);
  assert.match(sql, /SET\s+search_path\s+TO\s+'pg_catalog',\s*'public'/i);
  assert.match(sql, /REVOKE\s+ALL\s+ON\s+FUNCTION[^;]+claim_notification_email_batch[^;]+FROM\s+PUBLIC/i);
  assert.match(sql, /claim_notification_email_batch[\s\S]+from\s+public,\s*anon,\s*authenticated/i);
  assert.match(sql, /claim_notification_email_batch[\s\S]+from\s+public,\s*anon,\s*authenticated/i);
  assert.match(sql, /GRANT\s+EXECUTE\s+ON\s+FUNCTION[^;]+claim_notification_email_batch[^;]+TO\s+service_role/i);
});

test('completion updates are lease-owned compare-and-set operations', async () => {
  const sql = await readMigration();

  assert.match(sql, /WHERE\s+id\s*=\s*p_notification_id\s+AND\s+lease_id\s*=\s*p_lease_id/i);
  assert.match(sql, /mark_notification_email_sent[\s\S]+status\s*=\s*'sent'/i);
  assert.match(sql, /mark_notification_email_failed[\s\S]+failure_code/i);
  assert.match(sql, /lease_id\s*=\s*NULL/i);
  assert.match(sql, /lease_expires_at\s*=\s*NULL/i);
});

test('notification worker claims through the protected RPC and completes through lease-owned RPCs', async () => {
  const route = await readRoute();

  assert.match(route, /rpc\(\s*['"]claim_notification_email_batch['"]/i);
  assert.match(route, /rpc\(\s*['"]mark_notification_email_sent['"]/i);
  assert.match(route, /rpc\(\s*['"]mark_notification_email_failed['"]/i);
  assert.doesNotMatch(route, /from\(\s*['"]notifications_outbox['"]\s*\)[\s\S]+\.update\(/i);
  assert.match(route, /lease_id/i);
  assert.match(route, /BATCH_SIZE/);
});

test('notification worker keeps non-email channels outside the claim contract', async () => {
  const sql = await readMigration();
  const route = await readRoute();

  assert.match(sql, /channel\s*=\s*'email'/i);
  assert.doesNotMatch(route, /['"]in_app['"]\s*\)|['"]realtime['"]\s*\)/i);
});

test('notification failure codes are allowlisted and errors are bounded', async () => {
  const sql = await readMigration();
  const route = await readRoute();

  assert.match(sql, /failure_code/i);
  assert.match(sql, /missing_recipient|missing_template|provider_retryable|provider_terminal/i);
  assert.match(route, /slice\(0,\s*500\)/i);
  assert.match(route, /safeFailureMessage/);
  assert.doesNotMatch(route, /String\(error\.message/);
});
