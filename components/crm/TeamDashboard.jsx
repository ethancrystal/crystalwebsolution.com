'use client';

import { useMemo } from 'react';
import Tabs from '@/components/crm/Tabs';
import { useDefaultTab } from '@/components/crm/useDefaultTab';
import StaffProjectList from '@/components/crm/StaffProjectList';
import { isOpenProject, sortProjectsForList, workQueue } from '@/lib/crm/work-queue.mjs';

// The project manager's home: "Needs you" (their move, unread updates,
// projects gone quiet) and "My projects". Data is read on the server by
// app/team/page.jsx; unread counts arrive as a plain object.

const hrefFor = (project) => `/team/projects/${project.id}`;

export default function TeamDashboard({ projects = [], unread = {}, userId }) {
  const defaultTab = useDefaultTab('project_manager', userId);
  const unreadByProject = useMemo(() => new Map(Object.entries(unread)), [unread]);
  const queue = useMemo(
    () => workQueue(projects, { role: 'project_manager', unreadByProject }),
    [projects, unreadByProject],
  );
  const sorted = useMemo(() => sortProjectsForList(projects), [projects]);
  const openCount = projects.filter(isOpenProject).length;

  if (projects.length === 0) {
    return <p className="crm-empty">You do not have any assigned projects yet.</p>;
  }

  return (
    <Tabs
      label="Your work"
      defaultId={defaultTab}
      tabs={[
        {
          id: 'needs-you',
          label: 'Needs you',
          badge: queue.length,
          badgeLabel: 'to do',
          content: (
            <StaffProjectList
              items={queue}
              hrefFor={hrefFor}
              unreadByProject={unreadByProject}
              emptyText="Nothing needs you right now. Nice."
            />
          ),
        },
        {
          id: 'projects',
          label: `My projects (${openCount} open)`,
          content: (
            <StaffProjectList
              items={sorted.map((project) => ({ project }))}
              hrefFor={hrefFor}
              unreadByProject={unreadByProject}
              emptyText="You do not have any assigned projects yet."
            />
          ),
        },
      ]}
    />
  );
}
