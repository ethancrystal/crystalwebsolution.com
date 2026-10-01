import { redirect } from 'next/navigation';
import AccountSettings from '@/components/crm/AccountSettings';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import { getAuthenticatedProfile } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';

// The Settings page for any portal role. The portal layouts already require
// the role; this reads the signed-in person's own account (the session, not
// the URL) and, for a client, their company, which clients can read but only
// the admin can edit (RLS), hence the read-only card.

const LOGIN_BY_ROLE = {
  client: '/login/client',
  project_manager: '/login/employee',
  admin: '/login/admin',
};

export default async function SettingsScreen({ role }) {
  const authenticated = await getAuthenticatedProfile();
  if (!authenticated || authenticated.profile.role !== role) redirect(LOGIN_BY_ROLE[role]);
  const { user, profile } = authenticated;

  let company = null;
  if (role === 'client' && profile.company_id) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('companies')
      .select('name, email, phone, website, industry')
      .eq('id', profile.company_id)
      .maybeSingle();
    company = data ?? null;
  }

  return (
    <WorkspaceShell role={role} title="Settings" subtitle="Your account and how your portal opens">
      <AccountSettings
        role={role}
        userId={user.id}
        fullName={profile.full_name ?? ''}
        email={user.email ?? ''}
        company={company}
      />
    </WorkspaceShell>
  );
}
