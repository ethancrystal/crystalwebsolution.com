// Small, dependency-free helpers shared by the CRM task screens (the legacy
// `tasks` table pages under app/admin/tasks and the project task list). Plain
// ESM with no imports so it runs under `node --test` as well as inside Next.

// The status list the task forms offer (project-contract.mjs TASK_STATUSES:
// todo, in_progress, review, done, blocked). The legacy `tasks` table has no
// CHECK constraint and defaulted to 'open', and the old forms wrote
// 'completed' -- so rows written before the lists were unified still carry
// those two values.
const LEGACY_TASK_STATUS_ALIASES = Object.freeze({ open: 'todo', completed: 'done' });

// A task in one of these statuses is finished, so it can never be overdue.
// 'completed' is kept for rows written before 'done' became the status.
const CLOSED_TASK_STATUSES = new Set(['done', 'completed']);

/**
 * Map a stored task status onto one the form's select actually offers, so the
 * value the select shows is the value that gets saved. Statuses that are
 * already offered (and anything unknown) pass through; empty falls back to
 * `fallback` (the first real option).
 *
 * @param {string | null | undefined} status
 * @param {string} fallback
 */
export function normalizeTaskStatus(status, fallback) {
  if (!status) return fallback;
  return LEGACY_TASK_STATUS_ALIASES[status] ?? status;
}

/** @param {string | null | undefined} status */
export function isTaskClosed(status) {
  return CLOSED_TASK_STATUSES.has(status ?? '');
}

// Today as a local "YYYY-MM-DD" string, the same shape as a DATE column, so
// due dates compare as plain strings with no timezone arithmetic.
/** @param {Date} [now] */
export function todayDateOnly(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * A task is overdue when it has a due date before today and is not finished.
 *
 * @param {{ due_date?: string | null, status?: string | null } | null | undefined} task
 * @param {Date} [now]
 */
export function isTaskOverdue(task, now = new Date()) {
  if (!task || !task.due_date || isTaskClosed(task.status)) return false;
  return task.due_date < todayDateOnly(now);
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Format a Postgres DATE ("YYYY-MM-DD") for display without a timezone
 * shift. `new Date('2026-09-05')` parses as UTC midnight, which
 * `toLocaleDateString()` then renders as Sept 4 west of UTC; formatting the
 * same instant in UTC keeps the calendar day the author picked. Anything that
 * is not date-only (a full timestamp) formats in the viewer's timezone as
 * before.
 *
 * @param {string | null | undefined} value
 * @param {string | string[]} [locale] defaults to the viewer's locale
 * @param {Intl.DateTimeFormatOptions} [options]
 */
export function formatDateOnly(value, locale, options) {
  if (!value) return '-';
  if (DATE_ONLY.test(value)) {
    const date = new Date(`${value}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(locale, { ...options, timeZone: 'UTC' });
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(locale, options);
}
