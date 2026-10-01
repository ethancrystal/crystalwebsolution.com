import test from 'node:test';
import assert from 'node:assert/strict';

import {
  STALE_AFTER_DAYS,
  countByStatus,
  daysSince,
  isOpenProject,
  sortProjectsForList,
  unreadByProject,
  workQueue,
} from '../../lib/crm/work-queue.mjs';
import { PROJECT_STATUSES } from '../../lib/crm/project-contract.mjs';
import { STAFF_ACTION_STATUSES, staffStatusMeaning } from '../../lib/crm/labels.mjs';

const NOW = Date.parse('2026-09-30T12:00:00Z');
const daysAgo = (days) => new Date(NOW - days * 24 * 60 * 60 * 1000).toISOString();
const PM = { id: 'pm', full_name: 'Ethan Ray' };

function project(id, status, { assignee = PM, updated = 1 } = {}) {
  return { id, title: id, status, assignee, updated_at: daysAgo(updated) };
}

const kinds = (item) => item.reasons.map((reason) => reason.kind);

test('every status has team-facing wording, and the team acts on real statuses', () => {
  for (const status of PROJECT_STATUSES) assert.ok(staffStatusMeaning(status), status);
  for (const status of STAFF_ACTION_STATUSES) assert.ok(PROJECT_STATUSES.includes(status), status);
});

test('admin: unassigned open projects come first; closed ones never need a manager', () => {
  const queue = workQueue([
    project('quiet', 'in_progress', { updated: 10 }),
    project('new', 'brief_submitted', { assignee: null }),
    project('done', 'delivered', { assignee: null, updated: 30 }),
  ], { role: 'admin', now: NOW });
  assert.deepEqual(queue.map((item) => item.project.id), ['new', 'quiet']);
  assert.deepEqual(kinds(queue[0]), ['no_manager']);
  assert.deepEqual(kinds(queue[1]), ['stale']);
  assert.equal(queue[1].reasons[0].text, 'No update in 10 days');
});

test('admin is not shown the project manager\'s own moves', () => {
  const queue = workQueue([project('p', 'changes_requested')], { role: 'admin', now: NOW });
  assert.deepEqual(queue, []);
});

test('project manager: their moves, unread updates, and quiet projects', () => {
  const unread = new Map([['msg', 2]]);
  const queue = workQueue([
    project('changes', 'changes_requested'),
    project('msg', 'in_progress'),
    project('quiet', 'in_progress', { updated: STALE_AFTER_DAYS }),
    project('fresh', 'in_progress'),
    project('client', 'client_review', { updated: 20 }),
  ], { role: 'project_manager', unreadByProject: unread, now: NOW });

  assert.deepEqual(queue.map((item) => item.project.id), ['msg', 'changes', 'quiet']);
  assert.equal(queue[0].reasons[0].text, '2 new updates');
  assert.equal(queue[1].reasons[0].text, 'Your move');
});

test('a project waiting on the client is never flagged as quiet', () => {
  const queue = workQueue([project('client', 'client_review', { updated: 40 })], { role: 'project_manager', now: NOW });
  assert.deepEqual(queue, []);
});

test('unread counts ignore read rows and rows without a project', () => {
  const counts = unreadByProject([
    { project_id: 'a', read_at: null },
    { project_id: 'a', read_at: null },
    { project_id: 'a', read_at: '2026-09-30T00:00:00Z' },
    { project_id: null, read_at: null },
    { project_id: 'b', read_at: null },
  ]);
  assert.deepEqual([...counts], [['a', 2], ['b', 1]]);
});

test('lists put open projects first, newest first; statuses are counted', () => {
  const sorted = sortProjectsForList([
    project('old-open', 'planned', { updated: 5 }),
    project('done', 'delivered', { updated: 0 }),
    project('new-open', 'in_progress', { updated: 1 }),
  ]);
  assert.deepEqual(sorted.map((item) => item.id), ['new-open', 'old-open', 'done']);
  assert.equal(isOpenProject({ status: 'cancelled' }), false);
  assert.deepEqual([...countByStatus(sorted)].sort(), [['delivered', 1], ['in_progress', 1], ['planned', 1]]);
});

test('daysSince tolerates missing or bad dates', () => {
  assert.equal(daysSince(null, NOW), null);
  assert.equal(daysSince('not a date', NOW), null);
  assert.equal(daysSince(daysAgo(3), NOW), 3);
});
