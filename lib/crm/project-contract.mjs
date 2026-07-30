export const PROJECT_CATEGORIES = Object.freeze([
  Object.freeze({ value: 'web_design', label: 'Web Design' }),
  Object.freeze({ value: 'logo_creation', label: 'Logo Creation' }),
  Object.freeze({ value: 'branding', label: 'Branding' }),
  Object.freeze({ value: 'marketing', label: 'Marketing' }),
  Object.freeze({ value: 'ai_automation', label: 'AI Automation' }),
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

export const MESSAGE_VISIBILITIES = Object.freeze(['shared', 'internal']);

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

export function canTransition(from, to) {
  const allowedTransitions = ALLOWED_TRANSITIONS[from];
  return Array.isArray(allowedTransitions) && allowedTransitions.includes(to);
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
