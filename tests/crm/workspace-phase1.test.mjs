import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MIGRATION = 'supabase/migrations/0010_project_workspace.sql';
const READ_MODEL = 'lib/crm/projects.js';
const ACTIONS = 'app/actions/project-actions.js';

const REQUIRED_TABLES = [
  'public.project_tasks',
  'public.project_approvals',
  'public.project_deliverables',
  'public.notifications_outbox',
];

const REQUIRED_RPC = [
  'create_project_task',
  'update_project_task',
  'create_project_approval',
  'update_project_approval',
  'publish_project_deliverable',
  'enqueue_project_notification',
];

test('Phase 1 migration defines workspace tables', async () => {
  const sql = await readFile(MIGRATION, 'utf8');

  for (const table of REQUIRED_TABLES) {
    assert.match(sql, new RegExp(`create table ${table}`, 'i'));
  }
});

test('Phase 1 migration defines workspace bounded commands', async () => {
  const sql = await readFile(MIGRATION, 'utf8');

  for (const rpc of REQUIRED_RPC) {
    assert.match(sql, new RegExp(`create or replace function public\\.${rpc}\\(`, 'i'));
  }
});

test('Phase 1 read model exposes workspace data and lists', async () => {
  const source = await readFile(READ_MODEL, 'utf8');

  assert.match(source, /from\('project_tasks'\)/);
  assert.match(source, /from\('project_approvals'\)/);
  assert.match(source, /from\('project_deliverables'\)/);
  assert.match(source, /from\('notifications_outbox'\)/);
  assert.match(source, /export async function listProjectTasks\(/);
  assert.match(source, /export async function listProjectApprovals\(/);
  assert.match(source, /export async function listProjectDeliverables\(/);
  assert.match(source, /export async function listNotifications\(/);
});

test('Phase 1 bounded actions call workspace RPCs only', async () => {
  const source = await readFile(ACTIONS, 'utf8');

  for (const rpc of REQUIRED_RPC) {
    assert.match(source, new RegExp(`\\.rpc\\(['"]${rpc}['"]`));
  }
});

test('Phase 1 UI surfaces task/approval/deliverable/notification fields', async () => {
  const tasks = await readFile('components/crm/ProjectTasks.jsx', 'utf8');
  const approvals = await readFile('components/crm/ProjectApprovals.jsx', 'utf8');
  const files = await readFile('components/crm/ProjectFiles.jsx', 'utf8');
  const page = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');

  assert.match(tasks, /task\.status/);
  assert.match(tasks, /task\.due_date/);
  assert.match(approvals, /approval\.status/);
  assert.match(approvals, /approval\.requestedBy/);
  assert.match(files, /deliverables/);
  assert.match(page, /listProjectDeliverables/);
  assert.match(page, /listProjectTasks/);
  assert.match(page, /listProjectApprovals/);
  assert.match(page, /listNotifications/);
});
