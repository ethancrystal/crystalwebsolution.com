'use server';

import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';

import { friendlyAuthError } from '@/lib/auth-errors';
import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import { validateDisplayName, validatePasswordChange } from '@/lib/crm/account.mjs';
import { sendTemplate } from '@/lib/email/resend';
import { passwordChangedEmail } from '@/lib/email/templates';
import { checkAuthRateLimit } from '@/lib/rateLimit.mjs';
import { createClient } from '@/lib/supabase/server';

// Account settings for the signed-in person, any role: display name and
// password. Both act only on the caller's own account, which is read from the
// session, never from the form.

function formString(formData, name) {
  const value = formData?.get(name);
  return typeof value === 'string' ? value : '';
}

function revalidatePortals() {
  revalidatePath('/dashboard');
  revalidatePath('/team');
  revalidatePath('/admin');
}

// profiles RLS lets a user update their own row; the guard trigger from 0046
// still blocks role, company and staff-request changes, so only the name is
// written here. `.select()` makes a zero-row update visible instead of
// reporting a success that changed nothing.
export async function updateDisplayName(formData) {
  const authenticated = await getAuthenticatedProfile();
  if (!authenticated) return { ok: false, error: 'You need to sign in again.' };

  const checked = validateDisplayName(formString(formData, 'fullName'));
  if (!checked.ok) return { ok: false, error: checked.error };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({ full_name: checked.value })
    .eq('id', authenticated.user.id)
    .select('id')
    .maybeSingle();

  if (error || !data) {
    console.error('Display name update failed', { code: typeof error?.code === 'string' ? error.code : 'NO_ROW' });
    return { ok: false, error: 'Unable to save your name. Please try again.' };
  }

  // Emails address people by the auth metadata name; keep it in step. Best
  // effort: the profile row above is what the portal reads.
  try {
    await supabase.auth.updateUser({ data: { full_name: checked.value } });
  } catch {
    // The profile name is saved; the metadata copy catches up on next save.
  }

  revalidatePortals();
  return { ok: true, data: { fullName: checked.value } };
}

// The current password is checked first, so a stolen or left-open session
// alone cannot change it. That check is rate limited per account and
// connection, like sign-in.
export async function changePassword(formData) {
  const authenticated = await getAuthenticatedProfile();
  if (!authenticated?.user?.email) return { ok: false, error: 'You need to sign in again.' };
  const { user } = authenticated;

  const current = formString(formData, 'currentPassword');
  const next = formString(formData, 'newPassword');
  const checked = validatePasswordChange({ current, next, confirm: formString(formData, 'confirmPassword') });
  if (!checked.ok) return { ok: false, error: checked.error };

  const allowed = await checkAuthRateLimit('auth:change-password', user.id, await headers(), {
    limit: 5,
    windowSeconds: 600,
  });
  if (!allowed) {
    return { ok: false, error: 'Too many attempts. Please wait a few minutes and try again.' };
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (verifyError) return { ok: false, error: 'Your current password is not correct.' };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { ok: false, error: friendlyAuthError(error.message) };

  // Security notice, best effort: a change that succeeded must not be
  // reported as a failure because the notification could not be sent.
  try {
    const { subject, html } = passwordChangedEmail({ fullName: user.user_metadata?.full_name });
    await sendTemplate({ subject, html }, { to: user.email, tags: ['password-changed'] });
  } catch (sendError) {
    console.error('Failed to send password change notification:', sendError);
  }

  return { ok: true };
}
