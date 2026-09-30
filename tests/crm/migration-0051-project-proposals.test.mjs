import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for 0051. Behaviour (who can write, what a client sees, who
// is notified) is proven in supabase/tests/0051_project_proposals.test.sql.

const MIGRATION = 'supabase/migrations/0051_project_proposals.sql';
const RPCS = [
  ['create_project_proposal', '(uuid, text, text, text, bigint)'],
  ['reserve_proposal_document', '(uuid, text, text, bigint)'],
  ['finalize_proposal_document', '(uuid)'],
  ['rename_project_proposal', '(uuid, text)'],
  ['withdraw_project_proposal', '(uuid)'],
];

function functionBody(sql, name) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `${name} is defined`);
  return sql.slice(start, sql.indexOf('$function$;', sql.indexOf('as $function$', start)));
}

test('two tables, row level security forced, and the browser can only select', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  for (const table of ['project_proposals', 'project_proposal_documents']) {
    assert.match(sql, new RegExp(`create table public\\.${table} \\(`));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(sql, new RegExp(`alter table public\\.${table} force row level security;`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated;`));
    assert.match(sql, new RegExp(`grant select on table public\\.${table} to authenticated;`));
  }
  assert.doesNotMatch(sql, /grant (insert|update|delete)[^;]*on table public\.project_proposal/i);
  assert.doesNotMatch(sql, /create policy \"[^\"]*\"\s+on public\.project_proposal\w*\s+for (insert|update|delete|all)\b/i);
});

test('a proposal is 3 to 120 characters, draft/posted/withdrawn, and a document is a PDF or .docx up to 10 MiB', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  assert.match(sql, /char_length\(btrim\(title\)\) between 3 and 120/);
  assert.match(sql, /status in \('draft', 'posted', 'withdrawn'\)/);
  assert.match(sql, /'application\/pdf',\s+'application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document'/);
  assert.match(sql, /size_bytes > 0 and size_bytes <= 10485760/);
  assert.match(sql, /status in \('pending', 'ready'\)/);
});

test('a client reads only a posted proposal and its current, finished document', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const proposals = sql.slice(sql.indexOf('create policy "Project participants can read proposals"'));
  assert.match(proposals, /private\.can_view_internal\(project_id\)\s+or \(status = 'posted' and private\.can_access_project\(project_id\)\)/);
  const documents = sql.slice(sql.indexOf('create policy "Project participants can read proposal documents"'));
  assert.match(documents, /status = 'ready'\s+and private\.can_access_project\(project_id\)/);
  assert.match(documents, /proposal\.status = 'posted'\s+and proposal\.current_document_id = project_proposal_documents\.id/);
});

test('every RPC is SECURITY DEFINER with a pinned path, checks staff access before writing, and is not open to anon', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  for (const [name, signature] of RPCS) {
    const body = functionBody(sql, name);
    assert.match(body, /security definer\s+set search_path to 'pg_catalog', 'public', 'private', 'storage'/, name);
    assert.match(body, /Authentication required\./, name);
    assert.match(body, /if not private\.can_view_internal\(/, `${name} requires the admin or the assigned project manager`);
    const gate = body.indexOf('private.can_view_internal(');
    const firstWrite = body.search(/\b(insert into|update public\.)/);
    assert.ok(firstWrite === -1 || gate < firstWrite, `${name} checks access before it writes`);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}${signature.replace(/[()]/g, '\\$&')} from public;`), name);
    assert.match(sql, new RegExp(`revoke all on function public\\.${name}${signature.replace(/[()]/g, '\\$&')} from anon;`), name);
    assert.match(sql, new RegExp(`grant execute on function public\\.${name}${signature.replace(/[()]/g, '\\$&')} to authenticated;`), name);
  }
});

test('finalize checks the file reached Storage, posts the first time, and notifies client members only', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const body = functionBody(sql, 'finalize_proposal_document');
  assert.match(body, /object\.bucket_id = 'project-files'\s+and object\.name = v_document\.storage_path\s+and object\.owner_id = v_user_id::text/);
  assert.match(body, /v_document\.uploaded_by <> v_user_id or v_document\.status <> 'pending'/);
  assert.match(body, /v_first_post := v_proposal\.current_document_id is null;/);
  assert.match(body, /case when v_first_post then 'project\.proposal_posted' else 'project\.proposal_updated' end/);
  assert.match(body, /array\['in_app', 'email'\]/);
  assert.match(body, /recipient_profile\.role = 'client'::public\.user_role/);
  assert.match(body, /A withdrawn proposal cannot be changed\./);
});

