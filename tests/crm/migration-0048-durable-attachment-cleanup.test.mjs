import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Source contract for 0048. Behaviour (claim, lease, fail with backoff, retry,
// complete, clients locked out) is proven in
// supabase/tests/0048_durable_attachment_cleanup.test.sql; the route's
// ordering in tests/crm/attachment-cleanup-drain.test.jsx.

const MIGRATION = 'supabase/migrations/0048_durable_attachment_cleanup.sql';
const ROUTE = 'app/api/cron/crm-notifications/route.js';

test('the queue is service-role only', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  assert.match(sql, /create table if not exists public\.project_attachment_cleanup \(\s*storage_path text primary key/);
  assert.match(sql, /alter table public\.project_attachment_cleanup enable row level security;/);
  assert.match(sql, /revoke all on table public\.project_attachment_cleanup from public, anon, authenticated;/);
  for (const signature of [
    'claim_attachment_cleanup(timestamptz, integer, integer)',
    'complete_attachment_cleanup(text[])',
    'fail_attachment_cleanup(text[], text)',
  ]) {
    const escaped = signature.replace(/[()[\]]/g, '\\$&');
    assert.match(sql, new RegExp(`revoke all on function public\\.${escaped} from public, anon, authenticated;`));
    assert.match(sql, new RegExp(`grant execute on function public\\.${escaped} to service_role;`));
  }
});

test('claiming queues the row before deleting it, and leases what it returns', async () => {
  const sql = await readFile(MIGRATION, 'utf8');
  const claim = sql.slice(sql.indexOf('create or replace function public.claim_attachment_cleanup('), sql.indexOf('create or replace function public.complete_attachment_cleanup('));
  assert.ok(claim.indexOf('insert into public.project_attachment_cleanup') < claim.indexOf('delete from public.project_attachments'));
  assert.match(claim, /for update skip locked/);
  assert.match(claim, /set next_attempt_at = pg_catalog\.now\(\) \+ pg_catalog\.make_interval\(secs => p_lease_seconds\)/);
  // The old one-shot function is kept for the pre-apply fallback.
  assert.doesNotMatch(sql, /drop function[^;]*cleanup_stale_project_attachments/i);
});

test('the route forgets an entry only after storage removal succeeds', async () => {
  const route = await readFile(ROUTE, 'utf8');
  const fn = route.slice(route.indexOf('async function cleanupStaleAttachments('), route.indexOf('async function legacyCleanupStaleAttachments('));
  const removeAt = fn.indexOf(".remove(paths)");
  const failAt = fn.indexOf("rpc('fail_attachment_cleanup'");
  const completeAt = fn.indexOf("rpc('complete_attachment_cleanup'");
  assert.ok(fn.indexOf("rpc('claim_attachment_cleanup'") < removeAt);
  assert.ok(removeAt < failAt && failAt < completeAt, 'fail on error, complete only after');
  assert.match(fn, /if \(storageError\) \{[\s\S]*?fail_attachment_cleanup[\s\S]*?return 0;\s*\}/);
  assert.match(fn, /if \(isMissingFunction\(error\)\) return legacyCleanupStaleAttachments\(supabase, cutoff\);/);
});
