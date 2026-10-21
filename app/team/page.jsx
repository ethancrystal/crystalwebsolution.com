import Link from 'next/link';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { listProjectsForViewer } from '@/lib/crm/projects';

export default async function TeamPage() {
  const { user, profile } = await requireRole(['project_manager'], '/login/employee');
  const name = profile.full_name || user.email;

  const supabase = await createClient();
  const projects = await listProjectsForViewer(supabase, { profile });

  return (
    <WorkspaceShell role="project_manager" title="My projects" subtitle={`Welcome, ${name}`}>
      <section aria-labelledby="assigned-projects-heading">
        <h2 id="assigned-projects-heading" className="crm-visually-hidden">
          Assigned projects
        </h2>
        {projects.length === 0 ? (
          <p className="crm-empty">You do not have any assigned projects yet.</p>
        ) : (
          <ul className="crm-list">
            {projects.map((project) => (
              <li key={project.id} className="crm-list-item">
                <Link href={`/team/projects/${project.id}`}>{project.title}</Link>
                <span className="crm-badge">{project.status.replaceAll('_', ' ')}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </WorkspaceShell>
  );
}
