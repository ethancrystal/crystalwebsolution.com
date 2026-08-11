import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0023_visibility_aware_notification_recipients.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('drops the old 2-arg project_notification_recipients signature before recreating it', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /drop function if exists private\.project_notification_recipients\(uuid,\s*uuid\)/i,
    'must drop the exact live 2-arg signature -- appending a trailing param creates a second overload instead of replacing it',
  );
});

test('project_notification_recipients gains a visibility param defaulting to shared', async () => {
  const sql = await readMigration();
  assert.match(sql, /p_visibility text default 'shared'::text/i);
});

test('the client-company branch is excluded when visibility is internal', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /join public\.profiles as profile on profile\.company_id = project\.company_id[\s\S]*?p_visibility is distinct from 'internal'/i,
    'the client-company recipient branch must be gated on visibility, excluding it for internal events',
  );
});

test('post_project_message forwards its own p_visibility to the recipient call', async () => {
  const sql = await readMigration();
  const blocks = sql.split(/create or replace function/i).slice(1);
  const postMessage = blocks.find((b) => /public\.post_project_message/i.test(b));
  assert.ok(postMessage, 'post_project_message must be recreated in this migration');
  assert.match(postMessage, /project_notification_recipients\(p_project_id,\s*v_user_id,\s*p_visibility\)/i);
});

test('update_project_message forwards the message\'s own visibility (it has no p_visibility param)', async () => {
  const sql = await readMigration();
  const blocks = sql.split(/create or replace function/i).slice(1);
  const updateMessage = blocks.find((b) => /public\.update_project_message/i.test(b));
  assert.ok(updateMessage, 'update_project_message must be recreated in this migration');
  assert.doesNotMatch(
    updateMessage,
    /p_visibility text/i,
    'update_project_message must not gain a new p_visibility param -- visibility is immutable after creation',
  );
  assert.match(updateMessage, /project_notification_recipients\(v_project_id,\s*v_user_id,\s*v_message\.visibility\)/i);
});

test('publish_project_deliverable forwards the deliverable\'s own visibility to the recipient call', async () => {
  const sql = await readMigration();
  const blocks = sql.split(/create or replace function/i).slice(1);
  const publishDeliverable = blocks.find((b) => /public\.publish_project_deliverable/i.test(b));
  assert.ok(publishDeliverable, 'publish_project_deliverable must be recreated in this migration');
  assert.match(publishDeliverable, /project_notification_recipients\(v_project_id,\s*v_user_id,\s*v_deliverable\.visibility\)/i);
});

test('transition_project_status and update_project_approval are not touched by this migration', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(
    sql,
    /create or replace function public\.transition_project_status/i,
    'status transitions have no visibility concept -- this migration must not redefine that function',
  );
  assert.doesNotMatch(
    sql,
    /create or replace function public\.update_project_approval/i,
    'approval decisions have no visibility concept -- this migration must not redefine that function',
  );
});

test('grants stay locked down -- no bare execute-to-public regression on the recreated functions', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /grant execute on function[^;]*\bto public\b/i);
  assert.match(sql, /revoke all on function public\.post_project_message\([^)]*\) from public, anon/i);
  assert.match(sql, /revoke all on function public\.update_project_message\([^)]*\) from public, anon/i);
  assert.match(sql, /revoke all on function public\.publish_project_deliverable\([^)]*\) from public, anon/i);
});
