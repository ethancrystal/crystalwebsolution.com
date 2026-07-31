import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('team project page is role-guarded and uses bounded project read', async () => {
  const team = await readFile('app/team/projects/[id]/page.jsx', 'utf8');
  assert.match(team, /getProjectWorkspace/);
  assert.doesNotMatch(team, /from\('deals'\)/);
  assert.doesNotMatch(team, /supabase\.auth\.admin/);
});

test('admin project list filters through bounded read and detail exposes ops', async () => {
  const adminList = await readFile('app/admin/projects/page.jsx', 'utf8');
  const adminDetail = await readFile('app/admin/projects/[id]/page.jsx', 'utf8');

  assert.match(adminList, /listProjectsForViewer/);
  assert.match(adminDetail, /getProjectWorkspace/);
  assert.match(adminDetail, /transitionProject\(formData\)/);
});
