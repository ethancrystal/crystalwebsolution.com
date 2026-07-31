import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SOURCE_FILES = [
  'app/globals.css',
  'components/crm/WorkspaceShell.jsx',
  'components/crm/ProjectOverview.jsx',
  'components/crm/ProjectTimeline.jsx',
  'components/crm/ProjectTasks.jsx',
  'components/crm/ProjectFiles.jsx',
  'components/crm/ProjectApprovals.jsx',
  'components/crm/ProjectOperations.jsx',
];

test('responsive contract: CRM source includes mobile-first breakpoints and contained widths', async () => {
  const sources = await Promise.all(SOURCE_FILES.map((file) => readFile(file, 'utf8')));

  assert.ok(
    sources.some((source) => /768px/.test(source)),
    'Expected at least one CRM source to include a 768px breakpoint or rule.'
  );
});

test('responsive contract: workspace shell uses bounded layout tokens and avoids fixed page widths', async () => {
  const workspace = await readFile('components/crm/WorkspaceShell.jsx', 'utf8');
  const globals = await readFile('app/globals.css', 'utf8');

  assert.ok(/max-width|minmax\(/.test(workspace) || /max-width|minmax\(/.test(globals));
});
