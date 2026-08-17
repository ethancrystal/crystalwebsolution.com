import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0029_lead_capture_review_followups.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('adds a partial unique index on lower(email) so duplicate contacts are impossible at the storage layer', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /create unique index if not exists contacts_lower_email_unique_idx\s+on public\.contacts \(lower\(email\)\)\s+where email is not null/i,
    'must be UNIQUE (a plain btree does not prevent the race) and partial (contacts.email is nullable)',
  );
});

test('serializes concurrent calls for the same email with a transaction-scoped advisory lock', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /pg_advisory_xact_lock\(hashtext\('create_lead_from_contact'\), hashtext\(v_email\)\)/i,
    'must be the _xact_ variant so the lock releases on commit/rollback rather than leaking on error',
  );
  assert.doesNotMatch(sql, /pg_advisory_lock\(/i, 'session-scoped locks could strand on failure');
});

test('takes the lock before the contact lookup', async () => {
  const sql = await readMigration();
  const lockIndex = sql.indexOf('pg_advisory_xact_lock');
  const lookupIndex = sql.indexOf('FROM public.contacts c');
  assert.ok(lockIndex !== -1 && lookupIndex !== -1);
  assert.ok(lockIndex < lookupIndex, 'the lock must close the read-then-write race');
});

test('deal title and notification payload derive from the attached company row', async () => {
  const sql = await readMigration();
  assert.match(sql, /select co\.name into v_company_name\s+from public\.companies co\s+where co\.id = v_company_id/i);
  assert.match(sql, /v_deal_title := left\('Website inquiry — ' \|\| coalesce\(v_company_name, v_name\), 200\)/i);
  assert.match(sql, /'lead_company', v_company_name/i);
});

test('does not fall back to the raw domain for the deal title', async () => {
  const sql = await readMigration();
  const titleLine = sql.split('\n').find((line) => line.includes('v_deal_title :='));
  assert.ok(titleLine);
  assert.doesNotMatch(titleLine, /v_domain/);
});

test('computes v_domain before every contact path', async () => {
  const sql = await readMigration();
  const domainAssign = sql.indexOf("v_domain := split_part(v_email, '@', 2)");
  const contactBranch = sql.indexOf('IF v_contact_id IS NULL THEN');
  assert.ok(domainAssign !== -1 && contactBranch !== -1);
  assert.ok(domainAssign < contactBranch);
});

test('bounds p_source before it can reach notes.content', async () => {
  const sql = await readMigration();
  assert.match(sql, /v_source TEXT := left\(btrim\(coalesce\(p_source, 'website_contact_form'\)\), 50\)/i);
  assert.match(sql, /'New website inquiry \(' \|\| v_source \|\| '\):'/i);
});

test('retains a locked search path and revokes all API-role execution', async () => {
  const sql = await readMigration();
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public, extensions/i);
  for (const role of ['public', 'anon', 'authenticated']) {
    assert.match(sql, new RegExp(`revoke all on function public\\.create_lead_from_contact\\([^)]*\\) from ${role}`, 'i'));
  }
  assert.doesNotMatch(sql, /grant execute on function public\.create_lead_from_contact[^;]*\bto\s+(public|anon|authenticated)\b/i);
});

test('preserves closed-deal dedupe and internal note behavior', async () => {
  const sql = await readMigration();
  assert.match(sql, /d\.stage not in \('closed_won', 'closed_lost'\)/i);
  const dedupeBranch = sql.split(/IF v_deal_id IS NOT NULL THEN/i)[1].split(/ELSE/i)[0];
  assert.match(dedupeBranch, /'internal'/);
});

test('new deals remain in the prospecting stage', async () => {
  const sql = await readMigration();
  assert.match(sql, /v_admin_id, 'prospecting'\)/i);
});
