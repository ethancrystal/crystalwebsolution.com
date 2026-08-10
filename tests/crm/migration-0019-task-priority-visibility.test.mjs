import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0019_task_priority_and_client_visible.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('drops the old 6-arg create_project_task signature before recreating it', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /drop function if exists public\.create_project_task\(uuid,\s*text,\s*text,\s*text,\s*uuid,\s*date\)/i,
    'must drop the exact live 6-arg signature, not rely on create or replace to do it -- appending trailing params creates a second overload instead of replacing',
  );
});

test('create_project_task accepts priority and client_visible with the right defaults', async () => {
  const sql = await readMigration();
  assert.match(sql, /p_priority text default 'medium'/i);
  assert.match(sql, /p_client_visible boolean default false/i);
  assert.match(sql, /insert into public\.project_tasks[\s\S]*?priority[\s\S]*?client_visible/i);
});

test('backfills every existing task to client_visible = true before any default changes apply', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /update public\.project_tasks\s+set client_visible = true\s+where client_visible = false/i,
    'must preserve today\'s observed behaviour (every client sees every existing task) for rows that already exist',
  );
});

test('does not touch the client_visible column default itself', async () => {
  const sql = await readMigration();
  assert.doesNotMatch(
    sql,
    /alter column client_visible set default/i,
    'the column already defaults to false for new rows -- only existing rows need the backfill',
  );
});
