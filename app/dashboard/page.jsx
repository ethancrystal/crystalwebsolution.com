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
      <div className="crm-dashboard">
        <div className="crm-loading">Loading...</div>
      </div>
    );
  }

  return (
    <WorkspaceShell role="client" title="Client Dashboard">
      <header className="crm-dashboard-header">
        <div className="crm-header-content">
          <h1>Projects</h1>
          <p>Welcome, {profile?.full_name || user?.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit" className="crm-logout-btn">Sign Out</button>
        </form>
      </header>

      {error && (
        <div className="crm-dashboard-error">
          {error}
          <button type="button" onClick={() => setError(null)} className="crm-error-dismiss">
            Dismiss
          </button>
        </div>
      )}

      <section className="crm-dashboard-section">
        <h2>Your Projects</h2>
        {myProjects.length > 0 ? (
          <div className="crm-companies-grid">
            {myProjects.map((project) => (
              <a
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="crm-company-card crm-project-card"
              >
                <h3>{project.title}</h3>
                <span className="crm-project-status">
                  {PROJECT_STATUS_LABELS[project.status] || project.status}
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="crm-empty-state">No projects yet — submit a brief below to start one.</p>
        )}
      </section>

      <section className="crm-dashboard-section">
        <h2>New Project</h2>
        <BriefSubmissionForm hasCompany={!!profile?.company_id} onCreated={handleProjectCreated} />
      </section>

      <style jsx>{`
        .crm-dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
          color: #e0e0e0;
          font-family: inherit;
        }

        .crm-dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .crm-header-content h1 {
          font-size: 1.6rem;
          color: #64c8ff;
        }

        .crm-header-content p {
          color: #999;
        }

        .crm-logout-btn {
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          cursor: pointer;
        }

        .crm-dashboard-error {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: center;
          background: rgba(255, 100, 100, 0.1);
          border: 1px solid rgba(255, 100, 100, 0.3);
          color: #ff9999;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
        }

        .crm-error-dismiss {
          background: none;
          border: none;
          color: #ff9999;
          cursor: pointer;
          font-weight: 600;
        }

        .crm-dashboard-section {
          background: rgba(30, 35, 60, 0.8);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .crm-dashboard-section h2 {
          font-size: 1.25rem;
          color: #64c8ff;
          margin-bottom: 1rem;
        }

        .crm-companies-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 1.5rem;
        }

        .crm-company-card {
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          text-decoration: none;
          color: inherit;
        }

        .crm-company-card:hover {
          border-color: rgba(100, 200, 255, 0.3);
          transform: translateY(-2px);
        }

        .crm-project-card {
          display: block;
        }

        .crm-project-status {
          display: inline-block;
          background: rgba(100, 200, 255, 0.1);
          border: 1px solid rgba(100, 200, 255, 0.3);
          color: #64c8ff;
          padding: 0.25rem 0.75rem;
          border-radius: 999px;
          font-size: 0.8rem;
          margin-top: 0.5rem;
        }

        .crm-empty-state {
          color: #999;
        }
      `}</style>
    </WorkspaceShell>
  );
}
