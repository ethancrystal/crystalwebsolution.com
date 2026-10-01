'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/browser';
import { listNotifications, listProjectsForViewer } from '@/lib/crm/projects';
import { PROJECT_STATUSES } from '@/lib/crm/project-contract.mjs';
import { projectStatusBadgeClass, projectStatusLabel } from '@/lib/crm/labels.mjs';
import { countByStatus, isOpenProject, sortProjectsForList, unreadByProject, workQueue } from '@/lib/crm/work-queue.mjs';
import WorkspaceShell from '@/components/crm/WorkspaceShell';
import Tabs from '@/components/crm/Tabs';
import StaffProjectList from '@/components/crm/StaffProjectList';
import { LoadingState } from '@/components/crm/Spinner';
import { useDefaultTab } from '@/components/crm/useDefaultTab';

// The admin's home, in three tabs:
//   Needs action  projects without a project manager, unread updates,
//                 projects gone quiet, and pending staff requests
//   Projects      how many projects sit in each status, and the latest ones
//   CRM           companies, contacts, deals, tasks, and quick actions
// app/admin/layout.jsx already requires the admin role.

const hrefFor = (project) => `/admin/projects/${project.id}`;
const RECENT_LIMIT = 8;

export default function AdminDashboard() {
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  // null until loaded, so a failed read shows a dash rather than a false 0.
  const [projects, setProjects] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [staffRequests, setStaffRequests] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, role, company_id, full_name')
          .eq('id', user.id)
          .single();
        setProfile(profileData ?? null);
        if (!profileData) return;

        // Each read is independent: one failing blanks its own numbers only.
        const [projectResult, notificationResult, requestResult, ...countResults] = await Promise.allSettled([
          listProjectsForViewer(supabase, { profile: profileData }),
          listNotifications(supabase, { profile: profileData }),
          supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('requested_staff_access', true),
          supabase.from('companies').select('id', { count: 'exact', head: true }),
          supabase.from('contacts').select('id', { count: 'exact', head: true }),
          supabase.from('deals').select('id', { count: 'exact', head: true }),
          supabase.from('tasks').select('id', { count: 'exact', head: true }),
        ]);

        if (projectResult.status === 'fulfilled') setProjects(projectResult.value ?? []);
        else console.error('Failed to load projects:', projectResult.reason);
        if (notificationResult.status === 'fulfilled') setNotifications(notificationResult.value ?? []);
        if (requestResult.status === 'fulfilled') setStaffRequests(requestResult.value.count ?? 0);

        const [companies, contacts, deals, tasks] = countResults.map((result) => (
          result.status === 'fulfilled' && !result.value.error ? result.value.count ?? 0 : null
        ));
        setStats({ companies, contacts, deals, tasks });
      } catch (error) {
        console.error('Failed to load the overview:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const defaultTab = useDefaultTab('admin', profile?.id);
  const unread = useMemo(() => unreadByProject(notifications), [notifications]);
  const queue = useMemo(() => workQueue(projects ?? [], { role: 'admin', unreadByProject: unread }), [projects, unread]);
  const open = (projects ?? []).filter(isOpenProject);
  const needsManager = open.filter((project) => !project.assignee).length;
  const byStatus = useMemo(() => countByStatus(projects ?? []), [projects]);
  const recent = useMemo(() => sortProjectsForList(projects ?? []).slice(0, RECENT_LIMIT), [projects]);

  if (isLoading) {
    return (
      <WorkspaceShell role="admin" title="Overview">
        <LoadingState label="Loading..." />
      </WorkspaceShell>
    );
  }

  const count = (value) => (value === null || value === undefined ? '—' : value);

  const needsAction = (
    <>
      {staffRequests > 0 && (
        <section className="crm-card" aria-labelledby="staff-requests-heading">
          <h2 id="staff-requests-heading" className="crm-section-title">Staff requests</h2>
          <p>
            <Link href="/admin/users">
              {staffRequests === 1 ? '1 person is waiting for staff access' : `${staffRequests} people are waiting for staff access`}
            </Link>
          </p>
        </section>
      )}
      {needsManager > 0 && (
        <p>
          <Link href="/admin/projects?pm=none">
            {needsManager === 1 ? '1 project needs a project manager' : `${needsManager} projects need a project manager`}
          </Link>
        </p>
      )}
      {projects === null ? (
        <p className="crm-form-error" role="alert">Projects could not be loaded. Refresh to try again.</p>
      ) : (
        <StaffProjectList
          items={queue}
          hrefFor={hrefFor}
          showManager
          unreadByProject={unread}
          emptyText="Nothing needs you right now."
        />
      )}
    </>
  );

  const projectsTab = (
    <>
      <div className="crm-stat-grid">
        <div className={`crm-stat${needsManager ? ' crm-stat-alert' : ''}`}>
          <p className="crm-stat-label">Open projects</p>
          <p className="crm-stat-value">{projects ? open.length : '—'}</p>
          {needsManager ? (
            <Link href="/admin/projects?pm=none">
              {needsManager === 1 ? '1 needs a project manager' : `${needsManager} need a project manager`}
            </Link>
          ) : (
            <Link href="/admin/projects">Manage</Link>
          )}
        </div>
      </div>
      {byStatus.size > 0 && (
        <section aria-labelledby="by-status-heading">
          <h2 id="by-status-heading" className="crm-section-title">By status</h2>
          <ul className="crm-status-summary">
            {PROJECT_STATUSES.filter((status) => byStatus.has(status)).map((status) => (
              <li key={status}>
                <Link href={`/admin/projects?status=${status}`} className="crm-status-chip">
                  <span className={projectStatusBadgeClass(status)}>{projectStatusLabel(status)}</span>
                  {byStatus.get(status)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section aria-labelledby="recent-heading">
        <h2 id="recent-heading" className="crm-section-title">Latest activity</h2>
        <StaffProjectList
          items={recent.map((project) => ({ project }))}
          hrefFor={hrefFor}
          showManager
          unreadByProject={unread}
          emptyText="No projects yet."
        />
        <p><Link href="/admin/projects">All projects</Link></p>
      </section>
    </>
  );

  const crmTab = (
    <>
      <div className="crm-stat-grid">
        {[
          { label: 'Companies', value: stats?.companies, href: '/admin/companies' },
          { label: 'Contacts', value: stats?.contacts, href: '/admin/contacts' },
          { label: 'Deals', value: stats?.deals, href: '/admin/deals' },
          { label: 'Tasks', value: stats?.tasks, href: '/admin/tasks' },
        ].map((stat) => (
          <div key={stat.label} className="crm-stat">
            <p className="crm-stat-label">{stat.label}</p>
            <p className="crm-stat-value">{count(stat.value)}</p>
            <Link href={stat.href}>Manage</Link>
          </div>
        ))}
      </div>
      <section className="crm-card" aria-labelledby="quick-actions-heading">
        <h2 id="quick-actions-heading" className="crm-section-title">Quick actions</h2>
        <div className="crm-quick-links">
          <Link href="/admin/companies/new" className="crm-button crm-button-ghost">+ New company</Link>
          <Link href="/admin/contacts/new" className="crm-button crm-button-ghost">+ New contact</Link>
          <Link href="/admin/deals/new" className="crm-button crm-button-ghost">+ New deal</Link>
          <Link href="/admin/tasks/new" className="crm-button crm-button-ghost">+ New task</Link>
          <Link href="/admin/users/invite" className="crm-button crm-button-ghost">+ New user</Link>
        </div>
      </section>
    </>
  );

  return (
    <WorkspaceShell
      role="admin"
      title="Overview"
      subtitle={`Welcome back, ${profile?.full_name || 'admin'}`}
    >
      <Tabs
        label="Overview sections"
        defaultId={defaultTab}
        tabs={[
          { id: 'needs-action', label: 'Needs action', badge: queue.length + (staffRequests > 0 ? 1 : 0), badgeLabel: 'to do', content: needsAction },
          { id: 'projects', label: 'Projects', content: projectsTab },
          { id: 'crm', label: 'CRM', content: crmTab },
        ]}
      />
    </WorkspaceShell>
  );
}
