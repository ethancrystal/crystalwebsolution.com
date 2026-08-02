'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient, buildVerifyUrl } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { inviteUserEmail } from '@/lib/email/templates';
import { requireRole } from '@/lib/auth/require-role';
import { redirect } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const ASSIGNABLE_ROLES = ['admin', 'project_manager'];

async function requireAdmin() {
  return requireRole(['admin'], '/login/admin');
}

// Account creation is admin-only (0005_pm_scoping_and_project_type.sql -
// "Admin assign" model, confirmed mid-plan-review). Uses
// auth.admin.generateLink({type: 'invite'}) + Resend rather than
// inviteUserByEmail() (which sends Supabase's own invite email) or
// createUser() - the invited PM/admin still sets their own password via the
// emailed link, matching the self-service password flow app/signup already
// uses for clients. See lib/email/resend.js for why every auth-flow email
// goes through here.
export async function inviteUser(formData) {
  await requireAdmin();
  const supabase = await createClient();

  const email = formData.get('email');
  const fullName = formData.get('fullName');
  const role = formData.get('role');

  if (!email || !fullName || !role) {
    return { error: 'Missing required fields' };
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { error: 'Invalid role' };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: `${APP_URL}/auth/callback?next=/admin`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  const { subject, html } = inviteUserEmail({
    inviteUrl: buildVerifyUrl({ properties: data.properties, next: '/admin' }),
    fullName,
    role,
  });

  try {
    await sendEmail({ to: email, subject, html });
  } catch (sendError) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => null);
    return { error: `Invite created, but the email failed to send: ${sendError.message}` };
  }

  // The auth trigger creates a client profile. Promote invited staff through
  // the same validated command used by subsequent role changes.
  const { error: roleError } = await supabase.rpc('admin_set_user_role', {
    p_user_id: data.user.id,
    p_role: role,
  });

  if (roleError) {
    await supabase.auth.admin.deleteUser(data.user.id).catch(() => null);
    return { error: 'Invite sent, but role assignment failed.' };
  }

  redirect('/admin/users');
}

// Reassigns an existing account through the database's validated command.
export async function changeUserRole(formData) {
  await requireAdmin();

  const userId = formData.get('userId');
  const role = formData.get('role');

  if (!userId || !role) {
    return { ok: false, error: 'Missing required fields' };
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { ok: false, error: 'Invalid role' };
  }

  const supabase = createClient();

  // Never let an admin change their own role (avoids self-lockout).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && user.id === userId) {
    return { ok: false, error: 'You cannot change your own role.' };
  }

  // Refuse if this would leave the organization with zero admins.
  if (role !== 'admin') {
    const { data: adminCount, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');

    if (countError) {
      return { ok: false, error: 'Unable to verify admin count.' };
    }
    if ((adminCount?.count ?? 0) <= 1) {
      return { ok: false, error: 'At least one admin must remain.' };
    }
  }

  const { data, error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: role,
  });

  if (error) return { ok: false, error: 'Unable to update this role.' };
  return { ok: true, profile: data };
}
