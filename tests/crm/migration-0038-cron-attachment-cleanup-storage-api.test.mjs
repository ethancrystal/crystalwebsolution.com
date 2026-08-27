import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationPath = 'supabase/migrations/0038_cron_attachment_cleanup_storage_api.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('0038 redefines cleanup_stale_project_attachments to stop deleting storage.objects directly', async () => {
  const sql = await readMigration();
  assert.match(sql, /drop function if exists public\.cleanup_stale_project_attachments\(timestamptz\)/i);
  assert.match(sql, /create or replace function public\.cleanup_stale_project_attachments\(/i);
  assert.match(sql, /returns table\(storage_path text\)/i);
  assert.doesNotMatch(sql, /delete from storage\.objects/i);
  assert.doesNotMatch(sql, /set search_path = [^\n]*\bstorage\b/i);
});

test('0038 still claims stale rows under row locking and the canonical eligibility boundary', async () => {
  const sql = await readMigration();
  assert.match(sql, /for update skip locked/i);
  assert.match(sql, /status = 'pending'/i);
  assert.match(sql, /message_id is null/i);
  assert.match(sql, /created_at < p_before/i);
  assert.match(sql, /delete from public\.project_attachments/i);
  assert.match(sql, /returning stale\.storage_path|select stale\.storage_path/i);
});

test('0038 keeps cleanup restricted to trusted scheduler workers', async () => {
  const sql = await readMigration();
  assert.match(sql, /revoke all on function public\.cleanup_stale_project_attachments\(timestamptz\)[\s\S]*?from public,\s*anon,\s*authenticated/i);
  assert.match(sql, /grant execute on function public\.cleanup_stale_project_attachments\(timestamptz\)[\s\S]*?to service_role,\s*postgres/i);
});

test('the cron route removes the returned storage paths via the Storage API instead of SQL', async () => {
  const source = await readFile('app/api/cron/crm-notifications/route.js', 'utf8');
  assert.match(source, /supabase\.storage\.from\('project-files'\)\.remove\(paths\)/);
  assert.match(source, /row\.storage_path/);
});
