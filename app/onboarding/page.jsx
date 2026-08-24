import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth/require-role';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import ClientOnboardingForm from '@/components/crm/ClientOnboardingForm';

export const dynamic = 'force-dynamic';

export default async function ClientOnboardingPage() {
  const { profile } = await requireRole(['client'], '/login/client');

  if (profile.company_id) {
    redirect('/dashboard');
  }

  return (
    <WorkspaceShell role="client" title="Welcome">
      <ClientOnboardingForm />
    </WorkspaceShell>
  );
}