test('withdrawing and renaming send no notification, and a withdrawn proposal cannot be changed', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  for (const name of ['withdraw_project_proposal', 'rename_project_proposal']) {
    assert.doesNotMatch(functionBody(sql, name), /notifications_outbox/, name);
  }
  for (const name of ['reserve_proposal_document', 'rename_project_proposal']) {
    assert.match(functionBody(sql, name), /A withdrawn proposal cannot be changed\./, name);
  }
});

test('the audit check keeps 0043\'s event types and adds the five proposal ones', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const check = sql.slice(sql.indexOf('add constraint audit_events_event_type_check'));
  const list = check.slice(0, check.indexOf(']::text[]')).match(/'[a-z_.]+'/g).map((item) => item.slice(1, -1));
  const from0043 = [
    'project.created', 'project.user_assigned', 'project.assignment_removed', 'project.status_transitioned',
    'project.attachment_reserved', 'project.message_posted', 'project.message_edited', 'project.attachment_finalized',
    'project.task_created', 'project.task_updated', 'project.approval_requested', 'project.approval_updated',
    'project.deliverable_published', 'project.notification_enqueued', 'project.note_posted',
    'project.deliverable_created', 'project.brief_submitted',
  ];
  for (const type of from0043) assert.ok(list.includes(type), `${type} is still allowed`);
  for (const type of ['created', 'posted', 'updated', 'renamed', 'withdrawn']) {
    assert.ok(list.includes(`project.proposal_${type}`), `project.proposal_${type} is allowed`);
  }
  assert.equal(list.length, from0043.length + 5);
  // Every event type the RPCs write is on the list.
  for (const [, type] of sql.matchAll(/'(project\.proposal_[a-z]+)'/g)) assert.ok(list.includes(type), type);
});

test('proposal files use the two-folder path, staff upload to a pending path and a client reads only the current file', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  assert.match(sql, /p_project_id::text \|\| '\/' \|\| v_document_id::text \|\| '\/' \|\| v_safe_filename/);
  const upload = sql.slice(sql.indexOf('create policy "Proposal uploaders can upload pending proposal documents"'));
  assert.match(upload, /for insert\s+to authenticated/);
  assert.match(upload, /document\.uploaded_by = \(select auth\.uid\(\)\)\s+and document\.status = 'pending'\s+and private\.can_view_internal\(document\.project_id\)/);
  const read = sql.slice(sql.indexOf('create policy "Project participants can read proposal documents in storage"'));
  assert.match(read, /proposal\.status = 'posted'\s+and proposal\.current_document_id = document\.id\s+and private\.can_access_project\(document\.project_id\)/);
});

test('realtime: identifiers only, staff topic always, client topic only for a posted (or just-withdrawn) proposal', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const fn = sql.slice(sql.indexOf('create or replace function private.broadcast_project_proposal_change()'));
  assert.match(fn, /security definer\s+set search_path to 'pg_catalog', 'public', 'private', 'storage'/);
  assert.match(fn, /'project_proposal_changed',\s+'project:' \|\| NEW\.project_id::text \|\| ':internal'/);
  assert.match(fn, /v_visible_to_client := NEW\.status = 'posted'\s+or \(TG_OP = 'UPDATE' and OLD\.status = 'posted'\)/);
  const keys = [...fn.matchAll(/jsonb_build_object\(([^)]*)\)/g)].flatMap((match) => [...match[1].matchAll(/'([a-z_]+)'/g)].map((key) => key[1]));
  assert.deepEqual([...new Set(keys)].sort(), ['project_id', 'proposal_id']);
  assert.match(sql, /revoke all on function private\.broadcast_project_proposal_change\(\) from public, anon, authenticated;/);
  assert.match(sql, /drop trigger if exists broadcast_project_proposal_changed on public\.project_proposals;/);
  assert.match(sql, /after insert or update on public\.project_proposals/);
});

test('the app listens for the new event, so the page refreshes live', async () => {
  const realtime = await readFile('lib/crm/projectRealtime.js', 'utf8');
  assert.match(realtime, /'project_proposal_changed'/);
});

test('never schema-qualifies coalesce or nullif (the 0033 bug)', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  assert.doesNotMatch(sql, /pg_catalog\.(coalesce|nullif)\(/);
});
