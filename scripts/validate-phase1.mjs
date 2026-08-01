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

const REQUIRED_READ_FIELDS = [
  'project_tasks',
  'project_approvals',
  'project_deliverables',
  'notifications_outbox',
  'listProjectTasks',
  'listProjectApprovals',
  'listProjectDeliverables',
  'listNotifications',
];

const REQUIRED_ACTIONS = [
  'create_project_task',
  'update_project_task',
  'create_project_approval',
  'update_project_approval',
  'publish_project_deliverable',
  'enqueue_project_notification',
];

async function assertMatch(file, label, regex) {
  const content = await readFile(file, 'utf8');
  if (!regex.test(content)) {
    throw new Error(`${label} missing in ${file}`);
  }
}

async function main() {
  for (const table of REQUIRED_TABLES) {
    await assertMatch(MIGRATION, table, new RegExp(`create table ${table}`, 'i'));
  }
  for (const field of REQUIRED_READ_FIELDS) {
    await assertMatch(READ_MODEL, field, new RegExp(field.replace('_', '.*?')));
  }
  for (const action of REQUIRED_ACTIONS) {
    await assertMatch(ACTIONS, action, new RegExp(`\\.rpc\\(['"]${action}['"]`));
  }
  console.log('Phase 1 validation passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
