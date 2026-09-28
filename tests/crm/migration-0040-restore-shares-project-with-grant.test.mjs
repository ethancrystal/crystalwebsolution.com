import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0040_restore_shares_project_with_grant.sql';

// 0018 created private.shares_project_with(uuid) and put it in a profiles
// SELECT policy. 0027 then revoked EXECUTE on it from authenticated without
// touching the policy. RLS policy expressions run with the querying user's
// privileges, so every authenticated statement against profiles fails at
// planning with "permission denied for function shares_project_with" -
// confirmed live on 2026-09-02 for client, admin, own-row and EXPLAIN alike.
// profiles is read by middleware.js on every CRM request and by signIn(),
// so the whole CRM was unusable for every role from the day 0027 applied.
test('0040 restores EXECUTE on private.shares_project_with to authenticated only', async () => {
  const sql = await readFile(migrationPath, 'utf8');

  assert.match(sql, /grant execute on function private\.shares_project_with\(uuid\) to authenticated/i);
  assert.match(sql, /revoke all on function private\.shares_project_with\(uuid\) from public, anon/i);
  assert.doesNotMatch(sql, /grant execute on function private\.shares_project_with\(uuid\) to (anon|public)/i);
  // The policy itself is correct and must not be dropped or rewritten here.
  assert.doesNotMatch(sql, /drop policy/i);
  assert.doesNotMatch(sql, /create policy/i);
});

// The same mistake must not be repeatable by the next hardening migration:
// every private.* helper referenced from a policy has to stay executable by
// authenticated. Pin the full set so a future revoke fails this test.
test('every private helper referenced by an RLS policy is granted to authenticated somewhere', async () => {
  const { readdir } = await import('node:fs/promises');
  const dir = 'supabase/migrations';
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const all = await Promise.all(files.map((f) => readFile(`${dir}/${f}`, 'utf8')));
  const joined = all.join('\n');

  const referenced = new Set(
    [...joined.matchAll(/using\s*\(\s*private\.([a-z_]+)\(/gi)].map((m) => m[1].toLowerCase()),
  );
  assert.ok(referenced.has('shares_project_with'));
  assert.ok(referenced.has('can_access_project'));

  for (const fn of referenced) {
    const grants = [...joined.matchAll(new RegExp(String.raw`grant execute on function private\.${fn}\([^)]*\) to authenticated`, 'gi'))];
    const revokes = [...joined.matchAll(new RegExp(String.raw`revoke all on function private\.${fn}\([^)]*\)\s*from[^;]*authenticated`, 'gi'))];
    assert.ok(grants.length > 0, `private.${fn} is used in a policy but never granted to authenticated`);
    // A revoke from authenticated must be followed (in migration order) by a grant.
    const lastGrantAt = joined.lastIndexOf(grants.at(-1)[0]);
    for (const r of revokes) {
      assert.ok(lastGrantAt > joined.indexOf(r[0]), `private.${fn}: revoke from authenticated is not followed by a re-grant`);
    }
  }
});
