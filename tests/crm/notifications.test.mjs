import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const ROUTE_PATH = 'app/api/cron/crm-notifications/route.js';

test('notification route rejects missing or wrong CRON_SECRET', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  assert.match(route, /x-cron-secret/i);
  assert.match(route, /CRM_CRON_SECRET/);
  assert.match(route, /401/);
  assert.doesNotMatch(route, /process\.env\.CRM_CRON_SECRET\s*==\s*null/i);
});

test('notification route never echoes request secrets or email payloads', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  assert.doesNotMatch(route, /console\.log\(.*CRM_CRON_SECRET/i);
  assert.doesNotMatch(route, /return.*request\.body/i);
});

test('an unset cron secret does not turn the route into an open relay', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  // With no secret configured the handler must reject, not fall through on
  // `undefined === undefined`.
  assert.match(route, /accepted\.length === 0\) return false/);
});

test('the scheduled entry point is reachable by Vercel Cron', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  // Vercel Cron issues GET and cannot send custom headers, so the route must
  // export GET and accept an Authorization: Bearer credential.
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /Bearer /);
  assert.match(route, /x-cron-secret/i);
});

test('the secret comparison is constant-time and length-checked', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  assert.match(route, /timingSafeEquals/);
  assert.match(route, /a\.length !== b\.length/);
  assert.doesNotMatch(route, /presented\s*===\s*expected/);
});

test('vercel.json schedules the drain against the real route path', async () => {
  const config = JSON.parse(await readFile('vercel.json', 'utf8'));
  const cron = config.crons?.find((c) => c.path === '/api/cron/crm-notifications');

  assert.ok(cron, 'no cron entry for the notification drain');
  // Five space-separated cron fields.
  assert.equal(cron.schedule.trim().split(/\s+/).length, 5);
});

test('the route drains notifications_outbox through the atomic claim RPC', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');

  assert.match(route, /notifications_outbox/);
  assert.doesNotMatch(route, /queued:\s*0\s*\}\s*\)\s*;?\s*$/m);
  assert.match(route, /rpc\(\s*['"]claim_notification_email_batch['"]/);
  assert.match(route, /p_limit:\s*BATCH_SIZE/);
});

test('delivery outcomes use lease-owned completion RPCs', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');

  assert.match(route, /rpc\(\s*['"]mark_notification_email_sent['"]/);
  assert.match(route, /rpc\(\s*['"]mark_notification_email_failed['"]/);
  assert.match(route, /lease_id/);
});

test('non-retryable failures stop consuming the attempt budget', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');

  assert.match(route, /MAX_ATTEMPTS/);
  assert.match(route, /retryable/);
  assert.match(route, /retryable:\s*canRetry/);
  assert.match(route, /p_retryable:\s*retryable/);
  assert.match(route, /failureCode/);
});

test('sends are idempotent so a retry cannot duplicate a notification', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  assert.match(route, /idempotencyKey/);
});

test('in_app and realtime rows are left for the dashboard to read', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  // The only channel filter present must be the email one.
  assert.doesNotMatch(route, /\.eq\(\s*['"]channel['"],\s*['"]in_app['"]\s*\)/);
  assert.doesNotMatch(route, /\.eq\(\s*['"]channel['"],\s*['"]realtime['"]\s*\)/);
});

test('the batch is bounded so one tick cannot run unbounded', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  assert.match(route, /BATCH_SIZE/);
  assert.match(route, /p_limit:\s*BATCH_SIZE/);
});

test('the route responds with counts only, never recipient data', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  assert.match(route, /claimed/);
  assert.match(route, /sent/);
  assert.match(route, /failed/);
  assert.doesNotMatch(route, /recipients:\s*recipients/);
});
