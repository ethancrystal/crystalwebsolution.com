import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationPath = 'supabase/migrations/0032_project_asset_lifecycle_hardening.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('0032 defines stale attachment cleanup with a fixed search path and safe default cutoff', async () => {
  const sql = await readMigration();
  assert.match(sql, /create or replace function public\.cleanup_stale_project_attachments\([\s\S]*?p_before timestamptz default now\(\) - interval '24 hours'/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public, private, storage/i);
  assert.match(sql, /status = 'pending'/i);
  assert.match(sql, /created_at < p_before/i);
  assert.match(sql, /message_id is null/i);
});

test('0032 deletes exact private storage objects before deleting only stale pending metadata', async () => {
  const sql = await readMigration();
  assert.match(sql, /delete from storage\.objects/i);
  assert.match(sql, /bucket_id = 'project-files'/i);
  assert.match(sql, /object\.name = stale\.storage_path/i);
  assert.match(sql, /delete from public\.project_attachments/i);
  assert.match(sql, /status = 'pending'/i);
  assert.match(sql, /message_id is null/i);
  assert.doesNotMatch(sql, /status\s*<>\s*'ready'/i);
  assert.match(sql, /from removed_objects/i);
});

test('0032 makes repeated message attempts idempotent at the database boundary', async () => {
  const sql = await readMigration();
  assert.match(sql, /create or replace function public\.post_project_message/i);
  assert.match(sql, /on conflict \(sender_id, client_generated_id\) do nothing/i);
  assert.match(sql, /if v_message_id is null then/i);
  assert.match(sql, /return v_message_id/i);
});

test('0032 broadcasts identifiers for edited messages through the project topic', async () => {
  const sql = await readMigration();
  assert.match(sql, /create or replace function private\.broadcast_project_message_updated\(\)/i);
  assert.match(sql, /realtime\.send/);
  assert.match(sql, /project_message_updated/);
  assert.match(sql, /after update of body, edited_at on public\.project_messages/i);
});

test('0032 keeps cleanup out of API roles and grants it only to trusted workers', async () => {
  const sql = await readMigration();
  assert.match(sql, /revoke all on function public\.cleanup_stale_project_attachments\(timestamptz\)[\s\S]*?from public,\s*anon,\s*authenticated/i);
  assert.match(sql, /grant execute on function public\.cleanup_stale_project_attachments\(timestamptz\)[\s\S]*?to service_role/i);
});
