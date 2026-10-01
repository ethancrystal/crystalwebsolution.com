'use client';

import Link from 'next/link';
import { projectStatusBadgeClass, projectStatusLabel, staffStatusMeaning } from '@/lib/crm/labels.mjs';

// Project rows for the admin overview and the project manager's dashboard
// (styles: app/styles/crm.css, "staff project list"). Each item is
// { project, reasons? } where reasons come from lib/crm/work-queue.mjs.
// People are shown by name only.

function formatDate(value) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function StaffProjectList({ items = [], hrefFor, showManager = false, unreadByProject, emptyText }) {
  if (items.length === 0) {
    return <p className="crm-empty">{emptyText}</p>;
  }

  return (
    <ul className="crm-staff-list">
      {items.map(({ project, reasons = [] }) => {
        const unread = unreadByProject?.get(project.id) ?? 0;
        const meta = [
          project.company?.name,
          showManager ? (project.assignee?.full_name ? `PM: ${project.assignee.full_name}` : 'No project manager') : null,
        ].filter(Boolean);
        return (
          <li key={project.id} className="crm-staff-item">
            <div className="crm-staff-head">
              <Link href={hrefFor(project)} className="crm-staff-title">{project.title}</Link>
              {unread > 0 && (
                <span className="crm-count-badge">
                  {unread}
                  {' '}
                  <span className="crm-visually-hidden">{unread === 1 ? 'new update' : 'new updates'}</span>
                </span>
              )}
            </div>
            {meta.length > 0 && <p className="crm-staff-meta">{meta.join(' · ')}</p>}
            <p className="crm-staff-status">
              <span className={projectStatusBadgeClass(project.status)}>{projectStatusLabel(project.status)}</span>
              <span>{staffStatusMeaning(project.status)}</span>
            </p>
            {reasons.length > 0 && (
              <ul className="crm-reasons" aria-label="Why it is here">
                {reasons.map((reason) => (
                  <li key={reason.kind} className={`crm-reason crm-reason-${reason.kind}`}>{reason.text}</li>
                ))}
              </ul>
            )}
            {(project.updated_at || project.created_at) && (
              <p className="crm-staff-updated">Updated {formatDate(project.updated_at ?? project.created_at)}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
