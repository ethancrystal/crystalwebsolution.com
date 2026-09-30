import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for 0046. Runtime behaviour (admin fallback recipient,
// client acknowledgement, onboarding alert, protected profile fields, staff-
// only enqueue) is proven in supabase/tests/0046_client_notifications_and_hardening.test.sql
// under `pnpm test:db`.

const MIGRATION = 'supabase/migrations/0046_client_notifications_and_hardening.sql';
const BRIEFS = 'supabase/migrations/0043_project_briefs.sql';
const RECIPIENTS = 'supabase/migrations/0023_visibility_aware_notification_recipients.sql';

function statementsOf(sql) {
  return sql
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

function block(sql, header, terminator) {
  const start = sql.indexOf(header);
  assert.ok(start >= 0, `${header} is defined`);
  const end = sql.indexOf(terminator, start + header.length);
  assert.ok(end > start, `${header} has a closed body`);
  return sql.slice(start, end + terminator.length);
}

const normalize = (text) => text.replace(/\s+/g, ' ').trim();

const ACK_BLOCK = /\s*insert into public\.notifications_outbox \(project_id, user_id, channel, event_type, payload\)\s*select\s*v_project_id,\s*v_user_id,\s*channel\.value,\s*'project\.brief_received',[\s\S]*?from pg_catalog\.unnest\(array\['in_app', 'email'\]\) as channel\(value\);/;

test('submit_project_brief is 0043 plus one client acknowledgement, and nothing else', async () => {
  const next = statementsOf(await readFile(MIGRATION, 'utf8'));
  const prior = statementsOf(await readFile(BRIEFS, 'utf8'));
  const header = 'create or replace function public.submit_project_brief(';

  const nextBody = block(next, header, '$function$;');
  const priorBody = block(prior, header, '$function$;');

  assert.match(nextBody, ACK_BLOCK);
  // The acknowledgement goes to the submitting client only, on both channels.
  assert.match(nextBody.match(ACK_BLOCK)[0], /v_user_id,\s*channel\.value/);
  assert.equal(normalize(nextBody.replace(ACK_BLOCK, '')), normalize(priorBody));

  assert.match(next, /grant execute on function public\.submit_project_brief\(uuid, text, uuid, text, date\) to authenticated;/);
  assert.match(next, /revoke all on function public\.submit_project_brief\(uuid, text, uuid, text, date\) from anon;/);
});

test('recipients are 0023 plus the admin, only while nobody is assigned', async () => {
  const next = statementsOf(await readFile(MIGRATION, 'utf8'));
  const prior = statementsOf(await readFile(RECIPIENTS, 'utf8'));
  const header = 'create or replace function private.project_notification_recipients(';

  const nextBody = block(next, header, '$$;');
  const priorBody = block(prior, header, '$$;');

  const fallback = /\s*union\s*select profile\.id\s*from public\.profiles as profile\s*where profile\.role = 'admin'::public\.user_role\s*and profile\.id <> p_exclude_user_id\s*and not exists \(\s*select 1\s*from public\.project_assignments as assignment\s*where assignment\.project_id = p_project_id\s*\)\s*(?=\$\$;)/;
  assert.match(nextBody, fallback);
  assert.equal(normalize(nextBody.replace(fallback, '\n')), normalize(priorBody));

  // Still not callable by anyone but its owner (0027 locked it down).
  assert.match(next, /revoke all on function private\.project_notification_recipients\(uuid, uuid, text\)\s*from public, anon, authenticated;/);
});

test('onboarding tells the admin by email, with no project and no client-controlled recipient', async () => {
  const next = statementsOf(await readFile(MIGRATION, 'utf8'));
  const body = block(next, 'create or replace function public.onboard_client_company(', '$function$;');

  assert.match(body, /insert into public\.company_members \(company_id, user_id, role\)\s*values \(v_company_id, v_user_id, 'owner'\);/);
  assert.match(body, /'client\.onboarded'/);
  assert.match(body, /select\s*null,\s*profile\.id,\s*'email',\s*'client\.onboarded'/);
  assert.match(body, /where profile\.role = 'admin'::public\.user_role;/);
  // The alert is queued after the company exists and the profile is linked.
  assert.ok(body.indexOf("'client.onboarded'") > body.indexOf('set company_id = v_company_id'));
  assert.match(next, /grant execute on function public\.onboard_client_company\(text, text, text\) to authenticated;/);
});

test('the profile guard protects role, company, staff request flag and creation date', async () => {
  const next = statementsOf(await readFile(MIGRATION, 'utf8'));
  const body = block(next, 'create or replace function public.prevent_unauthorized_profile_changes()', '$function$;');

  for (const column of ['role', 'company_id', 'requested_staff_access', 'created_at']) {
    assert.match(body, new RegExp(`old\\.${column} is distinct from new\\.${column}`), column);
  }
  assert.match(body, /'public\.admin_set_user_role\(uuid,text\)'::pg_catalog\.regprocedure/);
  assert.match(body, /current_user <> v_command_owner/);
  assert.match(body, /errcode = '42501'/);
});

test('enqueue_project_notification is staff-only and only reaches people on the project', async () => {
  const next = statementsOf(await readFile(MIGRATION, 'utf8'));
  const body = block(next, 'create or replace function public.enqueue_project_notification(', '$function$;');

  assert.match(body, /if not private\.can_view_internal\(p_project_id\) then/);
  assert.doesNotMatch(body, /private\.can_access_project/);
  assert.match(body, /Notification recipient is not on this project\./);
  assert.match(body, /from public\.project_assignments as assignment\s*where assignment\.project_id = p_project_id\s*and assignment\.user_id = p_user_id/);
  assert.match(body, /join public\.profiles as profile on profile\.company_id = project\.company_id/);
  assert.match(next, /revoke all on function public\.enqueue_project_notification\(uuid, text, text, jsonb, uuid\) from anon;/);
});

test('0046 adds no new audit event types, so the audit check stays as 0043 left it', async () => {
  const next = statementsOf(await readFile(MIGRATION, 'utf8'));
  assert.doesNotMatch(next, /audit_events_event_type_check/);
  assert.doesNotMatch(next, /insert into public\.audit_events[\s\S]{0,200}'project\.brief_received'/);
});
