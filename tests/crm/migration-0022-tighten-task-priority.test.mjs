import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0022_tighten_task_priority_to_three_tiers.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('drops and re-adds project_tasks_priority_check restricted to three tiers', async () => {
  const sql = await readMigration();

  assert.match(
    sql,
    /alter table public\.project_tasks\s+drop constraint project_tasks_priority_check/i,
  );

  assert.match(
    sql,
    /alter table public\.project_tasks\s+add constraint project_tasks_priority_check\s+check \(priority = any \(array\['low'::text, 'medium'::text, 'high'::text\]\)\)/i,
  );
});

test('the new constraint definition does not allow urgent', async () => {
  const sql = await readMigration();
  const addConstraintMatch = sql.match(
    /add constraint project_tasks_priority_check\s+check \(([^;]+)\);/i,
  );
  assert.ok(addConstraintMatch, 'expected to find the add constraint statement');
  const constraintBody = addConstraintMatch[1];
  assert.doesNotMatch(constraintBody, /urgent/i);
  assert.match(constraintBody, /'low'/i);
  assert.match(constraintBody, /'medium'/i);
  assert.match(constraintBody, /'high'/i);
});

test('migration is wrapped in a transaction', async () => {
  const sql = await readMigration();
  assert.match(sql, /^begin;/m);
  assert.match(sql, /^commit;/m);
});
