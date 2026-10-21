import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for migration 0053 (artwork upload for the production
// request form, plus the deal-title prefix by source). Behaviour is proved by
// supabase/tests/0053_contact_artwork.test.sql; this pins the shapes that the
// app code in lib/contactArtworkServer.js and app/api/contact depends on.

const migrationPath = 'supabase/migrations/0053_contact_artwork.sql';
const sql = await readFile(migrationPath, 'utf8');

test('the bucket is private, size-capped and MIME-limited', () => {
  assert.match(sql, /INSERT INTO storage\.buckets \(id, name, public, file_size_limit, allowed_mime_types\)/);
  assert.match(sql, /'contact-artwork',\s*'contact-artwork',\s*false,\s*10485760/);
  assert.match(sql, /ON CONFLICT \(id\) DO UPDATE[\s\S]*public = false/);
});

test('the bucket gets no storage.objects policies: objects are reachable only through signed URLs', () => {
  assert.doesNotMatch(sql, /ON storage\.objects/i);
  assert.doesNotMatch(sql, /CREATE POLICY[^;]*storage\.objects/i);
});

test('contact_artwork is RLS-protected with no client writes and an admin-only, attached-only read', () => {
  assert.match(sql, /ALTER TABLE public\.contact_artwork ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.contact_artwork FROM anon/);
  assert.match(sql, /REVOKE ALL ON public\.contact_artwork FROM authenticated/);
  assert.match(sql, /GRANT SELECT ON public\.contact_artwork TO authenticated/);
  assert.doesNotMatch(sql, /GRANT (INSERT|UPDATE|DELETE|ALL)[^;]*contact_artwork/i);
  assert.match(sql, /FOR SELECT TO authenticated\s+USING \(public\.is_admin\(\) AND status = 'attached'\)/);
});

test('rows cascade with their deal and paths are unique', () => {
  assert.match(sql, /deal_id UUID NOT NULL REFERENCES public\.deals\(id\) ON DELETE CASCADE/);
  assert.match(sql, /storage_path TEXT NOT NULL UNIQUE/);
  assert.match(sql, /status TEXT NOT NULL DEFAULT 'pending' CHECK \(status IN \('pending', 'attached'\)\)/);
});

for (const signature of [
  'reserve_contact_artwork(UUID, UUID, JSONB)',
  'attach_contact_artwork(UUID, UUID, JSONB)',
  'create_lead_from_contact(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)',
]) {
  test(`${signature} is service-role only: revoked from public, anon and authenticated`, () => {
    for (const role of ['PUBLIC', 'anon', 'authenticated']) {
      assert.ok(
        sql.includes(`REVOKE ALL ON FUNCTION public.${signature} FROM ${role};`),
        `must revoke ${signature} from ${role}`,
      );
    }
    assert.doesNotMatch(sql, new RegExp(`GRANT[^;]*ON FUNCTION public\\.${signature.split('(')[0]}`));
  });
}

test('the RPCs run as the definer with a pinned search_path', () => {
  for (const name of ['reserve_contact_artwork', 'attach_contact_artwork', 'create_lead_from_contact']) {
    const start = sql.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    assert.notEqual(start, -1, `${name} must be defined`);
    const header = sql.slice(start, sql.indexOf('AS $fn$', start));
    assert.match(header, /SECURITY DEFINER/);
    assert.match(header, /SET search_path = pg_catalog, public, extensions/);
  }
});

test('reserve_contact_artwork re-checks every bound the app enforces', () => {
  assert.match(sql, /v_count < 1 OR v_count > 3/);
  assert.match(sql, /v_size < 1 OR v_size > 10485760/);
  assert.match(sql, /v_total > 26214400/);
  assert.match(sql, /v_existing \+ v_count > 12/);
  assert.match(sql, /File type is not accepted/);
});

test('attach_contact_artwork is serialized per submission and idempotent', () => {
  assert.match(sql, /pg_advisory_xact_lock\(hashtext\('attach_contact_artwork'\), hashtext\(p_submission_id::text\)\)/);
  assert.match(sql, /'attached_names', v_names/);
  assert.match(sql, /'removed_paths', v_removed/);
  assert.match(sql, /IF v_newly > 0 THEN/, 'the note is only added when something new attached');
});

test('create_lead_from_contact differs from 0029 only in the new-deal title prefix', async () => {
  const previous = await readFile('supabase/migrations/0029_lead_capture_review_followups.sql', 'utf8');

  assert.match(previous, /v_deal_title := left\('Website inquiry — ' \|\| coalesce\(v_company_name, v_name\), 200\)/);
  assert.match(sql, /WHEN 'website_production_request' THEN 'Production request — '/);
  assert.match(sql, /ELSE 'Website inquiry — '/);
  assert.match(sql, /v_deal_title := left\(v_deal_title_prefix \|\| coalesce\(v_company_name, v_name\), 200\)/);

  // The lock, the dedupe, the outbox row and the return shape are unchanged.
  for (const token of [
    "pg_advisory_xact_lock(hashtext('create_lead_from_contact'), hashtext(v_email))",
    "AND d.stage NOT IN ('closed_won', 'closed_lost')",
    "'lead.created'",
    "'note_appended', v_note_appended",
    "'company_id', v_company_id",
    "'New website inquiry (' || v_source || '):'",
  ]) {
    assert.ok(previous.includes(token), `0029 must contain ${token}`);
    assert.ok(sql.includes(token), `0053 must keep ${token}`);
  }
});

test('no function in this migration calls a SQL grammar keyword through pg_catalog', () => {
  assert.doesNotMatch(sql, /pg_catalog\s*\.\s*(coalesce|nullif|greatest|least)\s*\(/i);
});

test('the app code uses the bucket and RPC names this migration defines', async () => {
  const server = await readFile('lib/contactArtworkServer.js', 'utf8');
  const shared = await readFile('lib/contactArtwork.mjs', 'utf8');
  const route = await readFile('app/api/contact/route.js', 'utf8');

  assert.match(shared, /ARTWORK_BUCKET = 'contact-artwork'/);
  assert.match(server, /rpc\('reserve_contact_artwork'/);
  assert.match(server, /rpc\('attach_contact_artwork'/);
  assert.match(server, /from\('contact_artwork'\)/);
  assert.match(route, /'website_production_request'/);
});

test('the daily cron sweeps stale reservations without being able to stop the outbox drain', async () => {
  const cron = await readFile('app/api/cron/crm-notifications/route.js', 'utf8');
  const server = await readFile('lib/contactArtworkServer.js', 'utf8');

  assert.match(cron, /import \{ cleanupStaleContactArtwork \} from '@\/lib\/contactArtworkServer'/);
  assert.match(cron, /await cleanupStaleContactArtwork\(supabase\)/);

  const start = server.indexOf('export async function cleanupStaleContactArtwork');
  const fn = server.slice(start);
  assert.match(fn, /try \{[\s\S]*\} catch \(error\)/, 'the sweep must never throw');
  assert.ok(
    fn.indexOf('.remove(paths)') < fn.lastIndexOf(".from('contact_artwork_removals')\n      .delete()"),
    'a queue entry is forgotten only after storage has removed its object',
  );
});

test('every deleted contact_artwork row queues its object path, however it was deleted', () => {
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.contact_artwork_removals \(\s*storage_path TEXT PRIMARY KEY/);
  assert.match(sql, /ALTER TABLE public\.contact_artwork_removals ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /REVOKE ALL ON public\.contact_artwork_removals FROM authenticated/);
  assert.doesNotMatch(sql, /\bGRANT (SELECT|INSERT|UPDATE|DELETE|ALL)\b[^;]*contact_artwork_removals/);
  assert.doesNotMatch(sql, /\bCREATE POLICY\b[^;]*contact_artwork_removals/);

  // AFTER DELETE FOR EACH ROW fires for cascades from deals and companies too.
  assert.match(sql, /CREATE TRIGGER contact_artwork_queue_removal\s+AFTER DELETE ON public\.contact_artwork\s+FOR EACH ROW/);
  const start = sql.indexOf('CREATE OR REPLACE FUNCTION public.queue_contact_artwork_removal()');
  const header = sql.slice(start, sql.indexOf('AS $fn$', start));
  assert.match(header, /SECURITY DEFINER/);
  assert.match(header, /SET search_path = pg_catalog, public/);
  assert.match(sql, /INSERT INTO public\.contact_artwork_removals \(storage_path\)\s+VALUES \(OLD\.storage_path\)\s+ON CONFLICT \(storage_path\) DO NOTHING/);
  for (const role of ['PUBLIC', 'anon', 'authenticated']) {
    assert.ok(sql.includes(`REVOKE ALL ON FUNCTION public.queue_contact_artwork_removal() FROM ${role};`));
  }
});

test('the server sweep expires only stale pending rows and drains the queue in bounded batches', async () => {
  const server = await readFile('lib/contactArtworkServer.js', 'utf8');

  assert.match(server, /\.from\('contact_artwork'\)\s+\.delete\(\)\s+\.eq\('status', 'pending'\)\s+\.lt\('created_at', cutoff\)/);
  assert.match(server, /\.from\('contact_artwork_removals'\)\s+\.select\('storage_path'\)\s+\.limit\(REMOVAL_BATCH\)/);
  assert.match(server, /\.in\('storage_path', paths\)/);
});
