import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0044_onboard_client_existing_contact.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('reuses an existing contact when auth email already exists', async () => {
  const sql = await readMigration();
  assert.match(sql, /lower\(c\.email\)\s*=\s*pg_catalog\.lower\(v_email\)/i);
  assert.match(sql, /IF v_existing_contact_id IS NOT NULL THEN/i);
  assert.match(sql, /UPDATE public\.contacts/i);
  assert.match(sql, /INSERT INTO public\.companies/i);
});

test('serializes onboarding for the same email with a transaction advisory lock', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /pg_advisory_xact_lock\(\s*pg_catalog\.hashtext\('onboard_client_company'\),\s*pg_catalog\.hashtext\(pg_catalog\.lower\(v_email\)\)\s*\)/i,
  );
  assert.doesNotMatch(sql, /pg_advisory_lock\(/i);
});

test('marks trusted profile writes before updating profiles.company_id', async () => {
  const sql = await readMigration();
  const guc = sql.indexOf("set_config('crm.trusted_profile_write', '1', true)");
  const profileUpdate = sql.indexOf('SET company_id = v_company_id');
  assert.ok(guc !== -1 && profileUpdate !== -1);
  assert.ok(guc < profileUpdate, 'GUC must be set before the profiles update');
  assert.match(sql, /crm\.trusted_profile_write['"], true\) = '1'/);
});

test('upserts company_members and preserves last-admin guards on admin_set_user_role', async () => {
  const sql = await readMigration();
  assert.match(sql, /ON CONFLICT \(company_id, user_id\) DO UPDATE/i);
  assert.match(sql, /The last admin cannot be demoted/i);
  assert.match(sql, /Admins cannot change their own role/i);
});

test('keeps both onboard_client_company overloads executable by authenticated', async () => {
  const sql = await readMigration();
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.onboard_client_company\(TEXT, TEXT, TEXT\) TO authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.onboard_client_company\(TEXT, TEXT\) TO authenticated/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.onboard_client_company\(TEXT, TEXT, TEXT\) FROM anon/i);
});
