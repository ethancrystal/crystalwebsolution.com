import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const migrationPath = 'supabase/migrations/0031_idempotent_client_project_intake.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('0031 adds a creator-scoped project intake idempotency key and unique index', async () => {
  const sql = await readMigration();
  assert.match(sql, /add column if not exists client_generated_id uuid/i);
  assert.match(sql, /create unique index[\s\S]*?projects_client_generated_idx[\s\S]*?created_by[\s\S]*?client_generated_id/i);
});

test('0031 replaces the exact live six-argument create_project signature with the idempotent form', async () => {
  const sql = await readMigration();
  assert.match(sql, /drop function if exists public\.create_project\(uuid,\s*text,\s*text,\s*text,\s*date,\s*uuid\)/i);
  assert.match(sql, /create or replace function public\.create_project\(/i);
  assert.match(sql, /p_client_generated_id uuid default null/i);
});

test('client authorization derives the effective company from the authenticated profile', async () => {
  const sql = await readMigration();
  assert.match(sql, /select profile\.role::text, profile\.company_id/i);
  assert.match(sql, /v_role = 'client' and v_profile_company_id = p_company_id/i);
  assert.match(sql, /v_company_id := case[\s\S]*?when v_role = 'client' then v_profile_company_id[\s\S]*?else p_company_id/i);
});

test('duplicate submissions return before a second thread, history, or audit record', async () => {
  const sql = await readMigration();
  assert.match(sql, /select project\.id[\s\S]*?created_by\s*=\s*v_user_id[\s\S]*?client_generated_id\s*=\s*p_client_generated_id/i);
  assert.match(sql, /on conflict \(created_by, client_generated_id\)[\s\S]*?do nothing/i);
  assert.match(sql, /if v_project_id is null[\s\S]*?select project\.id[\s\S]*?client_generated_id = p_client_generated_id/i);
  assert.match(sql, /if exists \([\s\S]*?from public\.project_threads as thread[\s\S]*?thread\.project_id = v_project_id/i);
  assert.match(sql, /insert into public\.project_threads\s*\(project_id\)/i);
});

test('0031 preserves the brief_submitted state, audit event, and authenticated-only RPC contract', async () => {
  const sql = await readMigration();
  assert.match(sql, /'brief_submitted'/i);
  assert.match(sql, /'project\.created'/i);
  assert.match(sql, /revoke all on function public\.create_project\(uuid, text, text, text, date, uuid, uuid\) from public/i);
  assert.match(sql, /revoke all on function public\.create_project\(uuid, text, text, text, date, uuid, uuid\) from anon/i);
  assert.match(sql, /grant execute on function public\.create_project\(uuid, text, text, text, date, uuid, uuid\) to authenticated/i);
});
