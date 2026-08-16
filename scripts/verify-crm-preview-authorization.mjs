import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const REQUIRED_ENV = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'CRM_PREVIEW_CLIENT_A_EMAIL',
  'CRM_PREVIEW_CLIENT_A_PASSWORD',
  'CRM_PREVIEW_CLIENT_B_EMAIL',
  'CRM_PREVIEW_CLIENT_B_PASSWORD',
  'CRM_PREVIEW_EMPLOYEE_EMAIL',
  'CRM_PREVIEW_EMPLOYEE_PASSWORD',
  'CRM_PREVIEW_ADMIN_EMAIL',
  'CRM_PREVIEW_ADMIN_PASSWORD',
  'CRM_PREVIEW_CLIENT_A_PROJECT_ID',
  'CRM_PREVIEW_CLIENT_B_PROJECT_ID',
  'CRM_PREVIEW_EMPLOYEE_ASSIGNED_PROJECT_ID',
  'CRM_PREVIEW_EMPLOYEE_UNASSIGNED_PROJECT_ID',
  'CRM_PREVIEW_CLIENT_A_THREAD_ID',
];

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required preview variable: ${name}`);
  return value;
}

function configuredPreview() {
  const environment = process.env.CRM_PREVIEW_ENVIRONMENT?.trim().toLowerCase();
  if (environment !== 'preview') {
    throw new Error('Refusing to run: set CRM_PREVIEW_ENVIRONMENT=preview explicitly.');
  }
  for (const name of REQUIRED_ENV) required(name);
}

async function signIn(label, emailName, passwordName) {
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.signInWithPassword({
    email: required(emailName),
    password: required(passwordName),
  });
  if (error || !data?.session) throw new Error(`${label} sign-in failed: ${error?.message || 'no session'}`);
  return client;
}

async function selectRows(client, table, columns, filters) {
  let query = client.from(table).select(columns).limit(1);
  for (const [column, value] of Object.entries(filters)) query = query.eq(column, value);
  const { data, error } = await query;
  if (error) throw new Error(`${table} query failed: ${error.message}`);
  return data ?? [];
}

async function expectRows(client, label, table, columns, filters) {
  const rows = await selectRows(client, table, columns, filters);
  assert.equal(rows.length, 1, `${label} should return one authorized row`);
}

async function expectNoRows(client, label, table, columns, filters) {
  const rows = await selectRows(client, table, columns, filters);
  assert.equal(rows.length, 0, `${label} must return no rows`);
}

async function main() {
  configuredPreview();

  const clientA = await signIn('client A', 'CRM_PREVIEW_CLIENT_A_EMAIL', 'CRM_PREVIEW_CLIENT_A_PASSWORD');
  const clientB = await signIn('client B', 'CRM_PREVIEW_CLIENT_B_EMAIL', 'CRM_PREVIEW_CLIENT_B_PASSWORD');
  const employee = await signIn('employee', 'CRM_PREVIEW_EMPLOYEE_EMAIL', 'CRM_PREVIEW_EMPLOYEE_PASSWORD');
  const admin = await signIn('admin', 'CRM_PREVIEW_ADMIN_EMAIL', 'CRM_PREVIEW_ADMIN_PASSWORD');

  const projectA = required('CRM_PREVIEW_CLIENT_A_PROJECT_ID');
  const projectB = required('CRM_PREVIEW_CLIENT_B_PROJECT_ID');
  const assignedProject = required('CRM_PREVIEW_EMPLOYEE_ASSIGNED_PROJECT_ID');
  const unassignedProject = required('CRM_PREVIEW_EMPLOYEE_UNASSIGNED_PROJECT_ID');
  const threadA = required('CRM_PREVIEW_CLIENT_A_THREAD_ID');

  await expectRows(clientA, 'client A own project', 'projects', 'id', { id: projectA });
  await expectNoRows(clientA, 'client A cross-company project access', 'projects', 'id', { id: projectB });
  await expectNoRows(clientB, 'client B cross-company project access', 'projects', 'id', { id: projectA });
  await expectNoRows(clientA, 'client A internal messages', 'project_messages', 'id', { thread_id: threadA, visibility: 'internal' });
  await expectNoRows(clientA, 'client A non-client-visible tasks', 'project_tasks', 'id,client_visible', { project_id: projectA, client_visible: false });
  await expectNoRows(clientA, 'client A cross-company tasks', 'project_tasks', 'id', { project_id: projectB });

  await expectRows(employee, 'employee assigned project', 'projects', 'id', { id: assignedProject });
  await expectNoRows(employee, 'employee unassigned project', 'projects', 'id', { id: unassignedProject });
  await expectNoRows(employee, 'employee unassigned tasks', 'project_tasks', 'id', { project_id: unassignedProject });

  await expectRows(admin, 'admin project A visibility', 'projects', 'id', { id: projectA });
  await expectRows(admin, 'admin project B visibility', 'projects', 'id', { id: projectB });
  await expectRows(admin, 'admin project thread visibility', 'project_messages', 'id', { thread_id: threadA });

  console.log(JSON.stringify({
    environment: 'preview',
    passed: true,
    checks: [
      'client company isolation',
      'client shared/internal visibility',
      'client-visible task predicate',
      'employee assignment isolation',
      'admin global project visibility',
    ],
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
