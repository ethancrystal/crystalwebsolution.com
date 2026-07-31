import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0008_auth_rbac_repair.sql';

test('0008 repairs profile authority and exposes only hardened authenticated RPCs', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create or replace function public\.admin_set_user_role/i);
  assert.match(sql, /create or replace function public\.onboard_client_company/i);
  assert.match(sql, /create or replace function public\.current_profile_role/i);
  assert.match(sql, /set search_path = pg_catalog, public/i);
  assert.match(sql, /revoke all on function .* from public/i);
  assert.match(sql, /revoke all on function .* from anon/i);
  assert.match(sql, /grant execute on function .*admin_set_user_role.* to authenticated/i);
  assert.match(sql, /grant execute on function .*onboard_client_company.* to authenticated/i);
  assert.match(sql, /old\.role is distinct from new\.role/i);
  assert.match(sql, /is_admin\(\)/i);
  assert.doesNotMatch(sql, /grant execute .* to anon/i);
  assert.doesNotMatch(sql, /auth\.jwt\(\)|app_metadata/i);
});

test('0008 validates role mutations and makes client onboarding atomic', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /p_role\s+not in\s*\(\s*'client'\s*,\s*'project_manager'\s*,\s*'admin'\s*\)/i);
  assert.match(sql, /p_user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /count\(\*\)[\s\S]*role\s*=\s*'admin'/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /insert into public\.companies/i);
  assert.match(sql, /insert into public\.contacts/i);
  assert.match(sql, /insert into public\.company_members/i);
  assert.match(sql, /update public\.profiles[\s\S]*company_id/i);
  assert.match(sql, /alter column email drop not null/i);
  assert.match(sql, /drop function if exists public\.onboard_client_company\s*\(\s*text\s*,\s*text\s*\)/i);
});

test('0008 preserves the current onboarding caller without trusting its email input', async () => {
  const [sql, form] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile('components/crm/BriefSubmissionForm.jsx', 'utf8'),
  ]);

  assert.match(form, /createProject\(formData\)/);
  assert.match(form, /formData\.set\('title',\s*briefForm\.title\)/);
  assert.match(form, /formData\.set\('brief',\s*briefForm\.description/);
  assert.match(sql, /create or replace function public\.onboard_client_company\(/i);
  assert.doesNotMatch(sql, /insert into public\.contacts[\s\S]{0,500}\bp_email\b/i);
});

test('0008 drops the optional legacy overload before changing its grants', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const oldDrop = sql.search(
    /drop function if exists public\.onboard_client_company\s*\(\s*text\s*,\s*text\s*\)/i,
  );
  const firstOldGrantChange = sql.search(
    /revoke all on function public\.onboard_client_company\s*\(\s*text\s*,\s*text\s*\)/i,
  );

  assert.ok(oldDrop >= 0);
  assert.ok(firstOldGrantChange < 0 || oldDrop < firstOldGrantChange);
});

test('0008 isolates legacy CRM reads and removes broad non-admin updates', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(
    sql,
    /create policy "PM can view assigned companies"[\s\S]*exists[\s\S]*from public\.deals[\s\S]*owner_id\s*=\s*auth\.uid\(\)/i,
  );
  assert.match(
    sql,
    /create policy "PM can view assigned contacts"[\s\S]*exists[\s\S]*from public\.deals[\s\S]*owner_id\s*=\s*auth\.uid\(\)/i,
  );
  assert.match(
    sql,
    /create policy "Clients can view client-visible notes"[\s\S]*visibility\s*=\s*'client'/i,
  );
  assert.match(
    sql,
    /create policy "PM can view notes for assigned companies"[\s\S]*owner_id\s*=\s*auth\.uid\(\)/i,
  );
  assert.match(sql, /drop policy if exists "Staff can update companies"/i);
  assert.match(sql, /drop policy if exists "Staff can update contacts"/i);
  assert.match(sql, /drop policy if exists "PM can update assigned deal fields"/i);
  assert.match(sql, /drop policy if exists "Assigned user can update own task"/i);
  assert.doesNotMatch(sql, /create policy "PM[^"]*"[\s\S]{0,120}\bfor update\b/i);
  assert.doesNotMatch(sql, /create policy "Client[^"]*"[\s\S]{0,120}\bfor update\b/i);
});

test('0008 drops assignment-only task visibility', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /drop policy if exists "Assigned user can view task" on public\.tasks/i);
});

test('0008 scopes PM and client task reads through tenant relationships', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(
    sql,
    /create policy "Admin can view all tasks" on public\.tasks\s+for select using\s*\(\s*public\.is_admin\(\)\s*\)/i,
  );
  assert.match(
    sql,
    /create policy "PM can view tasks for assigned deals" on public\.tasks[\s\S]*for select using\s*\([\s\S]*public\.is_pm\(\)[\s\S]*deal_id is not null[\s\S]*from public\.deals[\s\S]*deal\.id\s*=\s*tasks\.deal_id[\s\S]*deal\.company_id\s*=\s*tasks\.company_id[\s\S]*deal\.owner_id\s*=\s*auth\.uid\(\)/i,
  );
  assert.match(
    sql,
    /create policy "Clients can view company tasks" on public\.tasks[\s\S]*for select using\s*\([\s\S]*public\.is_company_member\(company_id\)[\s\S]*deal_id is null[\s\S]*deal\.id\s*=\s*tasks\.deal_id[\s\S]*deal\.company_id\s*=\s*tasks\.company_id/i,
  );
});

test('0008 migrates legacy staff and validates the supported profile roles', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /update public\.profiles\s+set role = 'project_manager'\s+where role = 'staff'/i);
  assert.match(
    sql,
    /add constraint profiles_role_allowed_check[\s\S]*check\s*\(\s*role::text in\s*\(\s*'client'\s*,\s*'project_manager'\s*,\s*'admin'\s*\)\s*\)\s*not valid/i,
  );
  assert.match(
    sql,
    /alter table public\.profiles\s+validate constraint profiles_role_allowed_check/i,
  );
});

test('0008 keeps the obsolete is_staff helper unavailable to authenticated', async () => {
  const sql = await readFile(migrationPath, 'utf8');
  const createdPolicies = sql.match(/create policy[\s\S]*?;/gi) ?? [];

  assert.match(sql, /revoke all on function public\.is_staff\(\) from authenticated/i);
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.is_staff\(\) to authenticated/i,
  );
  assert.doesNotMatch(createdPolicies.join('\n'), /public\.is_staff\(\)/i);
});

test('admin role changes use the profile-authoritative RPC only', async () => {
  const action = await readFile('app/admin/users/actions.js', 'utf8');
  const changeRoleBody = action.slice(action.indexOf('export async function changeUserRole'));

  assert.match(action, /requireRole\(\['admin'\], '\/login\/admin'\)/);
  assert.match(changeRoleBody, /supabase\.rpc\('admin_set_user_role'/);
  assert.match(changeRoleBody, /p_user_id:\s*userId/);
  assert.match(changeRoleBody, /p_role:\s*role/);
  assert.match(changeRoleBody, /return \{ ok: false, error: 'Unable to update this role\.' \}/);
  assert.match(changeRoleBody, /return \{ ok: true, profile: data \}/);
  assert.doesNotMatch(changeRoleBody, /auth\.admin\.updateUserById|app_metadata|from\('profiles'\)\.update/);
});
