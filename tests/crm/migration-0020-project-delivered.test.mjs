import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0020_project_delivered_notification.sql';

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

test('transition_project_status enqueues a project.delivered email when moving to delivered', async () => {
  const sql = await readMigration();
  const fn = functionBody(sql, 'transition_project_status');
  assert.match(fn, /if p_to_status = 'delivered' then/i);
  assert.match(fn, /'project\.delivered'/);
});

test('the delivered notification goes to the client company only, email channel only, never staff', async () => {
  const sql = await readMigration();
  const fn = functionBody(sql, 'transition_project_status');
  const deliveredBranch = fn.slice(fn.indexOf("p_to_status = 'delivered'"));
  assert.doesNotMatch(deliveredBranch.slice(0, deliveredBranch.indexOf('end if')), /project_notification_recipients/);
  assert.match(fn, /where profile\.company_id = v_project\.company_id/i);
  assert.match(fn, /'email'/);
});

test('does not add a new audit_events event type (the existing status_transitioned entry already records this)', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /audit_events_event_type_check/i, 'no new enum value needed -- see Global Constraints');
});
