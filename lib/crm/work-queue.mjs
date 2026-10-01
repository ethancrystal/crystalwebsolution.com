// What needs attention on the staff dashboards, and why. Plain ESM so it runs
// under `node --test` as well as inside Next.
//
//   workQueue(projects, { role, unreadByProject, now })
//     -> [{ project, reasons: [{ kind, text }] }], most urgent first
//
// Admin ("Needs action"): open projects without a project manager, projects
// with unread updates for the admin, and open projects gone quiet.
// Project manager ("Needs you"): projects where it is the manager's move
// (STAFF_ACTION_STATUSES), unread updates, and open projects gone quiet.
// A project waiting on the client is never "quiet": the ball is not ours.

import { CLIENT_ACTION_STATUSES, CLOSED_PROJECT_STATUSES, STAFF_ACTION_STATUSES } from './labels.mjs';

export const STALE_AFTER_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;
const WEIGHT = { no_manager: 0, unread: 1, your_move: 2, stale: 3 };

export function isOpenProject(project) {
  return Boolean(project) && !CLOSED_PROJECT_STATUSES.includes(project.status);
}

// Unread in-app notifications per project id.
export function unreadByProject(notifications) {
  const counts = new Map();
  for (const notification of notifications ?? []) {
    if (!notification?.project_id || notification.read_at) continue;
    counts.set(notification.project_id, (counts.get(notification.project_id) ?? 0) + 1);
  }
  return counts;
}

export function daysSince(value, now = Date.now()) {
  const time = value ? new Date(value).getTime() : NaN;
  if (Number.isNaN(time)) return null;
  return Math.max(0, Math.floor((now - time) / DAY_MS));
}

function reasonsFor(project, { role, unread, now }) {
  const reasons = [];
  const open = isOpenProject(project);

  if (role === 'admin' && open && !project.assignee) {
    reasons.push({ kind: 'no_manager', text: 'Needs a project manager' });
  }
  if (unread > 0) {
    reasons.push({ kind: 'unread', text: unread === 1 ? '1 new update' : `${unread} new updates` });
  }
  if (role === 'project_manager' && STAFF_ACTION_STATUSES.includes(project.status)) {
    // The status line under it already says what the move is.
    reasons.push({ kind: 'your_move', text: 'Your move' });
  }
  const quietFor = daysSince(project.updated_at ?? project.created_at, now);
  if (open && !CLIENT_ACTION_STATUSES.includes(project.status) && quietFor !== null && quietFor >= STALE_AFTER_DAYS) {
    reasons.push({ kind: 'stale', text: `No update in ${quietFor} days` });
  }
  return reasons;
}

export function workQueue(projects, { role, unreadByProject: unread = new Map(), now = Date.now() } = {}) {
  const items = [];
  for (const project of projects ?? []) {
    const reasons = reasonsFor(project, { role, unread: unread.get(project.id) ?? 0, now });
    if (reasons.length > 0) items.push({ project, reasons });
  }
  const oldest = (item) => new Date(item.project.updated_at ?? item.project.created_at ?? 0).getTime() || 0;
  return items.sort((a, b) => (
    Math.min(...a.reasons.map((reason) => WEIGHT[reason.kind]))
      - Math.min(...b.reasons.map((reason) => WEIGHT[reason.kind]))
    || oldest(a) - oldest(b)
  ));
}

// Open projects first (most recently updated first), then finished ones.
export function sortProjectsForList(projects) {
  const updated = (project) => new Date(project.updated_at ?? project.created_at ?? 0).getTime() || 0;
  return [...(projects ?? [])].sort((a, b) => (
    Number(isOpenProject(b)) - Number(isOpenProject(a)) || updated(b) - updated(a)
  ));
}

// Count of projects per status, for the status summary.
export function countByStatus(projects) {
  const counts = new Map();
  for (const project of projects ?? []) counts.set(project.status, (counts.get(project.status) ?? 0) + 1);
  return counts;
}
