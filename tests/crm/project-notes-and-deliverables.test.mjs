import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0013_project_notes_and_deliverables.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

function functionBody(sql, name) {
  const match = sql.match(
    new RegExp(
      `create\\s+(?:or\\s+replace\\s+)?function\\s+(?:public|private)\\.${name}\\b[\\s\\S]*?\\$function\\$([\\s\\S]*?)\\$function\\$`,
      'i',
    ),
  );

  assert.ok(match, `expected ${name} function`);
  return match[0];
}

test('0012 widens audit_events to allow the two new event types', async () => {
  const sql = await readMigration();

  assert.match(sql, /add constraint audit_events_event_type_check check[\s\S]*?'project\.note_posted'/i);
  assert.match(sql, /add constraint audit_events_event_type_check check[\s\S]*?'project\.deliverable_created'/i);
});

test('post_project_note satisfies project_status_history.to_status NOT NULL by reusing the current status', async () => {
  const sql = await readMigration();
  const fn = functionBody(sql, 'post_project_note');

  assert.match(fn, /security definer/i);
  assert.match(fn, /private\.can_access_project\(p_project_id\)/);
  assert.match(fn, /p_visibility = 'internal' and not private\.can_view_internal\(p_project_id\)/);
  assert.match(fn, /select project\.status, project\.company_id/i);
  assert.match(
    fn,
    /insert into public\.project_status_history[\s\S]*?v_status,\s*\n\s*v_status,/i,
    'from_status and to_status must both be the project\'s current status, not a real transition',
  );
  assert.match(fn, /'project\.note_posted'/);
  assert.match(fn, /insert into public\.notifications_outbox/i);

  assert.match(sql, /grant execute on function public\.post_project_note\(uuid, text, text\) to authenticated/i);
  assert.match(sql, /revoke all on function public\.post_project_note\(uuid, text, text\) from anon/i);
});

test('create_project_deliverable reserves a row the way reserve_project_attachment does', async () => {
  const sql = await readMigration();
  const fn = functionBody(sql, 'create_project_deliverable');

  assert.match(fn, /security definer/i);
  assert.match(fn, /private\.can_access_project\(p_project_id\)/);
  assert.match(fn, /p_visibility = 'internal' and not private\.can_view_internal\(p_project_id\)/);
  assert.match(fn, /'draft'/, 'new deliverables must start in draft, matching the existing status CHECK default');
  assert.match(fn, /p_project_id::text \|\| '\/' \|\| v_deliverable_id::text \|\| '\/'/);
  assert.match(fn, /'project\.deliverable_created'/);

  assert.match(
    sql,
    /grant execute on function public\.create_project_deliverable\(uuid, text, text, text, bigint, text, text, text\) to authenticated/i,
  );
});

test('storage policies scope deliverable read/upload access the same way attachments already do', async () => {
  const sql = await readMigration();

  assert.match(sql, /create policy "Project participants can read published deliverables"[\s\S]*?on storage\.objects/i);
  assert.match(sql, /deliverable\.status <> 'draft'/);
  assert.match(sql, /private\.can_access_project\(deliverable\.project_id\)/);
  assert.match(sql, /deliverable\.visibility = 'shared'\s*\n\s*or private\.can_view_internal\(deliverable\.project_id\)/);

  assert.match(sql, /create policy "Deliverable owners can upload draft deliverables"[\s\S]*?on storage\.objects/i);
  assert.match(sql, /deliverable\.created_by = \(select auth\.uid\(\)\)/);
  assert.match(sql, /deliverable\.status = 'draft'/);
});
