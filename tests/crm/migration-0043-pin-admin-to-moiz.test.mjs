import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0043_pin_admin_to_moiz.sql';
const NEW_ADMIN = 'moizj00@gmail.com';
const OLD_ADMIN = 'ethan@cdsportswearinc.com';

function statementsOf(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

test('0043 moves pinned_admin_email to the owner-approved address and keeps 0015/0027 contracts', async () => {
  const statements = statementsOf(await readFile(migrationPath, 'utf8'));

  assert.match(statements, /create or replace function public\.pinned_admin_email\(\)/i);
  assert.match(statements, /SELECT 'moizj00@gmail\.com'::TEXT/);
  assert.match(statements, /set search_path to ''/);
  assert.match(
    statements,
    /revoke all on function public\.pinned_admin_email\(\)\s+from public,\s*anon,\s*authenticated/i,
  );
  assert.doesNotMatch(statements, new RegExp(`SELECT '${OLD_ADMIN.replace(/[.@]/g, '\$&')}'::TEXT`));
});

test('0043 keeps a single admin: demote others before promoting the pin, never rename accounts', async () => {
  const statements = statementsOf(await readFile(migrationPath, 'utf8'));

  const demote = statements.search(/set role = 'project_manager'::public\.user_role/);
  const promote = statements.search(/set role = 'admin'::public\.user_role/);
  assert.ok(demote > -1 && promote > -1, 'both demote and promote statements are present');
  assert.ok(demote < promote, 'demote must run before promote (profiles_single_admin_idx)');
  assert.match(statements, /id is distinct from v_new_id/);
  assert.match(statements, new RegExp(`v_new constant text := '${NEW_ADMIN.replace(/[.@]/g, '\$&')}'`));
  assert.doesNotMatch(statements, /update auth\.users/);
  assert.doesNotMatch(statements, /drop index|profiles_single_admin_idx\s*;|drop trigger/i);
});

test('the test-user provisioning script targets the pinned admin', async () => {
  const script = await readFile('scripts/provision-crm-test-users.mjs', 'utf8');
  assert.match(script, new RegExp(`const ADMIN_EMAIL = '${NEW_ADMIN.replace(/[.@]/g, '\$&')}'`));
});
