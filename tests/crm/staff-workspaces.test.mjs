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

test('admin project detail derives status options from ALLOWED_TRANSITIONS', async () => {
  const adminDetail = await readFile('app/admin/projects/[id]/page.jsx', 'utf8');

  // Imports the contract's transition table alongside canTransition.
  assert.match(
    adminDetail,
    /import\s*\{\s*ALLOWED_TRANSITIONS,\s*canTransition\s*\}\s*from\s*'@\/lib\/crm\/project-contract\.mjs';/
  );

  // Options come straight from the contract (same expression as the team page).
  assert.match(adminDetail, /NEXT_OPTIONS\s*=\s*ALLOWED_TRANSITIONS\[project\.status\]\s*\|\|\s*\[\]/);

  // No hand-rolled status-to-array literal map may return.
  assert.doesNotMatch(adminDetail, /NEXT_OPTIONS\s*=\s*\{/);
});
