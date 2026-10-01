// @vitest-environment node
//
// The real account Server Actions with auth, Supabase, rate limiting and
// email mocked: they act only on the session's own account, check the
// current password before changing it, are throttled, and never report a
// failure for a change that succeeded.

import { describe, it, expect, vi, beforeEach } from 'vitest';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'casey@example.test', user_metadata: { full_name: 'Casey' } };

let authenticated;
let allowed;
const calls = { update: [], eq: [], signIn: [], updateUser: [], email: [], rateLimit: [] };
let updateResult;
let signInResult;
let updateUserResult;
let emailThrows = false;

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('@/lib/auth/require-role', () => ({ getAuthenticatedProfile: async () => authenticated }));
vi.mock('@/lib/rateLimit.mjs', () => ({
  checkAuthRateLimit: async (...args) => {
    calls.rateLimit.push(args.slice(0, 2));
    return allowed;
  },
}));
vi.mock('@/lib/email/resend', () => ({
  sendTemplate: async (...args) => {
    if (emailThrows) throw new Error('resend is down');
    calls.email.push(args);
  },
}));
vi.mock('@/lib/email/templates', () => ({ passwordChangedEmail: () => ({ subject: 'Password changed', html: '<p>changed</p>' }) }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: () => ({
      update: (values) => {
        calls.update.push(values);
        return {
          eq: (column, value) => {
            calls.eq.push([column, value]);
            return { select: () => ({ maybeSingle: async () => updateResult }) };
          },
        };
      },
    }),
    auth: {
      signInWithPassword: async (args) => { calls.signIn.push(args); return signInResult; },
      updateUser: async (args) => { calls.updateUser.push(args); return updateUserResult; },
    },
  }),
}));

const { updateDisplayName, changePassword } = await import('@/app/actions/account-actions');

function form(values) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

beforeEach(() => {
  authenticated = { user: USER, profile: { id: USER.id, role: 'client', company_id: 'c1', full_name: 'Casey' } };
  allowed = true;
  for (const key of Object.keys(calls)) calls[key] = [];
  updateResult = { data: { id: USER.id }, error: null };
  signInResult = { data: {}, error: null };
  updateUserResult = { data: {}, error: null };
  emailThrows = false;
});

describe('updateDisplayName', () => {
  it('saves the cleaned name on the signed-in user\'s own row, and only the name', async () => {
    const result = await updateDisplayName(form({ fullName: '  Casey   Jones ', id: 'someone-else', role: 'admin' }));
    expect(result).toEqual({ ok: true, data: { fullName: 'Casey Jones' } });
    expect(calls.update).toEqual([{ full_name: 'Casey Jones' }]);
    expect(calls.eq).toEqual([['id', USER.id]]);
    expect(calls.updateUser).toEqual([{ data: { full_name: 'Casey Jones' } }]);
  });

  it('refuses a blank name, and a signed-out caller, without writing', async () => {
    expect((await updateDisplayName(form({ fullName: '   ' }))).ok).toBe(false);
    authenticated = null;
    expect((await updateDisplayName(form({ fullName: 'Casey' }))).ok).toBe(false);
    expect(calls.update).toEqual([]);
  });

  it('reports a failure when no row was updated, instead of a false success', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    updateResult = { data: null, error: null };
    const result = await updateDisplayName(form({ fullName: 'Casey' }));
    expect(result.ok).toBe(false);
    expect(calls.updateUser).toEqual([]);
    error.mockRestore();
  });

  it('still succeeds when the auth metadata copy cannot be updated', async () => {
    updateUserResult = { data: null, error: new Error('offline') };
    expect((await updateDisplayName(form({ fullName: 'Casey' }))).ok).toBe(true);
  });
});

describe('changePassword', () => {
  const GOOD = { currentPassword: 'old-password', newPassword: 'new-password', confirmPassword: 'new-password' };

  it('verifies the current password, then changes it, then sends a security notice', async () => {
    const result = await changePassword(form(GOOD));
    expect(result).toEqual({ ok: true });
    expect(calls.signIn).toEqual([{ email: USER.email, password: 'old-password' }]);
    expect(calls.updateUser).toEqual([{ password: 'new-password' }]);
    expect(calls.email).toHaveLength(1);
    expect(calls.email[0][1]).toMatchObject({ to: USER.email, tags: ['password-changed'] });
  });

  it('does not change anything when the current password is wrong', async () => {
    signInResult = { data: null, error: { message: 'Invalid login credentials' } };
    const result = await changePassword(form(GOOD));
    expect(result).toEqual({ ok: false, error: 'Your current password is not correct.' });
    expect(calls.updateUser).toEqual([]);
    expect(calls.email).toEqual([]);
  });

  it('is throttled per account before the password is even checked', async () => {
    allowed = false;
    const result = await changePassword(form(GOOD));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Too many attempts/);
    expect(calls.rateLimit).toEqual([['auth:change-password', USER.id]]);
    expect(calls.signIn).toEqual([]);
  });

  it('rejects mismatches, short passwords and unchanged passwords before any auth call', async () => {
    for (const bad of [
      { ...GOOD, confirmPassword: 'other' },
      { ...GOOD, newPassword: 'abc', confirmPassword: 'abc' },
      { currentPassword: 'same-password', newPassword: 'same-password', confirmPassword: 'same-password' },
      { ...GOOD, currentPassword: '' },
    ]) {
      expect((await changePassword(form(bad))).ok).toBe(false);
    }
    expect(calls.signIn).toEqual([]);
    expect(calls.rateLimit).toEqual([]);
  });

  it('relays the auth error when the update itself fails, with no notice sent', async () => {
    updateUserResult = { data: null, error: { message: 'Password should be at least 6 characters' } };
    const result = await changePassword(form(GOOD));
    expect(result.ok).toBe(false);
    expect(calls.email).toEqual([]);
  });

  it('a failed notification email never turns a successful change into an error', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    emailThrows = true;
    const result = await changePassword(form(GOOD));
    expect(result).toEqual({ ok: true });
    expect(calls.updateUser).toEqual([{ password: 'new-password' }]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('refuses a signed-out caller', async () => {
    authenticated = null;
    expect((await changePassword(form(GOOD))).ok).toBe(false);
    expect(calls.signIn).toEqual([]);
  });
});
