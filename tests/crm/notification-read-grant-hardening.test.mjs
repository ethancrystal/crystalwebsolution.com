import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../../supabase/migrations/0028_notification_read_grant_hardening.sql',
  import.meta.url,
);

const sql = await readFile(migrationPath, 'utf8').catch(() => '');

test('removes explicit API-role execution from mark_notifications_read', () => {
  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.mark_notifications_read\(uuid\[\]\)\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.mark_notifications_read\(uuid\[\]\)\s+to\s+authenticated/i,
  );
});
