import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { listProjectsForViewer } from '@/lib/crm/projects';
import { signOut } from '@/app/auth/actions';
import Link from 'next/link';

export default async function TeamPage() {
  const { user, profile } = await requireRole(['project_manager'], '/login/employee');
  const name = profile.full_name || user.email;

  const supabase = createClient();
  let projects = [];
  try {
    projects = (await listProjectsForViewer(supabase, { profile })) || [];
  } catch {
    projects = [];
  }

  return (
    <main className="crm-team-page">
      <header className="crm-team-header">
        <div>
          <h1>Employee Portal</h1>
          <p>Welcome, {name}</p>
        </div>
        <form action={signOut}>
          <button type="submit">Sign Out</button>
        </form>
      </header>

      <section className="crm-team-empty" aria-labelledby="assigned-projects-heading">
        <h2 id="assigned-projects-heading">Assigned projects</h2>
        {projects.length > 0 ? (
          <ul className="crm-team-project-list">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={`/team/projects/${project.id}`} className="crm-team-project-link">
                  {project.title}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p>You do not have any assigned projects yet.</p>
        )}
      </section>
    </main>
  );
}
