export const PROJECT_CATEGORIES = Object.freeze([
  Object.freeze({ value: 'web_design', label: 'Web Design' }),
  Object.freeze({ value: 'web_development', label: 'Web Development' }),
  Object.freeze({ value: 'logo_creation', label: 'Logo Creation' }),
  Object.freeze({ value: 'branding', label: 'Branding' }),
  Object.freeze({ value: 'marketing', label: 'Marketing' }),
  Object.freeze({ value: 'animation', label: 'Animation & 3D' }),
  Object.freeze({ value: 'ai_automation', label: 'AI Automation' }),
  Object.freeze({ value: 'workflow_automation', label: 'Workflow Automation' }),
]);

export const PROJECT_STATUSES = Object.freeze([
  'brief_submitted',
  'planned',
  'in_progress',
  'client_review',
  'changes_requested',
  'approved',
  'delivered',
  'on_hold',
  'cancelled',
]);

// project_messages, project_attachments, project_status_history and
// project_deliverables all share the same two-value visibility domain
// (checked per-table in migrations 0009/0010). Clients only ever read the
// 'shared' half; 'internal' is staff-only.
export const MESSAGE_VISIBILITIES = Object.freeze(['shared', 'internal']);
export const RECORD_VISIBILITIES = MESSAGE_VISIBILITIES;

// project_tasks.status -- migration 0010 (project_tasks_status_check).
export const TASK_STATUSES = Object.freeze([
  'todo',
  'in_progress',
  'review',
  'done',
  'blocked',
]);

// project_tasks.priority -- three tiers only. Migration 0011 shipped a
// four-value check ('low','medium','high','urgent'); migration 0022 dropped
// 'urgent' to match what the RPC, UI select and badge CSS actually built.
// Anything that offers or validates a priority must use this list so a
// fourth tier can never drift back in unnoticed.
export const TASK_PRIORITIES = Object.freeze(['low', 'medium', 'high']);
export const DEFAULT_TASK_PRIORITY = 'medium';

// project_approvals.status / project_deliverables.status -- migration 0010.
export const APPROVAL_STATUSES = Object.freeze(['pending', 'approved', 'rejected']);
export const DELIVERABLE_STATUSES = Object.freeze([
  'draft',
  'submitted',
  'approved',
  'rejected',
]);

// project_attachments.status -- migration 0009. Only 'ready' rows are
// readable content; 'pending' rows are reserved-but-not-uploaded.
export const ATTACHMENT_STATUSES = Object.freeze(['pending', 'ready']);

// projects.brief -- the database check (migration 0009) permits 1..10000
// characters. The product deliberately enforces a tighter ceiling than the
// column allows; this is the app-level bound, not the schema's.
export const PROJECT_BRIEF_MIN_LENGTH = 1;
export const PROJECT_BRIEF_MAX_LENGTH = 5000;

export const ALLOWED_TRANSITIONS = Object.freeze({
  brief_submitted: Object.freeze(['planned', 'cancelled']),
  planned: Object.freeze(['in_progress', 'on_hold', 'cancelled']),
  in_progress: Object.freeze(['client_review', 'on_hold', 'cancelled']),
  client_review: Object.freeze(['changes_requested', 'approved', 'on_hold', 'cancelled']),
  changes_requested: Object.freeze(['in_progress', 'on_hold', 'cancelled']),
  approved: Object.freeze(['delivered', 'on_hold', 'cancelled']),
  delivered: Object.freeze([]),
  on_hold: Object.freeze(['planned', 'in_progress', 'cancelled']),
  cancelled: Object.freeze([]),
});

const PROJECT_TITLE_ERROR = 'Project title must be 3 to 120 characters.';
const CANONICAL_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PROJECT_ROLES = Object.freeze(['client', 'project_manager', 'admin']);

export function normalizeProjectTitle(value) {
  const title = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

  if (title.length < 3 || title.length > 120) {
    throw new Error(PROJECT_TITLE_ERROR);
  }

  return title;
}

export function isProjectCategory(value) {
  return PROJECT_CATEGORIES.some((category) => category.value === value);
}

export function isProjectStatus(value) {
  return PROJECT_STATUSES.includes(value);
}

export function isVisibility(value) {
  return RECORD_VISIBILITIES.includes(value);
}

export function isTaskStatus(value) {
  return TASK_STATUSES.includes(value);
}

export function isTaskPriority(value) {
  return TASK_PRIORITIES.includes(value);
}

export function isApprovalStatus(value) {
  return APPROVAL_STATUSES.includes(value);
}

export function isDeliverableStatus(value) {
  return DELIVERABLE_STATUSES.includes(value);
}

export function canTransition(from, to) {
  const allowedTransitions = ALLOWED_TRANSITIONS[from];
  return Array.isArray(allowedTransitions) && allowedTransitions.includes(to);
}

/**
 * Internal collaboration (audit notes, internal messages, outbox metadata) is
 * only ever visible to project managers and admins. Clients receive a
 * client-visible projection instead. Returns false for any unknown role.
 */
export function canViewInternal(role) {
  return role === 'project_manager' || role === 'admin';
}

export function canPostVisibility(role, visibility) {
  if (!PROJECT_ROLES.includes(role) || !MESSAGE_VISIBILITIES.includes(visibility)) {
    return false;
  }

  return visibility === 'shared' || role === 'project_manager' || role === 'admin';
}

function requireProjectId(projectId) {
  if (typeof projectId !== 'string' || !CANONICAL_UUID_PATTERN.test(projectId)) {
    throw new Error('Invalid project id.');
  }
}

export function sharedProjectTopic(projectId) {
  requireProjectId(projectId);
  return `project:${projectId}:shared`;
}

export function internalProjectTopic(projectId) {
  requireProjectId(projectId);
  return `project:${projectId}:internal`;
}
