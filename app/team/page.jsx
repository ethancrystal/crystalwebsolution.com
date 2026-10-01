import WorkspaceShell from '@/components/crm/WorkspaceShell';
import TeamDashboard from '@/components/crm/TeamDashboard';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { listNotifications, listProjectsForViewer } from '@/lib/crm/projects';

export default async function TeamPage() {
  const { user, profile } = await requireRole(['project_manager'], '/login/employee');
  const name = profile.full_name || user.email;

  const supabase = await createClient();
  // Notifications are secondary: a failed read hides unread counts, never
  // the project list.
  const [projects, notifications] = await Promise.all([
    listProjectsForViewer(supabase, { profile }),
    listNotifications(supabase, { profile }).catch(() => []),
  ]);

  const unread = {};
  for (const notification of notifications) {
    if (notification.project_id && !notification.read_at) {
      unread[notification.project_id] = (unread[notification.project_id] ?? 0) + 1;
    }
  }

  return (
    <WorkspaceShell role="project_manager" title="My projects" subtitle={`Welcome, ${name}`}>
      <section aria-labelledby="assigned-projects-heading">
        <h2 id="assigned-projects-heading" className="crm-visually-hidden">
          Assigned projects
        </h2>
        <TeamDashboard projects={projects} unread={unread} userId={profile.id} />
      </section>
    </WorkspaceShell>
  );
}
