import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SIGNUP_ACCOUNT_TYPES, ROLES } from '../../lib/auth/roles.mjs';

const migrationPath = 'supabase/migrations/0014_signup_account_type_and_single_admin.sql';

test('signup offers only client and employee, never admin', () => {
  assert.deepEqual([...SIGNUP_ACCOUNT_TYPES], ['client', 'employee']);
  assert.ok(!SIGNUP_ACCOUNT_TYPES.includes(ROLES.ADMIN));
  assert.ok(!SIGNUP_ACCOUNT_TYPES.includes('project_manager'));
});

test('0014 keeps handle_new_user hardcoded to client regardless of account_type', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  // The role column must be a literal, never read from user-controlled
  // metadata - this is the property that stops a crafted signup payload from
  // minting staff or admin.
  assert.match(
    sql,
    /insert into public\.profiles \(id, role, full_name, requested_staff_access\)[\s\S]*?'client',/i,
  );
  assert.doesNotMatch(sql, /role[\s\S]{0,80}raw_user_meta_data ->> 'account_type'/i);
  assert.match(sql, /account_type[\s\S]{0,120}= 'employee'/i);
});

test('0014 pins the admin role to one address and caps it at a single row', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create or replace function public\.pinned_admin_email/i);
  assert.match(sql, /ethan@crystalwebsolution\.com/i);
  assert.match(sql, /create unique index[\s\S]*?profiles_single_admin_idx[\s\S]*?where role = 'admin'/i);
  assert.match(sql, /create trigger enforce_pinned_admin_trigger/i);
  assert.match(sql, /before insert or update of role on public\.profiles/i);
  assert.match(sql, /only % may hold the admin role/i);
});

test('0014 staff approval grants project_manager only, behind an admin check', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /create or replace function public\.admin_resolve_staff_request/i);
  assert.match(sql, /not public\.is_admin\(\)[\s\S]*?raise exception/i);
  assert.match(sql, /then 'project_manager'::public\.user_role/i);
  assert.doesNotMatch(
    sql,
    /admin_resolve_staff_request[\s\S]*?then 'admin'::public\.user_role/i,
  );
  assert.match(sql, /set search_path = pg_catalog, public/i);
  assert.match(
    sql,
    /grant execute on function public\.admin_resolve_staff_request\(uuid, boolean\) to authenticated/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.admin_resolve_staff_request\(uuid, boolean\) from anon/i,
  );
});

test('the application never offers admin as an assignable or invitable role', async () => {
  const [actions, invitePage, usersPage] = await Promise.all([
    readFile('app/admin/users/actions.js', 'utf8'),
    readFile('app/admin/users/invite/page.jsx', 'utf8'),
    readFile('app/admin/users/page.jsx', 'utf8'),
  ]);

  assert.match(actions, /const ASSIGNABLE_ROLES = \['project_manager', 'client'\]/);
  assert.match(actions, /const INVITABLE_ROLES = \['project_manager'\]/);
  assert.doesNotMatch(invitePage, /<option value="admin">/);
  assert.doesNotMatch(usersPage, /ASSIGNABLE_ROLES = \[[^\]]*'admin'/);
});

test('signup rejects an unrecognised account type instead of coercing it', async () => {
  const actions = await readFile('app/auth/actions.js', 'utf8');

  assert.match(actions, /SIGNUP_ACCOUNT_TYPES\.includes\(accountType\)/);
  assert.match(actions, /account_type: accountType/);
});

test('a missing service-role key degrades to a message, not a server-render error', async () => {
  const [authActions, adminActions] = await Promise.all([
    readFile('app/auth/actions.js', 'utf8'),
    readFile('app/admin/users/actions.js', 'utf8'),
  ]);

  // createAdminClient() throws when SUPABASE_SERVICE_ROLE_KEY is unset; every
  // caller must catch it or Next.js renders an opaque digest to the user.
  const guarded = /try \{\s*adminClient = createAdminClient\(\);\s*\} catch/g;
  assert.equal(authActions.match(guarded)?.length, 3);
  assert.equal(adminActions.match(guarded)?.length, 1);
  assert.doesNotMatch(authActions, /const adminClient = createAdminClient\(\);/);
  assert.doesNotMatch(adminActions, /const adminClient = createAdminClient\(\);/);
});
