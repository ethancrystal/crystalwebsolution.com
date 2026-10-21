'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { getProjectManagerNames, getProjectWorkspace, listNotifications } from '@/lib/crm/projects';
import { CLIENT_ACTION_STATUSES, projectStatusMeaning } from '@/lib/crm/labels.mjs';
import { markNotificationsRead } from '@/app/actions/project-actions';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import Tabs from '@/components/crm/Tabs';
import ProjectOverview from '@/components/crm/ProjectOverview';
import ProjectManagerCard from '@/components/crm/ProjectManagerCard';
import ProjectTimeline from '@/components/crm/ProjectTimeline';
import ProjectTasks from '@/components/crm/ProjectTasks';
import ProjectFiles from '@/components/crm/ProjectFiles';
import ProjectApprovals from '@/components/crm/ProjectApprovals';
import ProjectThread from '@/components/crm/ProjectThread';
import NotificationsPanel from '@/components/crm/NotificationsPanel';
import NotesPanel from '@/components/crm/NotesPanel';
import ProjectPresence from '@/components/crm/ProjectPresence';
import { touchesWorkspace, useProjectLive } from '@/components/crm/useProjectLive';
import ProjectBriefs from '@/components/crm/ProjectBriefs';
import { SkeletonDetail } from '@/components/crm/Skeleton';

// The client's project, in five tabs: Overview, Messages, Files,
// Tasks & approvals, Brief. The brief is shown once (its own tab; the Overview
// no longer repeats it as plain text), and the project manager appears by
// name only. Project Updates (NotesPanel) stays on Overview: clients post
// shared updates there too (post_project_note).
//
// Unread in-app notifications become tab badges; opening a tab marks its
// notifications read.
const TAB_EVENTS = {
  messages: ['project.message_posted', 'project.message_edited'],
  files: ['project.deliverable_published'],
};

function tabForEvent(eventType) {
  for (const [tab, events] of Object.entries(TAB_EVENTS)) {
    if (events.includes(eventType)) return tab;
  }
  return 'overview';
}

