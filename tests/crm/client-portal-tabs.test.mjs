import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for the tabbed client project page and the client
// dashboard (portal Phase 1). Tab behaviour itself is in
// tests/crm/tabs.test.jsx; the manager card in
// tests/crm/project-manager-card.test.jsx.

test('the client project page is split into five tabs', async () => {
  const page = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');
  assert.match(page, /<Tabs label="Project sections" tabs=\{tabs\} value=\{tab\} onChange=\{openTab\} \/>/);
  for (const id of ['overview', 'messages', 'files', 'tasks', 'brief']) {
    assert.match(page, new RegExp(`id: '${id}'`), id);
  }
});

test('the client page shows the manager by name and keeps Project Updates', async () => {
  const page = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');
  assert.match(page, /<ProjectManagerCard available=\{manager\.available\} name=\{manager\.name\}/);
  // Clients post shared updates through NotesPanel (post_project_note).
  assert.match(page, /<NotesPanel projectId=\{projectId\} \/>/);
  assert.doesNotMatch(page, /email/i);
});

test('opening Messages or Files marks that tab\'s notifications read', async () => {
  const page = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');
  assert.match(page, /messages: \['project\.message_posted', 'project\.message_edited'\]/);
  assert.match(page, /files: \['project\.deliverable_published'\]/);
  assert.match(page, /await markNotificationsRead\(formData\)/);
});

test('the brief=submitted banner keeps the other query parameters', async () => {
  const page = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');
  assert.match(page, /url\.searchParams\.delete\('brief'\)/);
  assert.doesNotMatch(page, /replaceState\(null, '', window\.location\.pathname\)/);
});

test('the dashboard uses shared status labels and flags projects that need the client', async () => {
  const dashboard = await readFile('app/dashboard/page.jsx', 'utf8');
  assert.doesNotMatch(dashboard, /PROJECT_STATUS_LABELS/);
  assert.match(dashboard, /projectStatusBadgeClass\(project\.status\)/);
  assert.match(dashboard, /CLIENT_ACTION_STATUSES\.includes\(project\.status\)/);
  assert.match(dashboard, /Needs your attention/);
  // Unread counts and names are secondary reads: they settle with the briefs
  // and never block the project list.
  const settled = dashboard.slice(dashboard.indexOf('Promise.allSettled'));
  assert.match(settled, /listNotifications\(supabase, viewerProfile\)/);
  assert.match(settled, /getProjectManagerNames\(supabase, projectIds\)/);
});
