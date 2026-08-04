'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient, buildVerifyUrl } from '@/lib/supabase/admin';
import { friendlyAuthError } from '@/lib/auth-errors';
import { sendTemplate } from '@/lib/email/resend';
import {
  confirmSignupEmail,
  resetPasswordEmail,
  passwordChangedEmail,
} from '@/lib/email/templates';
import {
  getPortal,
  isRoleAllowed,
  safeNextForPortal,
  homeForRole,
  SIGNUP_ACCOUNT_TYPES,
} from '@/lib/auth/roles.mjs';
import { redirect } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function signUp(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const fullName = formData.get('fullName');
  const accountType = formData.get('accountType');

  if (!email || !password || !fullName) {
    return { error: 'Missing required fields' };
  }

  // Only the two self-service choices are accepted. account_type never
  // becomes a role - handle_new_user() hardcodes 'client' and reads this
  // solely to raise profiles.requested_staff_access, which an admin must
  // approve before it grants anything (0014). Anything unrecognised is
  // rejected here rather than silently coerced.
  if (!SIGNUP_ACCOUNT_TYPES.includes(accountType)) {
    return { error: 'Choose whether this is a client or employee account.' };
  }

  // Uses generateLink() + Resend instead of the anon client's signUp(),
  // which would send Supabase's own confirmation email - see
  // lib/email/resend.js for why every auth-flow email goes through here.
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (configError) {
    // A missing SUPABASE_SERVICE_ROLE_KEY would otherwise throw straight out
    // of the action, which Next.js renders as an opaque "error occurred in
    // the Server Components render" digest on the signup form.
    console.error('Signup unavailable - admin client misconfigured:', configError);
    return { error: 'Signup is temporarily unavailable. Please try again later.' };
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    password,
    options: {
      data: { full_name: fullName, account_type: accountType },
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
    await sendTemplate({ subject, html }, { to: email, tags: ['signup-confirm'] });
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

  const allowedNext = safeNextForPortal(portalName, next);

  redirect(allowedNext ?? homeForRole(profile.role));
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

// Mirrors signUp(): generateLink() + Resend so the resent message is the
// same branded template as the original, instead of Supabase's default one.
// Always reports success so the endpoint cannot be used to enumerate which
// addresses have an unconfirmed account.
export async function resendConfirmationEmail(formData) {
  const email = formData.get('email');

  if (!email) {
    return { error: 'Email is required' };
  }

  // Mirrors signUp()'s guard. Reports the same generic success as every other
  // outcome here so a misconfiguration cannot be used to probe for accounts.
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (configError) {
    console.error('Resend confirmation unavailable - admin client misconfigured:', configError);
    return { success: true };
  }

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'signup',
    email,
    options: {
      redirectTo: `${APP_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (!error) {
    const { subject, html } = confirmSignupEmail({
      confirmUrl: buildVerifyUrl({ properties: data.properties, next: '/dashboard' }),
      fullName: data.user?.user_metadata?.full_name,
    });

    try {
      await sendTemplate({ subject, html }, { to: email, tags: ['signup-confirm'] });
    } catch (sendError) {
      console.error('Failed to resend confirmation email:', sendError);
    }
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
  // Same guard and same unconditional success as above, for the same
  // anti-enumeration reason.
  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (configError) {
    console.error('Password reset unavailable - admin client misconfigured:', configError);
    return { success: true };
  }

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
      await sendTemplate({ subject, html }, { to: email, tags: ['password-reset'] });
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  // Security notice - best effort. A password change that succeeded must not
  // be reported as a failure just because the notification could not be sent.
  if (user?.email) {
    try {
      const { subject, html } = passwordChangedEmail({
        fullName: user.user_metadata?.full_name,
      });
      await sendTemplate({ subject, html }, { to: user.email, tags: ['password-changed'] });
    } catch (sendError) {
      console.error('Failed to send password change notification:', sendError);
    }
  }

  redirect('/dashboard');
}
