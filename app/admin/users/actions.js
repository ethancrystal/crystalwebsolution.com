'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient, buildVerifyUrl } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/resend';
import { inviteUserEmail } from '@/lib/email/templates';
import { redirect } from 'next/navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL;
const ASSIGNABLE_ROLES = ['admin', 'project_manager'];

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.role !== 'admin') {
    throw new Error('Admin access required.');
  }

  return user;
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
    return { error: `Invite created, but the email failed to send: ${sendError.message}` };
  }

  // generateLink() has no app_metadata param - set the role in a
  // follow-up call. handle_new_user's trigger already created a
  // 'client'-role profiles row for this user by this point; sync both.
  const { error: metaError } = await adminClient.auth.admin.updateUserById(data.user.id, {
    app_metadata: { role },
  });

  if (metaError) {
    return { error: `Invite sent, but role assignment failed: ${metaError.message}` };
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ role })
    .eq('id', data.user.id);

  if (profileError) {
    return { error: `Invite sent, but role assignment failed: ${profileError.message}` };
  }

  redirect('/admin/users');
}

// Reassigns an existing account between admin and project_manager.
// profiles.role goes through the normal authenticated client - the acting
// admin session satisfies 0002's prevent_unauthorized_profile_changes
// trigger directly, no service-role bypass needed. app_metadata.role is a
// second, independent source of truth (middleware.js reads only the JWT
// claim) and is kept in sync via the service-role admin client, same as
// 0005's bulk staff->project_manager migration did.
export async function changeUserRole(formData) {
  await requireAdmin();

  const userId = formData.get('userId');
  const role = formData.get('role');

  if (!userId || !role) {
    return { error: 'Missing required fields' };
  }
  if (!ASSIGNABLE_ROLES.includes(role)) {
    return { error: 'Invalid role' };
  }

  const supabase = await createClient();
  const { error: profileError } = await supabase.from('profiles').update({ role }).eq('id', userId);

  if (profileError) {
    return { error: profileError.message };
  }

  const adminClient = createAdminClient();
  const { error: metaError } = await adminClient.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (metaError) {
    return { error: `profiles.role updated, but app_metadata sync failed: ${metaError.message}` };
  }

  return { success: true };
}
