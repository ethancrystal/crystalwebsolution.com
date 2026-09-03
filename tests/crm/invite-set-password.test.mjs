import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { portalForPath, safeAuthNext } from '../../lib/auth/roles.mjs';

// Extracts one top-level `export async function <name>` body so assertions
// stay scoped to that function instead of running to end of file.
function exportedFunction(source, name) {
  const start = source.indexOf(`export async function ${name}(`);
  assert.notEqual(start, -1, `${name} not found`);
  const nextExport = source.indexOf('\nexport ', start + 1);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

// The invite email promises "Set your password to activate your account".
// The only page that lets a signed-in user do that is /auth/reset-password,
// so the one-time verify link must land there - not on a portal home, where
// the invitee ends up signed in via the magic link with no password at all.
test('admin invite link sends the invitee to the set-password page', async () => {
  const actions = await readFile('app/admin/users/actions.js', 'utf8');
  const inviteUser = exportedFunction(actions, 'inviteUser');

  assert.match(actions, /const INVITE_NEXT = ['"]\/auth\/reset-password(\?[^'"]*)?['"]/);
  assert.match(inviteUser, /buildVerifyUrl\(\{[^}]*next:\s*INVITE_NEXT/);
  assert.match(inviteUser, /redirectTo:\s*`\$\{APP_URL\}\/auth\/callback\?next=\$\{encodeURIComponent\(INVITE_NEXT\)\}`/);
  assert.doesNotMatch(inviteUser, /next:\s*['"]\/admin['"]/);
  assert.doesNotMatch(inviteUser, /callback\?next=\/admin/);
});

// updatePassword() reads profiles.role to choose the invitee's portal home,
// so the role must be assigned before the email that carries the link is
// sent - not after.
test('admin invite assigns the role before sending the invite email', async () => {
  const actions = await readFile('app/admin/users/actions.js', 'utf8');
  const inviteUser = exportedFunction(actions, 'inviteUser');

  const roleAt = inviteUser.indexOf("rpc('admin_set_user_role'");
  const sendAt = inviteUser.indexOf('sendTemplate(');
  assert.notEqual(roleAt, -1);
  assert.notEqual(sendAt, -1);
  assert.ok(roleAt < sendAt, 'admin_set_user_role must run before sendTemplate');
});

// The verify route only honours `next` targets safeAuthNext() allows, and
// the middleware only bounces signed-in users off portal paths. Both must
// keep treating /auth/reset-password as a neutral, non-portal page.
test('the set-password page is an allowed, non-portal post-auth target', () => {
  assert.equal(safeAuthNext('/auth/reset-password'), '/auth/reset-password');
  assert.equal(portalForPath('/auth/reset-password'), null);
});

// After an invited project manager (or the admin) sets a password they must
// land on their own portal home. A hardcoded /dashboard only works for
// clients and otherwise relies on the middleware bouncing them elsewhere.
test('updatePassword redirects by role rather than to a hardcoded client home', async () => {
  const actions = await readFile('app/auth/actions.js', 'utf8');
  const updatePassword = exportedFunction(actions, 'updatePassword');

  assert.match(updatePassword, /from\(['"]profiles['"]\)/);
  assert.match(updatePassword, /homeForRole\(/);
  assert.doesNotMatch(updatePassword, /redirect\(['"]\/dashboard['"]\)/);
});

/* ----------------------------------------------- must-set-password gate */

const gateMigration = 'supabase/migrations/0039_must_set_password_gate.sql';

// Whether an account has a password is a fact only auth.users knows. The
// gate derives it there through a hardened RPC instead of keeping a copy in
// profiles that a user could clear through the "update own profile" policy.
test('0039 exposes a hardened RPC that reports whether the caller still has no password', async () => {
  const sql = await readFile(gateMigration, 'utf8');

  assert.match(sql, /create or replace function public\.current_user_must_set_password\(\)/i);
  assert.match(sql, /returns boolean/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public/i);
  assert.match(sql, /from auth\.users/i);
  assert.match(sql, /encrypted_password/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.match(sql, /revoke all on function public\.current_user_must_set_password\(\) from public/i);
  assert.match(sql, /revoke all on function public\.current_user_must_set_password\(\) from anon/i);
  assert.match(sql, /grant execute on function public\.current_user_must_set_password\(\) to authenticated/i);
  assert.doesNotMatch(sql, /grant execute .* to anon/i);
});

// A signed-in user with no password (an invitee who skipped the form) must
// not be able to use any portal until they set one.
test('middleware sends password-less users on portal paths to the set-password page', async () => {
  const middleware = await readFile('middleware.js', 'utf8');

  assert.match(middleware, /rpc\(['"]current_user_must_set_password['"]\)/);
  assert.match(middleware, /\/auth\/reset-password\?reason=invite/);
  // The gate must sit inside the `if (protectedPortal)` block - before the
  // /login, /signup, /forgot-password bounce that follows it - so it only
  // ever fires on portal paths and never on /auth/* itself (a loop).
  const gateAt = middleware.indexOf("rpc('current_user_must_set_password')");
  const portalBlockAt = middleware.indexOf('if (protectedPortal) {');
  const loginBounceAt = middleware.indexOf("pathname === '/login'");
  assert.ok(portalBlockAt !== -1 && loginBounceAt !== -1);
  assert.ok(gateAt > portalBlockAt, 'gate must be inside the protectedPortal block');
  assert.ok(gateAt < loginBounceAt, 'gate must run before the login/signup bounce');
  // Fails open with a log line, never closed: a missing migration must not
  // lock every portal.
  assert.match(middleware, /if \(passwordCheckError\)\s*\{\s*console\.error/);
});

test('admin invite link tells the set-password page it is an invite', async () => {
  const actions = await readFile('app/admin/users/actions.js', 'utf8');
  const inviteUser = exportedFunction(actions, 'inviteUser');

  assert.match(actions, /const INVITE_NEXT = ['"]\/auth\/reset-password\?reason=invite['"]/);
  assert.match(inviteUser, /next:\s*INVITE_NEXT/);
  assert.equal(safeAuthNext('/auth/reset-password?reason=invite'), '/auth/reset-password?reason=invite');
});

test('set-password page shows invite copy instead of reset copy for invitees', async () => {
  const page = await readFile('app/auth/reset-password/page.jsx', 'utf8');

  assert.match(page, /useSearchParams/);
  assert.match(page, /reason['"]?\)?\s*===?\s*['"]invite['"]/);
  assert.match(page, /activate your account/i);
  // The Suspense fallback must render the real form (reset copy), not null:
  // a null fallback prerenders an empty shell and invitees get a blank page
  // until hydration.
  assert.match(page, /<Suspense fallback=\{<ResetPasswordForm copy=\{COPY\.reset\} \/>\}>/);
  assert.doesNotMatch(page, /fallback=\{null\}/);
});
