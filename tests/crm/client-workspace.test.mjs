import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('client workspace: dashboard and project detail use exact client guard and shared read model', async () => {
  const dashboard = await readFile('app/dashboard/page.jsx', 'utf8');
  const projectDetail = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');

  assert.match(dashboard, /listProjectsForViewer/);
  assert.match(projectDetail, /getProjectWorkspace/);
  // Messages are owned by ProjectThread (via useProjectThread), not the page.
  assert.match(projectDetail, /ProjectThread/);

  assert.doesNotMatch(dashboard, /from\('deals'\)/);
  assert.doesNotMatch(projectDetail, /from\('deals'\)/);
  assert.doesNotMatch(dashboard, /profiles\(/i);
});

test('client workspace: project components are project-scoped, not deal-scoped', async () => {
  const thread = [
    await readFile('components/crm/ProjectThread.jsx', 'utf8'),
    await readFile('components/crm/useProjectThread.js', 'utf8'),
  ].join('\n');
  const notes = await readFile('components/crm/NotesPanel.jsx', 'utf8');

  assert.match(thread, /project_id|projectId/);
  assert.doesNotMatch(thread, /deal_id|dealId/);
  assert.match(notes, /project_id|projectId/);
  assert.doesNotMatch(notes, /deal_id|dealId/);
});

test('client workspace: workspace components exist', async () => {
  const workspace = await readFile('components/crm/WorkspaceShell.jsx', 'utf8');
  const overview = await readFile('components/crm/ProjectOverview.jsx', 'utf8');
  const timeline = await readFile('components/crm/ProjectTimeline.jsx', 'utf8');
  const tasks = await readFile('components/crm/ProjectTasks.jsx', 'utf8');
  const files = await readFile('components/crm/ProjectFiles.jsx', 'utf8');
  const approvals = await readFile('components/crm/ProjectApprovals.jsx', 'utf8');

  assert.match(workspace, /WorkspaceShell/);
  assert.match(overview, /ProjectOverview/);
  assert.match(timeline, /ProjectTimeline/);
  assert.match(tasks, /ProjectTasks/);
  assert.match(files, /ProjectFiles/);
  assert.match(approvals, /ProjectApprovals/);
});
