import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for 0050. Behaviour (which topic each change reaches, who
// may receive and track presence) is proven in
// supabase/tests/0050_realtime_project_updates_and_presence.test.sql.

const MIGRATION = 'supabase/migrations/0050_realtime_project_updates_and_presence.sql';

test('0050 is idempotent, so it can be applied where the objects already exist', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  for (const trigger of ['broadcast_project_status_changed', 'broadcast_project_task_changed', 'broadcast_project_approval_changed']) {
    assert.match(sql, new RegExp(`drop trigger if exists ${trigger} on public\\.`));
  }
  for (const policy of ['Project participants can receive project broadcasts', 'Project participants can track project presence']) {
    assert.match(sql, new RegExp(`drop policy if exists "${policy}"\\s+on realtime\\.messages;`));
  }
  assert.doesNotMatch(sql, /^\s*create function/im, 'functions use create or replace');
});

test('trigger functions are pinned SECURITY DEFINER and not executable by API roles', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  for (const fn of ['broadcast_project_status_change', 'broadcast_project_task_change', 'broadcast_project_approval_change']) {
    const body = sql.slice(sql.indexOf(`create or replace function private.${fn}()`));
    assert.match(body, /^[\s\S]*?security definer\s+set search_path to 'pg_catalog', 'public', 'private', 'storage'/);
    assert.match(sql, new RegExp(`revoke all on function private\\.${fn}\\(\\) from public, anon, authenticated;`));
  }
});

test('the browser can track presence but never send a broadcast', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const insertPolicy = sql.slice(sql.indexOf('create policy "Project participants can track project presence"'));
  assert.match(insertPolicy, /for insert\s+to authenticated\s+with check \(\s*extension = 'presence'\s+and private\.can_subscribe_project_topic\(realtime\.topic\(\)\)/);
  assert.doesNotMatch(sql, /for insert[\s\S]{0,80}'broadcast'/);
  const selectPolicy = sql.slice(sql.indexOf('create policy "Project participants can receive project broadcasts"'));
  assert.match(selectPolicy, /extension = any \(array\['broadcast'::text, 'presence'::text\]\)\s+and private\.can_subscribe_project_topic\(realtime\.topic\(\)\)/);
});

test('payloads carry identifiers only', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const payloads = [...sql.matchAll(/jsonb_build_object\(([^)]*)\)/g)].map((match) => match[1]);
  assert.ok(payloads.length >= 6);
  for (const payload of payloads) {
    const keys = [...payload.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]);
    for (const key of keys) assert.ok(['project_id', 'task_id', 'approval_id'].includes(key), `unexpected payload key ${key}`);
  }
});

test('every project page re-reads on project changes and shows who is here', async () => {
  for (const page of ['app/team/projects/[id]/page.jsx', 'app/admin/projects/[id]/page.jsx', 'app/dashboard/projects/[id]/page.jsx']) {
    const source = await readFile(page, 'utf8');
    assert.match(source, /useProjectLive\(\{\s*projectId,\s*profile,/, page);
    assert.match(source, /if \(touchesWorkspace\(events\)\) loadWorkspace\(\);/, page);
    assert.match(source, /<ProjectPresence viewers=\{viewers\} \/>/, page);
    // Hooks run before any early return.
    assert.ok(source.indexOf('useProjectLive(') < source.indexOf('if (isLoading)'), page);
  }
});
