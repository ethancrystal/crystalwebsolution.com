import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for 0043. Behaviour (RLS, submit, notifications) is proven
// in supabase/tests/0043_project_briefs.test.sql under `pnpm test:db`.

const migrationPath = 'supabase/migrations/0043_project_briefs.sql';
const previousAuditListPath = 'supabase/migrations/0017_add_message_edited_audit_event_type.sql';

function statementsOf(sql) {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function auditTypes(sql) {
  const block = sql.match(/add constraint audit_events_event_type_check[\s\S]*?\]::text\[\]\)\);/i);
  assert.ok(block, 'audit constraint block present');
  return [...block[0].matchAll(/'(project\.[a-z_]+)'/g)].map((match) => match[1]);
}

test('0043 creates project_briefs with forced RLS and no anon access', async () => {
  const sql = statementsOf(await readFile(migrationPath, 'utf8'));
  assert.match(sql, /create table if not exists public\.project_briefs/);
  assert.match(sql, /alter table public\.project_briefs enable row level security/);
  assert.match(sql, /alter table public\.project_briefs force row level security/);
  assert.match(sql, /revoke all on table public\.project_briefs from anon/);
  assert.match(sql, /project_briefs_submission_state_check/);
  assert.match(sql, /octet_length\(answers::text\) <= 60000/);
});

test('drafts are author-only and only drafts are writable', async () => {
  const sql = statementsOf(await readFile(migrationPath, 'utf8'));
  const select = sql.match(/for select[\s\S]*?\);\n/)[0];
  assert.match(select, /created_by = \(select auth\.uid\(\)\)/);
  assert.match(select, /status = 'submitted'[\s\S]*private\.can_access_project\(project_id\)/);

  for (const verb of ['insert', 'update']) {
    const policy = sql.match(new RegExp(`for ${verb}[\\s\\S]*?\\);\\n`))[0];
    assert.match(policy, /status = 'draft'/, `${verb} keeps drafts`);
    assert.match(policy, /private\.current_profile_role\(\) = 'client'/, `${verb} is client-only`);
    assert.match(policy, /company_id = private\.current_profile_company_id\(\)/, `${verb} scopes company`);
  }
  const del = sql.match(/for delete[\s\S]*?\);\n/)[0];
  assert.match(del, /status = 'draft'/);
});

test('submit_project_brief is security definer, idempotent and authenticated-only', async () => {
  const sql = statementsOf(await readFile(migrationPath, 'utf8'));
  assert.match(sql, /create or replace function public\.submit_project_brief\(/);
  assert.match(sql, /security definer\s+set search_path = pg_catalog, public, private, storage/);
  assert.match(sql, /if v_brief\.status = 'submitted' then\s+return v_brief\.project_id;/);
  assert.match(sql, /public\.create_project\([\s\S]*?v_brief\.id\s*\)/, 'brief id is the create_project idempotency key');
  assert.match(sql, /revoke all on function public\.submit_project_brief\(uuid, text, uuid, text, date\) from public/);
  assert.match(sql, /revoke all on function public\.submit_project_brief\(uuid, text, uuid, text, date\) from anon/);
  assert.match(sql, /grant execute on function public\.submit_project_brief\(uuid, text, uuid, text, date\) to authenticated/);
});

test('the audit event list is 0017\'s list plus project.brief_submitted', async () => {
  const [current, previous] = await Promise.all([
    readFile(migrationPath, 'utf8'),
    readFile(previousAuditListPath, 'utf8'),
  ]);
  assert.deepEqual(auditTypes(current), [...auditTypes(previous), 'project.brief_submitted']);
});

test('studio staff are notified and the submitter is not', async () => {
  const sql = statementsOf(await readFile(migrationPath, 'utf8'));
  assert.match(sql, /'project\.brief_submitted'/);
  assert.match(sql, /profile\.role = 'admin'::public\.user_role/);
  assert.match(sql, /from public\.project_assignments as assignment/);
  assert.match(sql, /unnest\(array\['in_app', 'email'\]\)/);
  assert.match(sql, /staff\.user_id <> v_user_id/);
});

test('brief ids are immutable and a colliding idempotency key is refused', async () => {
  const sql = statementsOf(await readFile(migrationPath, 'utf8'));
  assert.match(sql, /new\.id := old\.id;/);
  assert.match(sql, /new\.created_at := old\.created_at;/);
  assert.match(sql, /project\.client_generated_id = v_brief\.id[\s\S]*?raise exception 'This brief cannot be submitted\.'/);
});
