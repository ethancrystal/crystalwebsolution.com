import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for 0047. Behaviour (a client calling each RPC directly is
// refused; assigned staff and the admin are not) is proven in
// supabase/tests/0047_staff_only_task_and_deliverable_rpcs.test.sql.

const MIGRATION = 'supabase/migrations/0047_staff_only_task_and_deliverable_rpcs.sql';
const FUNCTIONS = {
  create_project_task: 'uuid, text, text, text, uuid, date, text, boolean',
  create_project_deliverable: 'uuid, text, text, text, bigint, text, text, text',
  publish_project_deliverable: 'uuid, text',
};

function statementsOf(sql) {
  return sql.replace(/\r\n/g, '\n').split('\n').filter((line) => !line.trim().startsWith('--')).join('\n');
}

function functionBlock(sql, name) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `public.${name} is redefined`);
  const end = sql.indexOf('$function$;', start);
  assert.ok(end > start, `public.${name} has a closed body`);
  return sql.slice(start, end + '$function$;'.length);
}

test('each task/deliverable RPC requires can_view_internal before any write', async () => {
  const sql = statementsOf(await readFile(MIGRATION, 'utf8'));

  for (const name of Object.keys(FUNCTIONS)) {
    const body = functionBlock(sql, name);
    const guard = body.search(/if not private\.can_view_internal\((p_project_id|v_deliverable\.project_id)\) then\s*raise exception 'Staff access required\.' using errcode = '42501';/);
    assert.ok(guard > 0, `${name} checks can_view_internal`);
    const firstWrite = body.search(/\b(insert into|update) public\./);
    assert.ok(firstWrite > guard, `${name} checks before its first write`);
    assert.doesNotMatch(body, /can_access_project/, `${name} no longer accepts any project participant`);
    assert.match(body, /security definer/);
    assert.match(body, /set search_path to 'pg_catalog', 'public', 'private', 'storage'/);
  }
});

test('publishing checks staff before the owner check, so a client learns nothing about the row', async () => {
  const body = functionBlock(statementsOf(await readFile(MIGRATION, 'utf8')), 'publish_project_deliverable');
  assert.ok(body.indexOf('can_view_internal') < body.indexOf('Only the deliverable owner may publish it.'));
});

test('grants to authenticated are re-stated only after each body, with public and anon revoked', async () => {
  const sql = statementsOf(await readFile(MIGRATION, 'utf8'));
  for (const [name, args] of Object.entries(FUNCTIONS)) {
    const bodyEnd = sql.indexOf('$function$;', sql.indexOf(`create or replace function public.${name}(`));
    const grant = sql.indexOf(`grant execute on function public.${name}(${args}) to authenticated;`);
    assert.ok(grant > bodyEnd, `${name} grant follows its body`);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\(${args.replace(/[()]/g, '\\$&')}\\) from public;`));
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}\\(${args.replace(/[()]/g, '\\$&')}\\) from anon;`));
  }
});

test('enqueue_project_notification is hardened in 0046 and not redefined here', async () => {
  const sql = statementsOf(await readFile(MIGRATION, 'utf8'));
  assert.doesNotMatch(sql, /function public\.enqueue_project_notification/);

  const prior = statementsOf(await readFile('supabase/migrations/0046_client_notifications_and_hardening.sql', 'utf8'));
  const enqueue = prior.slice(prior.indexOf('create or replace function public.enqueue_project_notification('));
  assert.match(enqueue, /if not private\.can_view_internal\(p_project_id\) then/);
  assert.match(enqueue, /Notification recipient is not on this project\./);
});

test('the matching server actions are staff-only', async () => {
  const source = await readFile('app/actions/project-actions.js', 'utf8');
  for (const action of ['createProjectTask', 'createProjectDeliverable', 'publishDeliverable', 'enqueueNotification']) {
    const start = source.indexOf(`export async function ${action}(formData) {`);
    assert.ok(start >= 0, action);
    const head = source.slice(start, start + 300);
    assert.match(head, /authenticatedProfile\(\['project_manager', 'admin'\]\)/, `${action} is staff-only`);
    assert.doesNotMatch(head, /'client'/, `${action} does not admit clients`);
  }
});
