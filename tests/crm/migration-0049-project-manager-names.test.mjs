import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for 0049. Behaviour (each role sees names only for projects
// it can access; admins are never shown as the manager) is proven in
// supabase/tests/0049_project_manager_names.test.sql.

const MIGRATION = 'supabase/migrations/0049_project_manager_names.sql';

test('project_manager_names is a pinned SECURITY DEFINER function for signed-in users only', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  assert.match(sql, /create or replace function public\.project_manager_names\(p_project_ids uuid\[\]\)/);
  assert.match(sql, /returns table \(project_id uuid, full_name text\)/);
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path to 'pg_catalog', 'public', 'private'/);
  assert.match(sql, /revoke all on function public\.project_manager_names\(uuid\[\]\) from public;/);
  assert.match(sql, /revoke all on function public\.project_manager_names\(uuid\[\]\) from anon;/);
  assert.match(sql, /grant execute on function public\.project_manager_names\(uuid\[\]\) to authenticated/);
});

test('it filters by access and role, and returns no email or id', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const body = sql.slice(sql.indexOf('as $function$'), sql.lastIndexOf('$function$'));
  assert.match(body, /private\.can_access_project\(assignment\.project_id\)/);
  assert.match(body, /profile\.role = 'project_manager'::public\.user_role/);
  assert.doesNotMatch(body, /email/i);
  // The select list: the project id and the name, nothing else.
  const selectList = body.slice(body.indexOf('select distinct on'), body.indexOf('from public.project_assignments'));
  assert.match(selectList, /assignment\.project_id,\s+profile\.full_name\s*$/);
  assert.doesNotMatch(selectList, /user_id|assigned_by|profile\.id/);
});

test('the portal reads names through getProjectManagerNames and falls back when 0049 is missing', async () => {
  const projects = await readFile('lib/crm/projects.js', 'utf8');
  assert.match(projects, /rpc\('project_manager_names', \{ p_project_ids: ids \}\)/);
  assert.match(projects, /if \(error\) return \{ available: false, names \}/);

  const clientPage = await readFile('app/dashboard/projects/[id]/page.jsx', 'utf8');
  const dashboard = await readFile('app/dashboard/page.jsx', 'utf8');
  assert.match(clientPage, /getProjectManagerNames\(supabase, \[projectId\]\)/);
  assert.match(dashboard, /getProjectManagerNames\(supabase, projectIds\)/);
});
