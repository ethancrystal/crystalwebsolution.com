import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationPath = new URL(
  '../../supabase/migrations/0027_security_and_notification_hardening.sql',
  import.meta.url,
);
const sql = await readFile(migrationPath, 'utf8');

function revokePattern(target) {
  return new RegExp(
    `revoke\\s+all(?:\\s+privileges)?\\s+on\\s+${target}\\s+from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`,
    'i',
  );
}

test('contains the client-visible task RLS predicate', () => {
  assert.match(sql, /client_visible\s*=\s*true/i);
});

test('revokes explicit API-role access to the Payments foreign table', () => {
  assert.match(
    sql,
    /revoke\s+all\s+privileges\s+on\s+table\s+public\."Payments"\s+from\s+public\s*,\s*anon\s*,\s*authenticated/i,
  );
});

test('revokes explicit API-role execution on internal and configuration helpers', () => {
  assert.match(
    sql,
    revokePattern('function private\\.project_notification_recipients\\(uuid,\\s*uuid,\\s*text\\)'),
  );
  assert.match(sql, revokePattern('function private\\.shares_project_with\\(uuid\\)'));
  assert.match(sql, revokePattern('function public\\.pinned_admin_email\\(\\)'));
  assert.match(sql, revokePattern('function public\\.rls_auto_enable\\(\\)'));
});

test('keeps the authenticated-only notification read mutation contract', () => {
  assert.match(
    sql,
    /revoke\s+all\s+on\s+function\s+public\.mark_notifications_read\(uuid\[\]\)\s+from\s+public/i,
  );
  assert.match(
    sql,
    /grant\s+execute\s+on\s+function\s+public\.mark_notifications_read\(uuid\[\]\)\s+to\s+authenticated/i,
  );
});
