import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// F11: each staff project page tells ProjectOverview whose portal it is, so
// the back link lands on that role's home instead of the client-only /dashboard.

test('the team project page passes the project_manager role to ProjectOverview', async () => {
  const source = await readFile('app/team/projects/[id]/page.jsx', 'utf8');
  assert.match(source, /<ProjectOverview project=\{project\} role="project_manager" \/>/);
});

test('the admin project page passes the admin role to ProjectOverview', async () => {
  const source = await readFile('app/admin/projects/[id]/page.jsx', 'utf8');
  assert.match(source, /<ProjectOverview project=\{project\} role="admin" \/>/);
});

test('ProjectOverview resolves its back link through the role -> home mapping', async () => {
  const source = await readFile('components/crm/ProjectOverview.jsx', 'utf8');
  assert.match(source, /import \{ homeForRole \} from '@\/lib\/auth\/roles\.mjs'/);
  assert.match(source, /href=\{homeForRole\(role\) \?\? '\/dashboard'\}/);
  assert.doesNotMatch(source, /href="\/dashboard"/);
});
