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

  assert.match(inviteUser, /buildVerifyUrl\(\{[^}]*next:\s*['"]\/auth\/reset-password['"]/);
  assert.match(inviteUser, /redirectTo:\s*`\$\{APP_URL\}\/auth\/callback\?next=\/auth\/reset-password`/);
  assert.doesNotMatch(inviteUser, /buildVerifyUrl\(\{[^}]*next:\s*['"]\/admin['"]/);
  assert.doesNotMatch(inviteUser, /callback\?next=\/admin`/);
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
