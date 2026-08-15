import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0028_transition_project_status_visibility_recipients.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('transition_project_status forwards its own p_visibility to the recipient call', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /project_notification_recipients\(p_project_id,\s*v_user_id,\s*p_visibility\)/i,
    'the status.status_transitioned notification fan-out must respect the transition\'s own visibility, same as post_project_message/update_project_message/publish_project_deliverable in 0023',
  );
});

test('the delivered branch is unchanged -- still client-company-only, email-only, no recipients-helper call', async () => {
  const sql = await readMigration();
  const deliveredBranch = sql.slice(sql.indexOf("p_to_status = 'delivered'"));
  assert.doesNotMatch(
    deliveredBranch.slice(0, deliveredBranch.indexOf('end if')),
    /project_notification_recipients/,
  );
  assert.match(sql, /where profile\.company_id = v_project\.company_id/i);
});

test('grants stay locked down -- no bare execute-to-public regression on the recreated function', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /grant execute on function[^;]*\bto public\b/i);
  assert.match(
    sql,
    /revoke all on function public\.transition_project_status\([^)]*\) from public, anon/i,
  );
  assert.match(
    sql,
    /grant execute on function public\.transition_project_status\([^)]*\) to authenticated/i,
  );
});
