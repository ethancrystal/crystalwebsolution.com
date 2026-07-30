import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { homeForRole } from './roles.mjs';

function loginWithConfigurationError(loginPath) {
  return `${loginPath}?error=configuration`;
}

export async function getAuthenticatedProfile() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, company_id, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) return null;
  return { user, profile };
}

export async function requireRole(allowedRoles, loginPath) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    redirect(loginWithConfigurationError(loginPath));
  }

  const authenticated = await getAuthenticatedProfile();
  if (!authenticated || !allowedRoles.includes(authenticated.profile.role)) {
    redirect(loginPath);
  }

  return authenticated;
}

export function redirectHomeForRole(role) {
  redirect(homeForRole(role) ?? '/login');
}
