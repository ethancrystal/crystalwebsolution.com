import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0027_lead_capture_review_followups.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

// ---------- Finding #1: the duplicate-lead race ----------

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
  assert.doesNotMatch(
    sql,
    /pg_advisory_lock\(/i,
    'the session-scoped variant would strand the lock on a mid-function failure',
  );
});

test('the lock is taken before the contact lookup, not after', async () => {
  const sql = await readMigration();
  const lockIndex = sql.indexOf('pg_advisory_xact_lock');
  const lookupIndex = sql.indexOf('FROM public.contacts c');
  assert.ok(lockIndex !== -1 && lookupIndex !== -1);
  assert.ok(
    lockIndex < lookupIndex,
    'locking after the read-then-write window leaves the exact race the lock exists to close',
  );
});

// ---------- Finding #2: title/payload disagreement ----------

test('deal title and notification payload both derive from the company row attached to the deal', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /select co\.name into v_company_name\s+from public\.companies co\s+where co\.id = v_company_id/i,
    'the single source of truth must be the company actually attached, not a re-derived guess',
  );
  assert.match(sql, /v_deal_title := left\('Website inquiry — ' \|\| coalesce\(v_company_name, v_name\), 200\)/i);
  assert.match(sql, /'lead_company', v_company_name/i);
});

test('the title no longer falls back to the raw domain, which would surface "gmail.com" as a deal name', async () => {
  const sql = await readMigration();
  const titleLine = sql.split('\n').find((line) => line.includes('v_deal_title :='));
  assert.ok(titleLine, 'deal title assignment must exist');
  assert.doesNotMatch(
    titleLine,
    /v_domain/,
    'on the free-mail path the company is named after the person; coalescing to v_domain there would title the deal "gmail.com"',
  );
});

test('v_domain is computed unconditionally so every path can reason about it', async () => {
  const sql = await readMigration();
  const domainAssign = sql.indexOf("v_domain := split_part(v_email, '@', 2)");
  const contactBranch = sql.indexOf('IF v_contact_id IS NULL THEN');
  assert.ok(domainAssign !== -1 && contactBranch !== -1);
  assert.ok(
    domainAssign < contactBranch,
    '0026 assigned v_domain only inside the new-contact branch, leaving it NULL on the existing-contact paths',
  );
});

// ---------- Finding #3: unbounded p_source ----------

test('p_source is length-bounded like every other input before reaching notes.content', async () => {
  const sql = await readMigration();
  assert.match(sql, /v_source TEXT := left\(btrim\(coalesce\(p_source, 'website_contact_form'\)\), 50\)/i);
  assert.match(
    sql,
    /'New website inquiry \(' \|\| v_source \|\| '\):'/i,
    'the note must interpolate the bounded local, not the raw parameter',
  );
});

// ---------- Invariants carried over from 0026 ----------

test('still SECURITY DEFINER with a locked search_path', async () => {
  const sql = await readMigration();
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = pg_catalog, public, extensions/i);
});

test('grants stay revoked from PUBLIC, anon, and authenticated', async () => {
  const sql = await readMigration();
  for (const role of ['public', 'anon', 'authenticated']) {
    assert.match(
      sql,
      new RegExp(`revoke all on function public\\.create_lead_from_contact\\([^)]*\\) from ${role}`, 'i'),
      `a CREATE OR REPLACE keeps existing grants, but re-revoking keeps this migration self-contained (${role})`,
    );
  }
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.create_lead_from_contact[^;]*\bto\s+(public|anon|authenticated)\b/i,
  );
});

test('dedupe still excludes closed deals and still writes an internal-visibility note', async () => {
  const sql = await readMigration();
  assert.match(sql, /d\.stage not in \('closed_won', 'closed_lost'\)/i);
  const dedupeBranch = sql.split(/IF v_deal_id IS NOT NULL THEN/i)[1].split(/ELSE/i)[0];
  assert.match(dedupeBranch, /'internal'/);
});

test('new deals still use the prospecting stage the admin Kanban board recognizes', async () => {
  const sql = await readMigration();
  assert.match(sql, /v_admin_id, 'prospecting'\)/i);
});
