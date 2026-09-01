'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { signOut } from '@/app/auth/actions';
import { homeForRole } from '@/lib/auth/roles.mjs';
import { listProjectsForViewer } from '@/lib/crm/projects';
import BriefSubmissionForm from '@/components/crm/BriefSubmissionForm';
import WorkspaceShell from '@/components/crm/WorkspaceShell';

const PROJECT_STATUS_LABELS = {
  brief_submitted: 'Brief Submitted',
  planned: 'Planned',
  in_progress: 'In Progress',
  client_review: 'Client Review',
  changes_requested: 'Changes Requested',
  approved: 'Approved',
  delivered: 'Delivered',
  on_hold: 'On Hold',
  cancelled: 'Cancelled',
};

const sectionClass =
  'tw:rounded-xl tw:border tw:border-[rgba(100,200,255,0.1)] tw:bg-[rgba(30,35,60,0.8)] tw:p-6 tw:backdrop-blur-[10px]';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myProjects, setMyProjects] = useState([]);
  const [error, setError] = useState(null);

  const loadClientProjects = useCallback(async (userId, companyId) => {
    if (!companyId) {
      setMyProjects([]);
      return;
    }

    const supabase = createClient();
    const viewerProfile = { profile: { id: userId, role: 'client', company_id: companyId } };

    try {
      const projects = await listProjectsForViewer(supabase, viewerProfile);
      setMyProjects(projects);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.replace('/login');
          return;
        }

        setUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          router.replace('/login');
          return;
        }

        setProfile(profileData);

        if (profileData.role === 'admin' || profileData.role === 'project_manager') {
          router.replace(homeForRole(profileData.role));
          return;
        }

        await loadClientProjects(user.id, profileData.company_id);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [loadClientProjects, router]);

  function handleProjectCreated(projectId) {
    if (projectId) {
      router.push(`/dashboard/projects/${projectId}`);
    }
  }

  if (isLoading) {
    return (
      <div className="tw:min-h-screen tw:bg-gradient-to-br tw:from-crm-bg tw:to-crm-bg2 tw:text-crm-text">
        <div className="tw:flex tw:min-h-screen tw:items-center tw:justify-center tw:text-[1.2rem] tw:text-crm-cyan">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <WorkspaceShell role="client" title="Client Dashboard">
      <header className="tw:mb-6 tw:flex tw:items-center tw:justify-between tw:gap-4">
        <div>
          <h1 className="tw:text-[1.6rem] tw:text-crm-cyan">Projects</h1>
          <p className="tw:text-[#999]">Welcome, {profile?.full_name || user?.email}</p>
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

      {error && (
        <div className="tw:mb-4 tw:flex tw:items-center tw:justify-between tw:gap-4 tw:rounded-md tw:border tw:border-[rgba(255,100,100,0.3)] tw:bg-[rgba(255,100,100,0.1)] tw:px-4 tw:py-3 tw:text-crm-red">
          {error}
          <button
            type="button"
            onClick={() => setError(null)}
            className="tw:cursor-pointer tw:border-0 tw:bg-transparent tw:font-semibold tw:text-crm-red"
          >
            Dismiss
          </button>
        </div>
      )}

      <section className={sectionClass}>
        <h2 className="tw:mb-4 tw:text-xl tw:text-crm-cyan">Your Projects</h2>
        {myProjects.length > 0 ? (
          <div className="tw:grid tw:grid-cols-[repeat(auto-fill,minmax(260px,1fr))] tw:gap-6">
            {myProjects.map((project) => (
              <a
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="tw:block tw:rounded-lg tw:border tw:border-[rgba(100,200,255,0.1)] tw:bg-[rgba(15,20,40,0.6)] tw:p-6 tw:text-inherit tw:no-underline tw:hover:border-[rgba(100,200,255,0.3)] tw:hover:-translate-y-0.5"
              >
                <h3>{project.title}</h3>
                <span className="tw:mt-2 tw:inline-block tw:rounded-full tw:border tw:border-[rgba(100,200,255,0.3)] tw:bg-[rgba(100,200,255,0.1)] tw:px-3 tw:py-1 tw:text-[0.8rem] tw:text-crm-cyan">
                  {PROJECT_STATUS_LABELS[project.status] || project.status}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="tw:text-[#999]">No projects yet — submit a brief below to start one.</p>
        )}
      </section>

      <section className={sectionClass}>
        <h2 className="tw:mb-4 tw:text-xl tw:text-crm-cyan">New Project</h2>
        <BriefSubmissionForm hasCompany={!!profile?.company_id} onCreated={handleProjectCreated} />
      </section>
    </WorkspaceShell>
  );
}
