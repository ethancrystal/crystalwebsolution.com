import Link from 'next/link';
import { signOut } from '@/app/auth/actions';
import { requireRole } from '@/lib/auth/require-role';
import { createClient } from '@/lib/supabase/server';
import { listProjectsForViewer } from '@/lib/crm/projects';

export default async function TeamPage() {
  const { user, profile } = await requireRole(['project_manager'], '/login/employee');
  const name = profile.full_name || user.email;

  const supabase = await createClient();
  const projects = await listProjectsForViewer(supabase, { profile });

  return (
    <main className="tw:min-h-screen tw:bg-gradient-to-br tw:from-crm-bg tw:to-crm-bg2 tw:p-6 tw:text-crm-text">
      <header className="tw:mb-6 tw:flex tw:items-center tw:justify-between tw:gap-4">
        <div>
          <h1 className="tw:text-[2rem] tw:text-crm-cyan">Employee Portal</h1>
          <p className="tw:text-crm-muted">Welcome, {name}</p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="tw:cursor-pointer tw:rounded-md tw:border tw:border-[rgba(255,100,100,0.3)] tw:bg-[rgba(255,100,100,0.1)] tw:px-4 tw:py-2 tw:text-crm-red"
          >
            Sign Out
          </button>
        </form>
      </header>

      <section
        aria-labelledby="assigned-projects-heading"
        className="tw:rounded-xl tw:border tw:border-crm-border tw:bg-crm-panel tw:p-6"
      >
        <h2 id="assigned-projects-heading" className="tw:mb-5 tw:text-base tw:font-semibold">
          Assigned projects
        </h2>
        {projects.length === 0 ? (
          <p className="tw:text-sm tw:text-crm-muted">You do not have any assigned projects yet.</p>
        ) : (
          <ul className="tw:m-0 tw:grid tw:list-none tw:gap-3 tw:p-0">
            {projects.map((project) => (
              <li
                key={project.id}
                className="tw:border-b tw:border-[rgba(100,200,255,0.08)] tw:pb-3 tw:last:border-b-0 tw:last:pb-0"
              >
                <Link
                  href={`/team/projects/${project.id}`}
                  className="tw:text-crm-cyan tw:no-underline tw:hover:underline"
                >
                  {project.title} — {project.status.replaceAll('_', ' ')}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
