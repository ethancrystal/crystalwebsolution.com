'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient, buildVerifyUrl } from '@/lib/supabase/admin';
import { sendTemplate } from '@/lib/email/resend';
import { inviteUserEmail } from '@/lib/email/templates';
import { requireRole } from '@/lib/auth/require-role';
import { redirect } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

// 'admin' is deliberately absent. Migration 0014 pins the admin role to a
// single address and caps the table at one admin row, so offering it here
// could only ever produce a database error - the role is not assignable
// through the application at all. Moving accounts between client and
// project_manager remains available.
const ASSIGNABLE_ROLES = ['project_manager', 'client'];

// Invitations are for staff only; a client account is self-service via /signup.
const INVITABLE_ROLES = ['project_manager'];

// Where the one-time invite link lands. An invited account has no password
// until the invitee chooses one, so this must be the set-password form (the
// same page the reset flow uses); ?reason=invite switches its copy. The
// middleware gate (migration 0039) sends them back here from any portal
// until a password exists.
const INVITE_NEXT = '/auth/reset-password?reason=invite';

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
  if (!INVITABLE_ROLES.includes(role)) {
    return { error: 'Invalid role' };
  }

  let adminClient;
  try {
    adminClient = createAdminClient();
  } catch (configError) {
    console.error('Invite unavailable - admin client misconfigured:', configError);
    return { error: 'Invites are temporarily unavailable. Please try again later.' };
  }

  // The invite email promises "Set your password to activate your account",
  // and an invited account has no password until the invitee chooses one.
  // /auth/verify signs them in from the one-time token, so the only correct
  // landing page is the set-password form - the same one the reset flow
  // uses. updatePassword() then sends them to their role's portal home.
  // Landing on a portal home instead would leave them signed in for one
  // session with no way back in except /forgot-password.
  const { data, error } = await adminClient.auth.admin.generateLink({
    type: 'invite',
    email,
    options: {
      data: { full_name: fullName },
      redirectTo: `${APP_URL}/auth/callback?next=${encodeURIComponent(INVITE_NEXT)}`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // The auth trigger creates a client profile. Promote invited staff through
  // the same validated command used by subsequent role changes - and do it
  // before the email goes out, so the role is already in place by the time
  // the invitee clicks through and updatePassword() reads it to pick their
  // portal home.
  const { error: roleError } = await supabase.rpc('admin_set_user_role', {
    p_user_id: data.user.id,
    p_role: role,
  });

  if (roleError) {
    await adminClient.auth.admin.deleteUser(data.user.id).catch(() => null);
    return { error: 'Invite created, but role assignment failed.' };
  }

  const { subject, html } = inviteUserEmail({
    inviteUrl: buildVerifyUrl({ properties: data.properties, next: INVITE_NEXT }),
    fullName,
    role,
  });

  try {
    await sendTemplate({ subject, html }, { to: email, tags: ['invite'] });
  } catch (sendError) {
    await adminClient.auth.admin.deleteUser(data.user.id).catch(() => null);
    return { error: `Invite created, but the email failed to send: ${sendError.message}` };
  }

  redirect('/admin/users');
}

// Resolves a staff-access request raised at signup. Approving grants
// project_manager and nothing higher - admin_resolve_staff_request() cannot
// reach the admin role, and re-checks is_admin() itself, so this action is a
// convenience wrapper rather than the security boundary.
export async function resolveStaffRequest(formData) {
  await requireAdmin();

  const userId = formData.get('userId');
  const decision = formData.get('decision');

  if (!userId || !['approve', 'decline'].includes(decision)) {
    return { ok: false, error: 'Missing or invalid decision' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_resolve_staff_request', {
    p_user_id: userId,
    p_approve: decision === 'approve',
  });

  if (error) return { ok: false, error: 'Unable to resolve this request.' };
  return { ok: true, profile: data };
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

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_role: role,
  });

  if (error) return { ok: false, error: 'Unable to update this role.' };
  return { ok: true, profile: data };
}
