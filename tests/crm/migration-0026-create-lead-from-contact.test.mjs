import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationPath = 'supabase/migrations/0026_create_lead_from_contact.sql';

async function readMigration() {
  return readFile(migrationPath, 'utf8');
}

test('create_lead_from_contact is SECURITY DEFINER with a locked search_path', async () => {
  const sql = await readMigration();
  const fn = sql.split(/create or replace function/i)[1];
  assert.ok(fn, 'create_lead_from_contact must be defined');
  assert.match(fn, /security definer/i);
  assert.match(fn, /set search_path = pg_catalog, public, extensions/i);
});

test('grants revoke PUBLIC, anon, and authenticated -- service-role only', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /revoke all on function public\.create_lead_from_contact\([^)]*\) from public/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.create_lead_from_contact\([^)]*\) from anon/i,
  );
  assert.match(
    sql,
    /revoke all on function public\.create_lead_from_contact\([^)]*\) from authenticated/i,
  );
  assert.doesNotMatch(
    sql,
    /grant execute on function public\.create_lead_from_contact[^;]*\bto\s+(public|anon|authenticated)\b/i,
    'must never be directly callable by anon/authenticated -- only the service-role admin client reaches it',
  );
});

test('validates name and email before writing anything', async () => {
  const sql = await readMigration();
  assert.match(sql, /if v_name = '' or length\(v_name\) > 100 then/i);
  assert.match(sql, /if v_email = '' or length\(v_email\) > 254/i);
});

test('matches an existing contact by lower(email) before creating a new one', async () => {
  const sql = await readMigration();
  assert.match(sql, /where lower\(c\.email\) = v_email/i);
});

test('resolves the admin actor via pinned_admin_email() for owner_id/created_by attribution', async () => {
  const sql = await readMigration();
  assert.match(sql, /lower\(au\.email\) = lower\(public\.pinned_admin_email\(\)\)/i);
  assert.match(sql, /v_admin_id is null then/i);
});

test('open-deal dedupe excludes closed_won and closed_lost stages', async () => {
  const sql = await readMigration();
  assert.match(
    sql,
    /d\.stage not in \('closed_won', 'closed_lost'\)/i,
    'must not append notes onto a deal that has already closed',
  );
});

test('new leads use the existing prospecting stage, not an unrecognized enum value', async () => {
  const sql = await readMigration();
  // The admin UI (app/admin/deals/pipeline/page.jsx normalizeStage()) silently
  // rebuckets any stage value it doesn't recognize into 'prospecting' -- this
  // asserts the migration doesn't introduce a value that would be misrendered.
  assert.match(sql, /values \(v_company_id, v_contact_id, v_deal_title, nullif\(v_deal_description, ''\), v_admin_id, 'prospecting'\)/i);
});

test('dedupe path inserts an internal note rather than a client-visible one', async () => {
  const sql = await readMigration();
  const dedupeBlock = sql.split(/if v_deal_id is not null then/i)[1];
  assert.ok(dedupeBlock, 'dedupe branch must exist');
  assert.match(dedupeBlock.split(/else/i)[0], /'internal'/);
});

test('writes a lead.created row to notifications_outbox with a null project_id', async () => {
  const sql = await readMigration();
  assert.match(sql, /'lead\.created'/);
  assert.match(sql, /insert into public\.notifications_outbox \(project_id, user_id, channel, event_type, payload\)/i);
});
