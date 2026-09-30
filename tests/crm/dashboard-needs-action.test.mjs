import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Portal plan phase C1: the client dashboard home leads with what the client
// owes a decision on, then their projects, then the start-a-brief entry.
// Source-level pin in the style of tests/crm/client-workspace.test.mjs.

test('client dashboard: "Needs your action" renders before "Your projects", which renders before "Start a new brief"', async () => {
  const dashboard = await readFile('app/dashboard/page.jsx', 'utf8');

  const needsAction = dashboard.indexOf('needs-action-heading');
  const projects = dashboard.indexOf('projects-heading');
  const startBrief = dashboard.indexOf('start-brief-heading');

  assert.notEqual(needsAction, -1, 'dashboard must render a "Needs your action" section');
  assert.notEqual(projects, -1, 'dashboard must render a "Your projects" section');
  assert.notEqual(startBrief, -1, 'dashboard must render a "Start a new brief" section');
  assert.ok(
    needsAction < projects && projects < startBrief,
    `section order must be needs-action (${needsAction}) < projects (${projects}) < start-brief (${startBrief})`,
  );
});
