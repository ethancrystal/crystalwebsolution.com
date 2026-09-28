import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// Source contract for 0044. Behaviour (pin, promotion, single admin) is
// proven in supabase/tests/0044_pin_admin_to_moiz.test.sql under `pnpm test:db`.

const migrationPath = 'supabase/migrations/0044_pin_admin_to_moiz.sql';
const NEW_ADMIN = 'moizj00@gmail.com';
const PREVIOUS_ADMIN = 'ethan@cdsportswearinc.com';

function statementsOf(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

test('0044 pins the admin role to the owner-approved address and keeps the 0027 revoke', async () => {
  const statements = statementsOf(await readFile(migrationPath, 'utf8'));
  assert.match(statements, /create or replace function public\.pinned_admin_email\(\)/i);
  assert.match(statements, /SELECT 'moizj00@gmail\.com'::TEXT/);
  assert.match(statements, /set search_path to ''/);
  assert.match(
    statements,
    /revoke all on function public\.pinned_admin_email\(\)\s+from public,\s*anon,\s*authenticated/i,
  );
  assert.doesNotMatch(statements, new RegExp(`SELECT '${PREVIOUS_ADMIN.replace(/[.]/g, '\\.')}'::TEXT`));
});

test('0044 demotes the previous admin to project_manager before promoting, and never merges accounts', async () => {
  const statements = statementsOf(await readFile(migrationPath, 'utf8'));
  const demote = statements.indexOf("set role = 'project_manager'::public.user_role");
  const promote = statements.indexOf("set role = 'admin'::public.user_role");
  assert.ok(demote > 0 && promote > demote, 'demote runs before promote (profiles_single_admin_idx)');
  assert.match(statements, /id is distinct from v_new_id/);
  assert.match(statements, new RegExp(`v_new constant text := '${NEW_ADMIN.replace(/[.]/g, '\\.')}'`));
  assert.doesNotMatch(statements, /update auth\.users|update auth\.identities|delete from/i);
});

test('0044 is the latest definition of pinned_admin_email', async () => {
  const files = (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();
  const definers = [];
  for (const name of files) {
    const sql = statementsOf(await readFile(`supabase/migrations/${name}`, 'utf8'));
    if (/function public\.pinned_admin_email\(\)\s*\n?\s*returns/i.test(sql)) definers.push(name);
  }
  assert.equal(definers.at(-1), '0044_pin_admin_to_moiz.sql');
});
