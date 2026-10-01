// Human labels for CRM values, so no page shows a raw enum such as
// `brief_submitted` or `web_design`. Plain ESM (no imports beyond the
// contract) so it runs under `node --test` as well as inside Next.
//
// Tones map to the badge classes in app/styles/crm.css
// (crm-badge-info / -success / -warning / -danger, or plain crm-badge).

import { PROJECT_CATEGORIES, TERMINAL_PROJECT_STATUSES } from './project-contract.mjs';

const PROJECT_STATUS_META = Object.freeze({
  brief_submitted: { label: 'Brief received', tone: 'info', meaning: 'We have your brief and are assigning a project manager.' },
  planned: { label: 'Planned', tone: 'info', meaning: 'Your project manager is planning the work.' },
  in_progress: { label: 'In progress', tone: 'info', meaning: 'The team is working on your project.' },
  client_review: { label: 'Ready for your review', tone: 'warning', meaning: 'Something is ready for you to look at.' },
  changes_requested: { label: 'Changes requested', tone: 'warning', meaning: 'The team is working through your changes.' },
  approved: { label: 'Approved', tone: 'success', meaning: 'Approved. Final delivery is next.' },
  delivered: { label: 'Delivered', tone: 'success', meaning: 'Your project has been delivered.' },
  on_hold: { label: 'On hold', tone: 'neutral', meaning: 'This project is paused for now.' },
  cancelled: { label: 'Cancelled', tone: 'danger', meaning: 'This project was cancelled.' },
});

// Statuses where the client is the one expected to act.
export const CLIENT_ACTION_STATUSES = Object.freeze(['client_review']);

// Statuses where the project manager is the one expected to act.
export const STAFF_ACTION_STATUSES = Object.freeze(['brief_submitted', 'planned', 'changes_requested', 'approved']);

// Projects that are finished or stopped; everything else is open. Derived
// from the contract, which pins it to the statuses with no outgoing
// transition (tests/crm/contract-drift-hardening.test.mjs).
export const CLOSED_PROJECT_STATUSES = new Set(TERMINAL_PROJECT_STATUSES);

// The same statuses, worded for the team rather than the client.
const STAFF_STATUS_MEANINGS = Object.freeze({
  brief_submitted: 'New brief: read it and plan the work.',
  planned: 'Planned: start the work when ready.',
  in_progress: 'In progress.',
  client_review: 'Waiting on the client’s review.',
  changes_requested: 'The client asked for changes.',
  approved: 'Approved: deliver the final files.',
  delivered: 'Delivered.',
  on_hold: 'On hold.',
  cancelled: 'Cancelled.',
});

export function staffStatusMeaning(status) {
  return STAFF_STATUS_MEANINGS[status] ?? '';
}

export function projectStatusLabel(status) {
  if (!status) return '';
  return PROJECT_STATUS_META[status]?.label ?? String(status).replace(/_/g, ' ');
}

export function projectStatusTone(status) {
  return PROJECT_STATUS_META[status]?.tone ?? 'neutral';
}

export function projectStatusMeaning(status) {
  return PROJECT_STATUS_META[status]?.meaning ?? '';
}

// crm.css badge class for a status: `crm-badge crm-badge-info`, etc.
export function projectStatusBadgeClass(status) {
  const tone = projectStatusTone(status);
  return tone === 'neutral' ? 'crm-badge' : `crm-badge crm-badge-${tone}`;
}

export function projectCategoryLabel(category) {
  if (!category) return '';
  return PROJECT_CATEGORIES.find((entry) => entry.value === category)?.label ?? String(category).replace(/_/g, ' ');
}

const TASK_STATUS_LABELS = Object.freeze({
  todo: 'To do',
  in_progress: 'In progress',
  review: 'In review',
  done: 'Done',
  blocked: 'Blocked',
});

export function taskStatusLabel(status) {
  if (!status) return '';
  return TASK_STATUS_LABELS[status] ?? String(status).replace(/_/g, ' ');
}

const APPROVAL_STATUS_LABELS = Object.freeze({ pending: 'Waiting', approved: 'Approved', rejected: 'Changes requested' });

export function approvalStatusLabel(status) {
  if (!status) return '';
  return APPROVAL_STATUS_LABELS[status] ?? String(status).replace(/_/g, ' ');
}
