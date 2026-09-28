'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { signOut } from '@/app/auth/actions';
import { homeForRole } from '@/lib/auth/roles.mjs';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { listProjectsForViewer } from '@/lib/crm/projects';
import { listDraftBriefs, submittedBriefTypesByProject } from '@/lib/crm/briefs';
import { BRIEF_TEMPLATES, BRIEF_TYPES, briefTypeLabel, stepProgress } from '@/lib/crm/brief-templates.mjs';
import { deleteBriefDraft, startBrief } from '@/app/actions/brief-actions';
import BriefSubmissionForm from '@/components/crm/BriefSubmissionForm';
import { BRIEF_ICONS } from '@/components/crm/briefIcons';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import { SkeletonTable } from '@/components/crm/Skeleton';
import { LoadingState } from '@/components/crm/Spinner';

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
  const [drafts, setDrafts] = useState([]);
  const [briefTypesByProject, setBriefTypesByProject] = useState({});
  const [startingType, setStartingType] = useState(null);
  const [showFreeform, setShowFreeform] = useState(false);
  const [error, setError] = useState(null);

  const loadClientProjects = useCallback(async (userId, companyId) => {
    if (!companyId) {
      setMyProjects([]);
      return;
    }

    const supabase = createClient();
    const viewerProfile = { profile: { id: userId, role: 'client', company_id: companyId } };

    let projects;
    try {
      projects = await listProjectsForViewer(supabase, viewerProfile);
      setMyProjects(projects);
    } catch (err) {
      setError(err.message);
      return;
    }

    // Brief data is secondary: a failure here (e.g. before migration 0043 is
    // applied) hides drafts and badges but never the project list.
    const [draftResult, typesResult] = await Promise.allSettled([
      listDraftBriefs(supabase),
      submittedBriefTypesByProject(supabase, projects.map((project) => project.id)),
    ]);
    if (draftResult.status === 'fulfilled') setDrafts(draftResult.value);
    if (typesResult.status === 'fulfilled') setBriefTypesByProject(typesResult.value);
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

        if (!profileData.company_id) {
          router.replace('/onboarding');
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

  function handleProjectCreated(data) {
    // createProject resolves { projectId }; older callers passed the id.
    const projectId = typeof data === 'string' ? data : data?.projectId;
    if (projectId) {
      router.push(`/dashboard/projects/${projectId}`);
    }
  }

  async function handleStartBrief(briefType) {
    setError(null);
    setStartingType(briefType);
    try {
      const formData = new FormData();
      formData.set('briefType', briefType);
      const result = await startBrief(formData);
      if (!result.ok) {
        setError(result.error || 'Unable to start the brief.');
        return;
      }
      router.push(`/dashboard/briefs/${result.data.briefId}`);
    } catch {
      setError('Unable to start the brief.');
    } finally {
      setStartingType(null);
    }
  }

  async function handleDeleteDraft(draft) {
    if (!window.confirm(`Delete the draft "${draft.title || briefTypeLabel(draft.brief_type)}"? This cannot be undone.`)) {
      return;
    }
    try {
      const formData = new FormData();
      formData.set('briefId', draft.id);
      const result = await deleteBriefDraft(formData);
      if (!result.ok) {
        setError(result.error || 'Unable to delete the draft.');
        return;
      }
      setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
    } catch {
      setError('Unable to delete the draft. Check your connection and try again.');
    }
  }

  if (isLoading) {
    return (
      <div className="crm-dashboard">
        <SkeletonTable columns={2} />
      </div>
    );
  }

  if (profile && profile.role === 'client' && !profile.company_id) {
    return (
      <div className="crm-dashboard">
        <LoadingState label="Opening onboarding…" />
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

      <section className="crm-dashboard-section" aria-labelledby="start-brief-heading">
        <h2 id="start-brief-heading">Start a new brief</h2>
        <p className="crm-section-sub">
          Pick a service and answer a few guided questions. Your answers save as you go, so you can stop and come back
          any time.
        </p>
        <div className="crm-service-grid">
          {BRIEF_TYPES.map((type) => {
            const template = BRIEF_TEMPLATES[type];
            return (
              <button
                key={type}
                type="button"
                className="crm-service-card"
                onClick={() => handleStartBrief(type)}
                disabled={startingType !== null}
              >
                <span className="crm-service-icon" aria-hidden="true">
                  <HugeiconsIcon icon={BRIEF_ICONS[type]} size={22} />
                </span>
                <span className="crm-service-name">{template.label}</span>
                <span className="crm-service-blurb">{template.blurb}</span>
                <span className="crm-service-time">
                  {startingType === type ? 'Opening…' : `About ${template.minutes} min`}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            className="crm-service-card crm-service-card-other"
            onClick={() => setShowFreeform((prev) => !prev)}
            aria-expanded={showFreeform}
            aria-controls="freeform-brief"
          >
            <span className="crm-service-icon" aria-hidden="true">
              <HugeiconsIcon icon={BRIEF_ICONS.other} size={22} />
            </span>
            <span className="crm-service-name">Something else</span>
            <span className="crm-service-blurb">Branding, AI automation or anything not listed. Describe it in your own words.</span>
            <span className="crm-service-time">{showFreeform ? 'Hide form' : 'Free-form brief'}</span>
          </button>
        </div>
        {showFreeform && (
          <div id="freeform-brief" className="crm-freeform">
            <BriefSubmissionForm hasCompany={!!profile?.company_id} onCreated={handleProjectCreated} />
          </div>
        )}
      </section>

      {drafts.length > 0 && (
        <section className="crm-dashboard-section" aria-labelledby="drafts-heading">
          <h2 id="drafts-heading">Briefs in progress</h2>
          <ul className="crm-draft-list">
            {drafts.map((draft) => {
              const { answered, total } = stepProgress(draft.brief_type, draft.answers);
              const percent = total ? Math.round((answered / total) * 100) : 0;
              return (
                <li key={draft.id} className="crm-draft">
                  <span className="crm-service-icon" aria-hidden="true">
                    <HugeiconsIcon icon={BRIEF_ICONS[draft.brief_type] ?? BRIEF_ICONS.other} size={18} />
                  </span>
                  <div className="crm-draft-main">
                    <a href={`/dashboard/briefs/${draft.id}`} className="crm-draft-title">
                      {draft.title || `${briefTypeLabel(draft.brief_type)} brief`}
                    </a>
                    <div className="crm-draft-meta">
                      <span>{briefTypeLabel(draft.brief_type)}</span>
                      <span>·</span>
                      <span>Last saved {new Date(draft.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div
                      className="crm-draft-progress"
                      role="progressbar"
                      aria-label={`${answered} of ${total} questions answered`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                    >
                      <span style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                  <a href={`/dashboard/briefs/${draft.id}`} className="crm-draft-continue">Continue</a>
                  <button
                    type="button"
                    className="crm-draft-delete"
                    onClick={() => handleDeleteDraft(draft)}
                    aria-label={`Delete draft ${draft.title || briefTypeLabel(draft.brief_type)}`}
                  >
                    <HugeiconsIcon icon={Delete02Icon} size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="crm-dashboard-section" aria-labelledby="projects-heading">
        <h2 id="projects-heading">Your projects</h2>
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
                {briefTypesByProject[project.id]?.length > 0 && (
                  <span className="crm-project-briefs">
                    {[...new Set(briefTypesByProject[project.id])].map(briefTypeLabel).join(' · ')}
                  </span>
                )}
              </a>
            ))}
          </div>
        ) : (
          <p className="crm-empty-state">No projects yet. Start a brief above and your first project appears here.</p>
        )}
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

        .crm-section-sub {
          color: #aab;
          margin: -0.5rem 0 1.25rem;
          max-width: 46rem;
        }

        .crm-service-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 1rem;
        }

        .crm-service-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
          text-align: left;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.14);
          border-radius: 10px;
          padding: 1.25rem;
          color: inherit;
          font: inherit;
          cursor: pointer;
          transition: border-color 0.2s ease, transform 0.2s ease;
        }

        .crm-service-card:hover:not(:disabled) {
          border-color: rgba(100, 200, 255, 0.45);
          transform: translateY(-2px);
        }

        .crm-service-card:focus-visible,
        .crm-company-card:focus-visible {
          outline: 2px solid rgba(100, 200, 255, 0.7);
          outline-offset: 2px;
        }

        .crm-service-card:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .crm-service-card-other {
          border-style: dashed;
        }

        .crm-service-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 10px;
          background: rgba(100, 200, 255, 0.1);
          color: #64c8ff;
          flex-shrink: 0;
        }

        .crm-service-name {
          font-weight: 600;
          font-size: 1.05rem;
          color: #e0e0e0;
        }

        .crm-service-blurb {
          color: #999;
          font-size: 0.88rem;
          line-height: 1.45;
          flex: 1;
        }

        .crm-service-time {
          color: #64c8ff;
          font-size: 0.8rem;
        }

        .crm-freeform {
          margin-top: 1.25rem;
        }

        .crm-draft-list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .crm-draft {
          display: flex;
          align-items: center;
          gap: 0.9rem;
          background: rgba(15, 20, 40, 0.6);
          border: 1px solid rgba(100, 200, 255, 0.12);
          border-radius: 10px;
          padding: 0.9rem 1rem;
        }

        .crm-draft-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .crm-draft-title {
          color: #e0e0e0;
          font-weight: 600;
          text-decoration: none;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .crm-draft-meta {
          display: flex;
          gap: 0.4rem;
          color: #999;
          font-size: 0.8rem;
        }

        .crm-draft-progress {
          height: 4px;
          border-radius: 999px;
          background: rgba(100, 200, 255, 0.1);
          overflow: hidden;
          max-width: 18rem;
        }

        .crm-draft-progress span {
          display: block;
          height: 100%;
          background: linear-gradient(90deg, #64c8ff, #8a7dff);
        }

        .crm-draft-continue {
          color: #0a0e27;
          background: #64c8ff;
          border-radius: 6px;
          padding: 0.45rem 0.9rem;
          font-weight: 600;
          font-size: 0.85rem;
          text-decoration: none;
          flex-shrink: 0;
        }

        .crm-draft-delete {
          display: inline-flex;
          background: none;
          border: 1px solid rgba(255, 100, 100, 0.25);
          color: #ff9999;
          border-radius: 6px;
          padding: 0.4rem;
          cursor: pointer;
          flex-shrink: 0;
        }

        .crm-project-briefs {
          display: block;
          color: #999;
          font-size: 0.8rem;
          margin-top: 0.6rem;
        }

        @media (max-width: 560px) {
          .crm-draft {
            flex-wrap: wrap;
          }
          .crm-draft-main {
            flex-basis: calc(100% - 3.5rem);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .crm-service-card,
          .crm-company-card {
            transition: none;
          }
          .crm-service-card:hover:not(:disabled),
          .crm-company-card:hover {
            transform: none;
          }
        }
      `}</style>
    </WorkspaceShell>
  );
}
