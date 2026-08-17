import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0030_transition_status_visibility_recipients.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('transition_project_status forwards its own p_visibility to recipient resolution', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /project_notification_recipients\(p_project_id,\s*v_user_id,\s*p_visibility\)/i,
    'status-transition fan-out must respect the transition visibility',
  );
});

test('the delivered branch remains client-company-only and email-only', async () => {
  const sql = await readMigration();
  const deliveredBranch = sql.slice(sql.indexOf("p_to_status = 'delivered'"));
  assert.doesNotMatch(deliveredBranch.slice(0, deliveredBranch.indexOf('end if')), /project_notification_recipients/);
  assert.match(sql, /where profile\.company_id = v_project\.company_id/i);
});

test('recreated transition function has no public or anonymous execute grant', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(sql, /grant execute on function[^;]*\bto public\b/i);
  assert.match(sql, /revoke all on function public\.transition_project_status\([^)]*\) from public, anon/i);
  assert.match(sql, /grant execute on function public\.transition_project_status\([^)]*\) to authenticated/i);
});
