import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationPath = 'supabase/migrations/0034_notification_attachment_cleanup_rpc.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('0034 restores the cleanup RPC with the canonical attachment eligibility boundary', async () => {
  const sql = await readMigration();
  assert.match(sql, /create or replace function public\.cleanup_stale_project_attachments\(/i);
  assert.match(sql, /p_before timestamptz default now\(\) - interval '24 hours'/i);
  assert.match(sql, /returns integer/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public, private, storage/i);
  assert.match(sql, /status = 'pending'/i);
  assert.match(sql, /message_id is null/i);
  assert.match(sql, /created_at < p_before/i);
});

test('0034 deletes exact project-files objects before stale metadata and uses row locking', async () => {
  const sql = await readMigration();
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /delete from storage\.objects/i);
  assert.match(sql, /bucket_id = 'project-files'/i);
  assert.match(sql, /object\.name = stale\.storage_path/i);
  assert.match(sql, /delete from public\.project_attachments/i);
  assert.match(sql, /from removed_objects/i);
  assert.doesNotMatch(sql, /status\s*<>\s*'ready'/i);
});

test('0034 exposes cleanup only to trusted scheduler workers', async () => {
  const sql = await readMigration();
  assert.match(sql, /revoke all on function public\.cleanup_stale_project_attachments\(timestamptz\)[\s\S]*?from public,\s*anon,\s*authenticated/i);
  assert.match(sql, /grant execute on function public\.cleanup_stale_project_attachments\(timestamptz\)[\s\S]*?to service_role,\s*postgres/i);
});

test('0034 is additive and does not alter notification lease functions or statuses', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /drop table|alter table public\.notifications_outbox|create or replace function public\.(?:claim_notification_email_batch|mark_notification_email_sent|mark_notification_email_failed)/i);
  assert.doesNotMatch(sql, /status\s+in\s*\([^)]*processing/i);
});
