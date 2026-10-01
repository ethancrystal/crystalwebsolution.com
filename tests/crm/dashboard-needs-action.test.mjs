import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Portal plan phase C1: the client dashboard home leads with what the client
// owes a decision on, then their projects, then the start-a-brief entry.
// Source-level pin in the style of tests/crm/client-workspace.test.mjs.
// Since v1.109 the "needs action" surface is the "Needs your attention"
// strip (client-action statuses plus unread updates), rendered before the
// sectionOrder list (projects -> drafts -> start for returning clients).

test('client dashboard: "Needs your attention" renders before "Your projects", which renders before "Start a new brief"', async () => {
  const dashboard = await readFile('app/dashboard/page.jsx', 'utf8');

  const attention = dashboard.indexOf('attention-heading');
  const projects = dashboard.indexOf('projects-heading');
  const startBrief = dashboard.indexOf('start-brief-heading');

  assert.notEqual(attention, -1, 'dashboard must render a "Needs your attention" strip');
  assert.notEqual(projects, -1, 'dashboard must render a "Your projects" section');
  assert.notEqual(startBrief, -1, 'dashboard must render a "Start a new brief" section');
  assert.ok(
    attention < projects && projects < startBrief,
    `section order must be attention (${attention}) < projects (${projects}) < start-brief (${startBrief})`,
  );
  // The attention strip fires on client-action statuses and unread updates,
  // not just client_review.
  assert.match(dashboard, /CLIENT_ACTION_STATUSES\.includes\(project\.status\)/);
  assert.match(dashboard, /unreadByProject\[project\.id\]/);
});

test('client dashboard: the first-run tour mounts with a replay affordance (C1)', async () => {
  const dashboard = await readFile('app/dashboard/page.jsx', 'utf8');

  assert.match(dashboard, /import PortalTour from '@\/components\/crm\/PortalTour'/);
  assert.match(dashboard, /<PortalTour replayToken=\{tourReplayToken\} \/>/);
  assert.match(dashboard, /Replay tour/);
});
