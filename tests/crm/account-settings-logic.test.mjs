import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  MAX_DISPLAY_NAME_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  validateDisplayName,
  validatePasswordChange,
} from '../../lib/crm/account.mjs';
import { DASHBOARD_TAB_CHOICES, isValidDefaultTab, readPrefs, writePrefs } from '../../lib/crm/prefs.mjs';

function fakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => { data.set(key, value); },
    removeItem: (key) => { data.delete(key); },
  };
}

test('display names are trimmed and collapsed, and bounded', () => {
  assert.deepEqual(validateDisplayName('  Ethan   Ray \n'), { ok: true, value: 'Ethan Ray' });
  assert.equal(validateDisplayName('').ok, false);
  assert.equal(validateDisplayName('   ').ok, false);
  assert.equal(validateDisplayName(null).ok, false);
  assert.equal(validateDisplayName('x'.repeat(MAX_DISPLAY_NAME_LENGTH)).ok, true);
  assert.equal(validateDisplayName('x'.repeat(MAX_DISPLAY_NAME_LENGTH + 1)).ok, false);
  assert.equal(validateDisplayName('Ethan\u0007Ray').ok, false);
});

test('password changes need the current password, a long-enough new one that matches, and a change', () => {
  const ok = { current: 'old-password', next: 'new-password', confirm: 'new-password' };
  assert.deepEqual(validatePasswordChange(ok), { ok: true });
  assert.match(validatePasswordChange({ ...ok, current: '' }).error, /current password/);
  assert.match(validatePasswordChange({ ...ok, next: 'a'.repeat(MIN_PASSWORD_LENGTH - 1), confirm: 'a'.repeat(MIN_PASSWORD_LENGTH - 1) }).error, /at least/);
  assert.match(validatePasswordChange({ ...ok, next: 'a'.repeat(MAX_PASSWORD_LENGTH + 1), confirm: 'a'.repeat(MAX_PASSWORD_LENGTH + 1) }).error, /or fewer/);
  assert.match(validatePasswordChange({ ...ok, confirm: 'different' }).error, /do not match/);
  assert.match(validatePasswordChange({ current: 'same-password', next: 'same-password', confirm: 'same-password' }).error, /different/);
});

test('the password floor matches the reset-password form', async () => {
  const form = await readFile('app/auth/reset-password/page.jsx', 'utf8');
  assert.match(form, new RegExp(`minLength=\\{${MIN_PASSWORD_LENGTH}\\}`));
});

test('every role offers its dashboard\'s own tabs, and the first is that dashboard\'s default', () => {
  assert.deepEqual(DASHBOARD_TAB_CHOICES.admin.map((c) => c.id), ['needs-action', 'projects', 'crm']);
  assert.deepEqual(DASHBOARD_TAB_CHOICES.project_manager.map((c) => c.id), ['needs-you', 'projects']);
  assert.deepEqual(DASHBOARD_TAB_CHOICES.client.map((c) => c.id), ['overview', 'messages', 'files', 'tasks', 'brief']);
  assert.equal(isValidDefaultTab('admin', 'crm'), true);
  assert.equal(isValidDefaultTab('admin', 'needs-you'), false);
  assert.equal(isValidDefaultTab('nobody', 'crm'), false);
});

test('preferences are per user and per role, validated, and clearable', () => {
  const storage = fakeStorage();
  assert.equal(writePrefs(storage, 'u1', 'admin', { defaultTab: 'crm' }), true);
  assert.deepEqual(readPrefs(storage, 'u1', 'admin'), { defaultTab: 'crm' });
  assert.deepEqual(readPrefs(storage, 'u2', 'admin'), { defaultTab: null });
  // A saved value that is not a tab for the role reads as no preference.
  assert.deepEqual(readPrefs(storage, 'u1', 'project_manager'), { defaultTab: null });
  assert.equal(writePrefs(storage, 'u1', 'admin', { defaultTab: 'bogus' }), false);
  assert.deepEqual(readPrefs(storage, 'u1', 'admin'), { defaultTab: 'crm' });
  assert.equal(writePrefs(storage, 'u1', 'admin', { defaultTab: null }), true);
  assert.deepEqual(readPrefs(storage, 'u1', 'admin'), { defaultTab: null });
  assert.equal(storage.data.size, 0);
});

test('storage that is missing, corrupt or throwing never breaks a page', () => {
  assert.deepEqual(readPrefs(null, 'u1', 'admin'), { defaultTab: null });
  assert.deepEqual(readPrefs(fakeStorage({ 'crm-prefs:u1': '{not json' }), 'u1', 'admin'), { defaultTab: null });
  assert.deepEqual(readPrefs(fakeStorage(), null, 'admin'), { defaultTab: null });
  const throwing = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('full'); },
    removeItem() { throw new Error('blocked'); },
  };
  assert.deepEqual(readPrefs(throwing, 'u1', 'admin'), { defaultTab: null });
  assert.equal(writePrefs(throwing, 'u1', 'admin', { defaultTab: 'crm' }), false);
  assert.equal(writePrefs(null, 'u1', 'admin', { defaultTab: 'crm' }), false);
});

test('settings routes exist for every role and each portal nav links to its own', async () => {
  const shell = await readFile('components/crm/WorkspaceShell.jsx', 'utf8');
  for (const [dir, role] of [['dashboard', 'client'], ['team', 'project_manager'], ['admin', 'admin']]) {
    const page = await readFile(`app/${dir}/settings/page.jsx`, 'utf8');
    assert.match(page, new RegExp(`<SettingsScreen role="${role}" />`), dir);
    assert.match(shell, new RegExp(`href: '/${dir}/settings', label: 'Settings'`), dir);
  }
});

test('the settings screen reads the account from the session, never the URL', async () => {
  const screen = await readFile('components/crm/SettingsScreen.jsx', 'utf8');
  assert.match(screen, /getAuthenticatedProfile\(\)/);
  assert.match(screen, /authenticated\.profile\.role !== role/);
  assert.doesNotMatch(screen, /searchParams|params\./);
  const actions = await readFile('app/actions/account-actions.js', 'utf8');
  assert.match(actions, /\.eq\('id', authenticated\.user\.id\)/);
  assert.doesNotMatch(actions, /formString\(formData, '(userId|id|role|email)'\)/);
});
