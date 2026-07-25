'use server';

import { createClient } from '@/lib/supabase/server';
import { friendlyAuthError } from '@/lib/auth-errors';
import { redirect } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

export async function signUp(formData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const fullName = formData.get('fullName');

  if (!email || !password || !fullName) {
    return { error: 'Missing required fields' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${APP_URL}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect(`/auth/confirm?email=${encodeURIComponent(email)}`);
}

export async function signIn(formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { error: 'Missing email or password' };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
  }

  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
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

  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${APP_URL}/auth/callback?next=/auth/reset-password`,
  });

  if (error) {
    return { error: friendlyAuthError(error.message) };
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
