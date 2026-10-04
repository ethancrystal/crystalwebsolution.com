import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { TASK_STATUSES } from '../../lib/crm/project-contract.mjs';
import {
  formatDateOnly,
  isTaskClosed,
  isTaskOverdue,
  normalizeTaskStatus,
  todayDateOnly,
} from '../../components/crm/taskUtils.mjs';

// F2: the legacy `tasks` forms wrote status 'open' (a value their own select
// never offered) and treated only 'completed' as finished, so 'done' tasks
// showed as overdue. F3: a "YYYY-MM-DD" due date shown in the previous day
// west of UTC.

const NOW = new Date(2026, 8, 15, 12, 0, 0); // 2026-09-15, local time

test('normalizeTaskStatus maps legacy values onto statuses the select offers', () => {
  assert.equal(normalizeTaskStatus('open', 'todo'), 'todo');
  assert.equal(normalizeTaskStatus('completed', 'todo'), 'done');
  assert.equal(normalizeTaskStatus(null, 'todo'), 'todo');
  assert.equal(normalizeTaskStatus(undefined, 'todo'), 'todo');
  assert.equal(normalizeTaskStatus('', 'todo'), 'todo');
  for (const status of TASK_STATUSES) {
    assert.equal(normalizeTaskStatus(status, 'todo'), status, `${status} passes through`);
  }
});

test('done and completed tasks are closed, so they are never overdue', () => {
  assert.equal(isTaskClosed('done'), true);
  assert.equal(isTaskClosed('completed'), true);
  for (const status of ['todo', 'in_progress', 'review', 'blocked', 'open', null, undefined]) {
    assert.equal(isTaskClosed(status), false, `${status} is open`);
  }

  const pastDue = '2026-09-01';
  assert.equal(isTaskOverdue({ due_date: pastDue, status: 'todo' }, NOW), true);
  assert.equal(isTaskOverdue({ due_date: pastDue, status: 'open' }, NOW), true);
  assert.equal(isTaskOverdue({ due_date: pastDue, status: 'done' }, NOW), false);
  assert.equal(isTaskOverdue({ due_date: pastDue, status: 'completed' }, NOW), false);
  assert.equal(isTaskOverdue({ due_date: null, status: 'todo' }, NOW), false);
  assert.equal(isTaskOverdue(null, NOW), false);
});

test('a task is overdue only after its due day has passed', () => {
  assert.equal(todayDateOnly(NOW), '2026-09-15');
  assert.equal(isTaskOverdue({ due_date: '2026-09-15', status: 'todo' }, NOW), false);
  assert.equal(isTaskOverdue({ due_date: '2026-09-14', status: 'todo' }, NOW), true);
});

test('formatDateOnly keeps the calendar day west of UTC', () => {
  const originalTz = process.env.TZ;
  try {
    process.env.TZ = 'America/Los_Angeles';
    // Control: this is the bug. A date-only string parses as UTC midnight,
    // which is still the 4th in Los Angeles.
    assert.equal(new Date('2026-09-05').toLocaleDateString('en-US'), '9/4/2026');
    assert.equal(formatDateOnly('2026-09-05', 'en-US'), '9/5/2026');

    process.env.TZ = 'Pacific/Auckland';
    assert.equal(formatDateOnly('2026-09-05', 'en-US'), '9/5/2026');
    assert.equal(
      formatDateOnly('2026-12-01', 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      'December 1, 2026',
    );
  } finally {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  }
});

test('formatDateOnly handles empty, invalid and timestamp values', () => {
  assert.equal(formatDateOnly(null), '-');
  assert.equal(formatDateOnly(''), '-');
  assert.equal(formatDateOnly('not a date'), '-');
  // A full timestamp is still an instant in the viewer's timezone.
  assert.notEqual(formatDateOnly('2026-09-05T12:00:00Z', 'en-US'), '-');
});

// Source contracts for the pages the helpers are wired into.

async function read(path) {
  return readFile(path, 'utf8');
}

test('new task page defaults to the first real status option, not "open"', async () => {
  const source = await read('app/admin/tasks/new/page.jsx');
  assert.match(source, /status: STATUS_OPTIONS\[0\]/);
  assert.doesNotMatch(source, /status: 'open'/);
});

test('edit task page maps a legacy status onto an offered option', async () => {
  const source = await read('app/admin/tasks/[id]/edit/page.jsx');
  assert.match(source, /normalizeTaskStatus\(task\.status, STATUS_OPTIONS\[0\]\)/);
  assert.doesNotMatch(source, /task\.status \|\| 'open'/);
  assert.doesNotMatch(source, /status: 'open'/);
});

test('task list and detail share the closed-aware overdue check', async () => {
  for (const path of ['app/admin/tasks/page.jsx', 'app/admin/tasks/[id]/page.jsx']) {
    const source = await read(path);
    assert.match(source, /isTaskOverdue/, path);
    assert.doesNotMatch(source, /status === 'completed'/, `${path} must not hard-code one closed status`);
  }
});

test('project task due dates are formatted without a timezone shift', async () => {
  const source = await read('components/crm/ProjectTasks.jsx');
  assert.match(source, /formatDateOnly\(task\.due_date\)/);
  assert.doesNotMatch(source, /new Date\(task\.due_date\)/);
});
