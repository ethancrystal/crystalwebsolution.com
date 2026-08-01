import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const MIGRATION_PATH = 'supabase/migrations/0009_project_realtime_crm.sql';

test('Phase 0 gate: migration defines the actual project aggregate and command surface', async () => {
  const sql = await readFile(MIGRATION_PATH, 'utf8');

  const requiredTables = [
    'public.projects',
    'public.project_threads',
    'public.project_assignments',
    'public.project_messages',
    'public.project_attachments',
    'public.project_status_history',
    'public.audit_events',
  ];

  for (const table of requiredTables) {
    assert.match(sql, new RegExp(`create table ${table}`, 'i'));
  }

  const requiredRpc = [
    'create_project',
    'assign_project_user',
    'remove_project_assignment',
    'transition_project_status',
    'reserve_project_attachment',
    'post_project_message',
    'finalize_project_attachment',
  ];

  for (const rpc of requiredRpc) {
    assert.match(sql, new RegExp(`create or replace function public\\.${rpc}\\(`, 'i'));
  }
});

test('Phase 0 gate: project read model matches the actual aggregate tables', async () => {
  const readModel = await readFile('lib/crm/projects.js', 'utf8');

  assert.match(readModel, /from\('project_threads'\)/);
  assert.match(readModel, /from\('project_assignments'\)/);
  assert.match(readModel, /from\('project_attachments'\)/);
  assert.match(readModel, /from\('project_status_history'\)/);
  assert.match(readModel, /export async function listProjectsForViewer\(/);
  assert.match(readModel, /export async function getProjectWorkspace\(/);
});

test('Phase 0 gate: server actions call the actual migration RPCs only', async () => {
  const actions = await readFile('app/actions/project-actions.js', 'utf8');
  const requiredRpc = [
    'create_project',
    'assign_project_user',
    'remove_project_assignment',
    'transition_project_status',
    'reserve_project_attachment',
    'post_project_message',
    'finalize_project_attachment',
  ];

  for (const rpc of requiredRpc) {
    assert.match(actions, new RegExp(`\\.rpc\\(['"]${rpc}['"]`));
  }
});
