'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';
import { homeForRole } from '@/lib/auth/roles.mjs';
import { HugeiconsIcon } from '@hugeicons/react';
import { Delete02Icon } from '@hugeicons/core-free-icons';
import { getProjectManagerNames, listNotifications, listProjectsForViewer } from '@/lib/crm/projects';
import { CLIENT_ACTION_STATUSES, projectStatusBadgeClass, projectStatusLabel, projectStatusMeaning } from '@/lib/crm/labels.mjs';
import { listDraftBriefs, submittedBriefTypesByProject } from '@/lib/crm/briefs';
import { BRIEF_TEMPLATES, BRIEF_TYPES, briefTypeLabel, stepProgress } from '@/lib/crm/brief-templates.mjs';
import { deleteBriefDraft, startBrief } from '@/app/actions/brief-actions';
import BriefSubmissionForm from '@/components/crm/BriefSubmissionForm';
import { BRIEF_ICONS } from '@/components/crm/briefIcons';
import PortalTour from '@/components/crm/PortalTour';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import { SkeletonTable } from '@/components/crm/Skeleton';
import { LoadingState } from '@/components/crm/Spinner';

function formatShortDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [myProjects, setMyProjects] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [briefTypesByProject, setBriefTypesByProject] = useState({});
  const [unreadByProject, setUnreadByProject] = useState({});
  const [managers, setManagers] = useState({ available: false, names: new Map() });
  const [startingType, setStartingType] = useState(null);
  const [showFreeform, setShowFreeform] = useState(false);
  const [error, setError] = useState(null);
  const [tourReplayToken, setTourReplayToken] = useState(0);

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

    // Brief data, unread counts and manager names are secondary: a failure
    // here (e.g. before migration 0043 or 0049 is applied) hides drafts,
    // badges or names but never the project list.
    const projectIds = projects.map((project) => project.id);
    const [draftResult, typesResult, notificationResult, managerResult] = await Promise.allSettled([
      listDraftBriefs(supabase),
      submittedBriefTypesByProject(supabase, projectIds),
      listNotifications(supabase, viewerProfile),
      getProjectManagerNames(supabase, projectIds),
    ]);
    if (draftResult.status === 'fulfilled') setDrafts(draftResult.value);
    if (typesResult.status === 'fulfilled') setBriefTypesByProject(typesResult.value);
    if (notificationResult.status === 'fulfilled') {
      const counts = {};
      for (const notification of notificationResult.value) {
        if (notification.project_id && !notification.read_at) {
          counts[notification.project_id] = (counts[notification.project_id] ?? 0) + 1;
        }
      }
      setUnreadByProject(counts);
    }
    if (managerResult.status === 'fulfilled') setManagers(managerResult.value);
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
        // Submitted meanwhile (another tab): it is no longer a draft.
        if (result.conflict) setDrafts((prev) => prev.filter((item) => item.id !== draft.id));
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

  // Returning clients see their projects first; a new client sees the
  // service picker first.
  const sectionOrder = myProjects.length > 0 ? ['projects', 'drafts', 'start'] : ['start', 'drafts', 'projects'];
  const attentionItems = myProjects.flatMap((project) => {
    const unread = unreadByProject[project.id] ?? 0;
    const href = `/dashboard/projects/${project.id}`;
    const items = [];
    if (CLIENT_ACTION_STATUSES.includes(project.status)) {
      items.push({ key: `${project.id}-review`, title: project.title, text: projectStatusMeaning(project.status), href });
    }
    if (unread > 0) {
      items.push({
        key: `${project.id}-unread`,
        title: project.title,
        text: unread === 1 ? '1 new update' : `${unread} new updates`,
        href,
      });
    }
    return items;
  });

  return (
    <WorkspaceShell
      role="client"
      title="Projects"
      subtitle={`Welcome, ${profile?.full_name || user?.email || ''}`}
      actions={
        <button
          type="button"
          className="crm-button crm-button-ghost crm-button-small"
          onClick={() => setTourReplayToken((token) => token + 1)}
        >
          Replay tour
        </button>
      }
    >

      {error && (
        <div className="crm-dashboard-error">
          {error}
          <button type="button" onClick={() => setError(null)} className="crm-error-dismiss">
            Dismiss
          </button>
        </div>
      )}

      {attentionItems.length > 0 && (
        <section className="crm-attention" aria-labelledby="attention-heading">
          <h2 id="attention-heading">Needs your attention</h2>
          <ul>
            {attentionItems.map((item) => (
              <li key={item.key}>
                <a href={item.href}>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {sectionOrder.map((section) => (
        <Fragment key={section}>
          {section === 'projects' && (
            <section className="crm-dashboard-section" aria-labelledby="projects-heading">
              <h2 id="projects-heading">Your projects</h2>
              {myProjects.length > 0 ? (
                <div className="crm-companies-grid">
                  {myProjects.map((project) => {
                    const unread = unreadByProject[project.id] ?? 0;
                    const managerName = managers.names.get(project.id);
                    return (
                      <a
                        key={project.id}
                        href={`/dashboard/projects/${project.id}`}
                        className="crm-company-card crm-project-card"
                      >
                        <span className="crm-project-card-head">
                          <h3>{project.title}</h3>
                          {unread > 0 && (
                            <span className="crm-project-unread">
                              {unread}
                              {' '}
                              <span className="crm-visually-hidden">new {unread === 1 ? 'update' : 'updates'}</span>
                            </span>
                          )}
                        </span>
                        <span className={projectStatusBadgeClass(project.status)}>{projectStatusLabel(project.status)}</span>
                        <span className="crm-project-meaning">{projectStatusMeaning(project.status)}</span>
                        {managers.available && (
                          <span className="crm-project-meta">
                            {managerName ? `Project manager: ${managerName}` : 'Project manager: being assigned'}
                          </span>
                        )}
                        {project.updated_at && (
                          <span className="crm-project-meta">Updated {formatShortDate(project.updated_at)}</span>
                        )}
                        {briefTypesByProject[project.id]?.length > 0 && (
                          <span className="crm-project-briefs">
                            {[...new Set(briefTypesByProject[project.id])].map(briefTypeLabel).join(' · ')}
                          </span>
                        )}
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="crm-empty-state">No projects yet. Start a brief above and your first project appears here.</p>
              )}
            </section>
          )}
          {section === 'drafts' && drafts.length > 0 && (
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
          {section === 'start' && (
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
          )}
        </Fragment>
      ))}

      <PortalTour replayToken={tourReplayToken} />

      <style jsx>{`
        .crm-dashboard {
          min-height: 100vh;
          background: var(--crm-bg);
          color: var(--crm-text);
          font-family: inherit;
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

        .crm-attention {
          border: 1px solid var(--crm-status-warning-fg);
          background: var(--crm-status-warning-bg);
          border-radius: 12px;
          padding: 1rem 1.25rem;
        }

        .crm-attention h2 {
          font-size: 1rem;
          color: var(--crm-status-warning-fg);
          margin: 0 0 0.6rem;
        }

        .crm-attention ul {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.4rem;
        }

        .crm-attention a {
          display: flex;
          flex-wrap: wrap;
          gap: 0.25rem 0.6rem;
          color: var(--crm-text);
          text-decoration: none;
          padding: 0.35rem 0;
        }

        .crm-attention a:hover strong,
        .crm-attention a:focus-visible strong {
          text-decoration: underline;
        }

        .crm-attention a span {
          color: var(--crm-muted);
        }

        .crm-project-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .crm-project-card-head h3 {
          margin: 0;
          overflow-wrap: anywhere;
        }

        .crm-project-unread {
          flex: 0 0 auto;
          min-width: 1.5rem;
          padding: 0.1rem 0.45rem;
          border-radius: 999px;
          background: var(--crm-accent);
          color: #fff;
          font-size: 0.75rem;
          font-weight: 600;
          text-align: center;
        }

        .crm-project-meaning {
          display: block;
          color: var(--crm-muted);
          font-size: 0.88rem;
          margin-top: 0.6rem;
        }

        .crm-project-meta {
          display: block;
          color: var(--crm-subtle);
          font-size: 0.8rem;
          margin-top: 0.35rem;
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
