import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0021_restore_create_project_task_acl.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('revokes create_project_task execute access from public, restoring the pre-0019 ACL', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /revoke all on function public\.create_project_task\(uuid, text, text, text, uuid, date, text, boolean\) from public/i,
  );
});
