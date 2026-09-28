import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

// Source contract for 0045. Runtime behaviour (both RPCs execute, lease-owned
// completion, retry and terminal outcomes, grants) is proven in
// supabase/tests/0045_fix_outbox_mark_coalesce.test.sql under `pnpm test:db`.
// The repo-wide rule lives in migration-grammar-guard.test.mjs.

const FIX = 'supabase/migrations/0045_fix_outbox_mark_coalesce.sql';
const BROKEN = 'supabase/migrations/0033_notification_claim_leases.sql';
const FUNCTIONS = {
  mark_notification_email_sent: 'uuid, uuid',
  mark_notification_email_failed: 'uuid, uuid, boolean, text, text, timestamptz',
};

function statementsOf(sql) {
  return sql
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');
}

// `create or replace function public.<name>(` through the body's closing
// `$function$;`.
function functionBlock(sql, name) {
  const start = sql.indexOf(`create or replace function public.${name}(`);
  assert.ok(start >= 0, `public.${name} is defined`);
  const end = sql.indexOf('$function$;', start);
  assert.ok(end > start, `public.${name} has a closed $function$ body`);
  return sql.slice(start, end + '$function$;'.length);
}

test('0045 contains no schema-qualified coalesce', async () => {
  const fix = statementsOf(await readFile(FIX, 'utf8'));

  assert.doesNotMatch(fix, /pg_catalog\s*\.\s*coalesce/i);
  assert.match(fix, /sent_at = coalesce\(sent_at, pg_catalog\.now\(\)\)/);
  assert.match(fix, /then coalesce\(p_available_at, pg_catalog\.now\(\)\)/);
  assert.match(fix, /last_error = pg_catalog\.left\(coalesce\(p_error, ''\), 500\)/);
});

// Mechanical form of "exactly as 0033 defines them": the only difference
// allowed is the three pg_catalog.coalesce( -> coalesce( substitutions.
test('0045 redefines both RPCs exactly as 0033 did, apart from bare coalesce', async () => {
  const fix = statementsOf(await readFile(FIX, 'utf8'));
  const broken = statementsOf(await readFile(BROKEN, 'utf8'));
  let substitutions = 0;

  for (const name of Object.keys(FUNCTIONS)) {
    const original = functionBlock(broken, name);
    substitutions += original.match(/pg_catalog\.coalesce\(/g)?.length ?? 0;
    assert.equal(functionBlock(fix, name), original.replaceAll('pg_catalog.coalesce(', 'coalesce('));
  }
  assert.equal(substitutions, 3);
});

test('0045 touches only the two mark RPCs and keeps their grants', async () => {
  const fix = statementsOf(await readFile(FIX, 'utf8'));

  const defined = [...fix.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([a-z_.]+)\s*\(/gi)]
    .map((match) => match[1].toLowerCase());
  assert.deepEqual(defined, Object.keys(FUNCTIONS).map((name) => `public.${name}`));
  assert.doesNotMatch(fix, /drop\s+function/i);
  assert.doesNotMatch(fix, /claim_notification_email_batch/i);

  for (const [name, args] of Object.entries(FUNCTIONS)) {
    const signature = `public\\.${name}\\(${args.replace(/[()]/g, '\\$&')}\\)`;
    assert.match(fix, new RegExp(`revoke all on function ${signature}\\s+from public, anon, authenticated;`, 'i'));
    assert.match(fix, new RegExp(`grant execute on function ${signature}\\s+to service_role;`, 'i'));
  }
  assert.doesNotMatch(fix, /grant[^;]+\bto\s+(?:public|anon|authenticated)\b/i);
});

// The check that would have stopped 0033: calling each RPC once makes
// plpgsql resolve the whole UPDATE, and nil ids match no outbox row.
test('0045 ends with a smoke call of both RPCs that cannot match a row', async () => {
  const fix = statementsOf(await readFile(FIX, 'utf8'));
  const smoke = fix.slice(fix.indexOf('do $smoke$'));

  assert.ok(fix.indexOf('do $smoke$') > fix.lastIndexOf('grant execute'), 'the smoke check runs after the grants');
  assert.match(smoke, /public\.mark_notification_email_sent\(\s*'00000000-0000-0000-0000-000000000000',\s*'00000000-0000-0000-0000-000000000000'\s*\)\s*<> 0/);
  assert.match(smoke, /public\.mark_notification_email_failed\(\s*'00000000-0000-0000-0000-000000000000',\s*'00000000-0000-0000-0000-000000000000',/);
  assert.match(smoke, /raise exception/i);
  assert.doesNotMatch(smoke, /\b(insert|update|delete)\b/i);
});

test('0045 is the latest definition of both mark RPCs', async () => {
  const files = (await readdir('supabase/migrations')).filter((name) => name.endsWith('.sql')).sort();

  for (const name of Object.keys(FUNCTIONS)) {
    const definers = [];
    for (const file of files) {
      const sql = statementsOf(await readFile(`supabase/migrations/${file}`, 'utf8'));
      if (new RegExp(`create\\s+or\\s+replace\\s+function\\s+public\\.${name}\\(`, 'i').test(sql)) definers.push(file);
    }
    assert.equal(definers.at(-1), '0045_fix_outbox_mark_coalesce.sql', `latest definer of ${name}`);
  }
});
