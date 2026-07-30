'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient, buildVerifyUrl } from '@/lib/supabase/admin';
import { friendlyAuthError } from '@/lib/auth-errors';
import { sendEmail } from '@/lib/email/resend';
import { confirmSignupEmail, resetPasswordEmail } from '@/lib/email/templates';
import { getPortal, isRoleAllowed, portalForPath, homeForRole } from '@/lib/auth/roles.mjs';
import { redirect } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function signUp(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const fullName = formData.get('fullName');

  if (!email || !password || !fullName) {
    return { error: 'Missing required fields' };
  }

  // Uses generateLink() + Resend instead of the anon client's signUp(),
  // which would send Supabase's own confirmation email - see
  // lib/email/resend.js for why every auth-flow email goes through here.
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: { full_name: fullName },
      redirectTo: `${APP_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  const { subject, html } = confirmSignupEmail({
    confirmUrl: buildVerifyUrl({ properties: data.properties, next: '/dashboard' }),
    fullName,
  });

  try {
    await sendEmail({ to: email, subject, html });
  } catch (sendError) {
    console.error('Failed to send signup confirmation email:', sendError);
    return {
      error: 'Account created, but the confirmation email failed to send. Use "Resend confirmation" to try again.',
    };
  }

  redirect(`/auth/confirm?email=${encodeURIComponent(email)}`);
}

export async function signIn(formData) {
  const portalName = formData.get('portal');
  const email = formData.get('email');
  const password = formData.get('password');
  const next = formData.get('next');
  const portal = getPortal(portalName);

  if (!portal || !email || !password) {
    return { error: 'Missing email or password' };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !user) {
    return { error: friendlyAuthError(error?.message ?? 'Unable to sign in') };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, company_id, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || !isRoleAllowed(portalName, profile.role)) {
    await supabase.auth.signOut();
    redirect(`${portal.login}?error=portal`);
  }

  const isAllowedNext = typeof next === 'string'
    && next.startsWith('/')
    && !next.startsWith('//')
    && isRoleAllowed(portalForPath(next), profile.role);

  redirect(isAllowedNext ? next : homeForRole(profile.role));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { user, profile };
}

// Still on Supabase's built-in resend (not yet migrated to
// generateLink()/Resend like signUp() above) - it uses Supabase's default
// confirmation template rather than lib/email/templates.js's branded one.
export async function resendConfirmationEmail(formData) {
  const email = formData.get('email');

  if (!email) {
    return { error: 'Email is required' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${APP_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  return { success: true };
}

export async function requestPasswordReset(formData) {
  const email = formData.get('email');

  if (!email) {
    return { error: 'Email is required' };
  }

  // Uses generateLink() + Resend instead of resetPasswordForEmail(), same
  // reasoning as signUp() above. resetPasswordForEmail() never revealed
  // whether an account exists for a given email (anti-enumeration); we
  // preserve that by always returning success regardless of what
  // generateLink() reports, and only sending mail when it found a user.
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: {
      redirectTo: `${APP_URL}/auth/callback?next=/auth/reset-password`,
    },
  });

  if (!error) {
    const { subject, html } = resetPasswordEmail({
      resetUrl: buildVerifyUrl({ properties: data.properties, next: '/auth/reset-password' }),
    });

    try {
      await sendEmail({ to: email, subject, html });
    } catch (sendError) {
      console.error('Failed to send password reset email:', sendError);
    }
  }

  return { success: true };
}

export async function updatePassword(formData) {
  const password = formData.get('password');

  if (!password) {
    return { error: 'Password is required' };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect('/dashboard');
}