export default function ClientProjectPage() {
  const params = useParams();
  const projectId = params?.id;
  const [profile, setProfile] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [manager, setManager] = useState({ available: false, name: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    // ?brief=submitted is set by BriefWizard after a successful submit. Drop
    // only that parameter, so ?tab= and anything else survive.
    const url = new URL(window.location.href);
    if (url.searchParams.get('brief') === 'submitted') {
      setJustSubmitted(true);
      url.searchParams.delete('brief');
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!projectId) return;

    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('You must be signed in to view this project.');
        setIsLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        setError('Unable to load your profile.');
        setIsLoading(false);
        return;
      }

      const viewerProfile = { profile: profileData };
      setProfile(profileData);

      // getProjectWorkspace already returns tasks, approvals and deliverables
      // scoped to this viewer; fetching them again through the standalone list
      // functions cost four extra `projects` and `profiles` round trips per load
      // for identical rows.
      const [data, notificationList, managerNames] = await Promise.all([
        getProjectWorkspace(supabase, viewerProfile, projectId),
        listNotifications(supabase, viewerProfile),
        getProjectManagerNames(supabase, [projectId]),
      ]);

      setWorkspace(data);
      setNotifications((notificationList ?? []).filter((notification) => notification.project_id === projectId));
      setManager({ available: managerNames.available, name: managerNames.names.get(projectId) ?? null });
    } catch (err) {
      setError(err.message || 'Unable to load this project.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const unreadByTab = useMemo(() => {
    const counts = { overview: 0, messages: 0, files: 0 };
    for (const notification of notifications) {
      if (!notification.read_at) counts[tabForEvent(notification.event_type)] += 1;
    }
    return counts;
  }, [notifications]);

  function openTab(nextTab) {
    setTab(nextTab);
  }

  // Whatever lands on the open Messages or Files tab is read: on opening it,
  // on a ?tab= deep link, and when a live update brings in something new
  // while the client is already looking at it.
  useEffect(() => {
    if (tab !== 'messages' && tab !== 'files') return;
    const ids = notifications
      .filter((notification) => !notification.read_at && tabForEvent(notification.event_type) === tab)
      .map((notification) => notification.id);
    if (ids.length === 0) return;

    // Optimistic: the badge clears at once; a failed call just leaves the
    // server copy unread for next time.
    const now = new Date().toISOString();
    setNotifications((previous) => previous.map((notification) => (ids.includes(notification.id) ? { ...notification, read_at: now } : notification)));
    const formData = new FormData();
    for (const id of ids) formData.append('notificationId', id);
    (async () => {
      try {
        await markNotificationsRead(formData);
      } catch {
        // Left unread on the server; nothing to show the client.
      }
    })();
  }, [tab, notifications]);

  // Live updates: a status, task or approval change re-reads the workspace
  // (which also refreshes notifications and the manager's name); a new
  // message only refreshes the notifications behind the tab badges, since
  // ProjectThread reloads the conversation itself.
  const refreshNotifications = useCallback(async () => {
    if (!profile) return;
    try {
      const list = await listNotifications(createClient(), { profile });
      setNotifications((list ?? []).filter((notification) => notification.project_id === projectId));
    } catch {
      // Badges stay as they are until the next load.
    }
  }, [profile, projectId]);

  const { viewers } = useProjectLive({
    projectId,
    profile,
    onChange: (events) => {
      if (touchesWorkspace(events)) loadWorkspace();
      else refreshNotifications();
    },
  });

  if (isLoading) {
    return (
      <WorkspaceShell role="client">
        <SkeletonDetail />
      </WorkspaceShell>
    );
  }

  if (error || !workspace?.project) {
    return (
      <WorkspaceShell role="client" title="Project">
        <p className="crm-form-error" role="alert">{error || 'Project not found.'}</p>
        <p><Link href="/dashboard">Back to your projects</Link></p>
      </WorkspaceShell>
    );
  }

  const project = workspace.project;
  const needsYou = CLIENT_ACTION_STATUSES.includes(project.status);
  const attention = [
    // Approvals are recorded by staff, so "your review" means: look at the
    // files, then reply in Messages.
    needsYou && {
      key: 'review',
      text: projectStatusMeaning(project.status),
      tab: (workspace.deliverables ?? []).length > 0 ? 'files' : 'messages',
    },
    unreadByTab.messages > 0 && {
      key: 'messages',
      text: unreadByTab.messages === 1 ? '1 new message from the team' : `${unreadByTab.messages} new messages from the team`,
      tab: 'messages',
    },
    unreadByTab.files > 0 && { key: 'files', text: 'New file ready for you', tab: 'files' },
  ].filter(Boolean);
  const activity = (workspace.statusHistory ?? []).slice(-5).reverse();

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      badge: unreadByTab.overview,
      content: (
        <>
          {!needsYou && projectStatusMeaning(project.status) && (
            <p className="cp-status-meaning">{projectStatusMeaning(project.status)}</p>
          )}

          {attention.length > 0 && (
            <section className="crm-card" aria-labelledby="cp-attention-heading">
              <h2 id="cp-attention-heading" className="crm-section-title">Needs your attention</h2>
              <ul className="cp-attention">
                {attention.map((item) => (
                  <li key={item.key}>
                    <button type="button" className="cp-attention-link" onClick={() => openTab(item.tab)}>
                      {item.text}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ProjectPresence viewers={viewers} />
          <ProjectManagerCard available={manager.available} name={manager.name} onMessage={() => openTab('messages')} />
          <ProjectOverview project={project} showBrief={false} showBackLink={false} />
          <ProjectTimeline history={activity} title="Recent activity" />
          <NotificationsPanel notifications={notifications} />
          <NotesPanel projectId={projectId} />
        </>
      ),
    },
    {
      id: 'messages',
      label: 'Messages',
      badge: unreadByTab.messages,
      content: <ProjectThread projectId={projectId} profile={profile} />,
    },
    {
      id: 'files',
      label: 'Files',
      badge: unreadByTab.files,
      content: (
        <ProjectFiles
          files={workspace.attachments ?? []}
          deliverables={workspace.deliverables ?? []}
          canUpload={false}
          projectId={projectId}
          onChanged={loadWorkspace}
        />
      ),
    },
    {
      id: 'tasks',
      label: 'Tasks & approvals',
      content: (
        <>
          <ProjectTasks tasks={workspace.tasks ?? []} readOnly />
          <ProjectApprovals approvals={workspace.approvals ?? []} />
        </>
      ),
    },
    {
      id: 'brief',
      label: 'Brief',
      content: (
        <ProjectBriefs projectId={projectId} canAddBriefs projectStatus={project.status} fallbackText={project.brief} />
      ),
    },
  ];

  return (
    <WorkspaceShell role="client" title={project.title}>
      {justSubmitted && (
        <div className="crm-form-success" role="status">
          Brief received. The team has been notified and will review it shortly. You can follow progress and message
          us right here.
        </div>
      )}

      <Tabs label="Project sections" tabs={tabs} value={tab} onChange={openTab} />

      <style jsx>{`
        .cp-status-meaning {
          margin: 0;
          color: var(--crm-muted);
        }
        .cp-attention {
          list-style: none;
          margin: 0;
          padding: 0;
          display: grid;
          gap: 0.5rem;
        }
        .cp-attention-link {
          width: 100%;
          text-align: left;
          padding: 0.7rem 0.9rem;
          border-radius: var(--crm-radius-sm);
          border: 1px solid var(--crm-status-warning-bg);
          background: var(--crm-status-warning-bg);
          color: var(--crm-status-warning-fg);
          font: inherit;
          cursor: pointer;
        }
        .cp-attention-link:hover {
          border-color: var(--crm-status-warning-fg);
        }
      `}</style>
    </WorkspaceShell>
  );
}
