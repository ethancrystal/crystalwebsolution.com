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
  // The comparison must reject when the expected secret is absent, not fall
  // through on `undefined === undefined`.
  assert.match(route, /!expected\s*\|\|/);
});

test('the route drains notifications_outbox instead of stubbing a zero count', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');

  assert.match(route, /notifications_outbox/);
  assert.doesNotMatch(route, /queued:\s*0\s*\}\s*\)\s*;?\s*$/m);
  // Claims only rows that are due, pending, and addressed to email.
  assert.match(route, /\.eq\(\s*['"]channel['"],\s*['"]email['"]\s*\)/);
  assert.match(route, /\.eq\(\s*['"]status['"],\s*['"]pending['"]\s*\)/);
  assert.match(route, /\.lte\(\s*['"]available_at['"]/);
});

test('delivery outcomes are recorded on the row', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');

  assert.match(route, /status:\s*['"]sent['"]/);
  assert.match(route, /sent_at:/);
  assert.match(route, /attempts:/);
  assert.match(route, /last_error:/);
  assert.match(route, /available_at:/);
});

test('non-retryable failures stop consuming the attempt budget', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');

  assert.match(route, /MAX_ATTEMPTS/);
  assert.match(route, /retryable/);
  // A terminal failure must be marked 'failed' rather than left pending.
  assert.match(route, /status:\s*canRetry\s*\?\s*['"]pending['"]\s*:\s*['"]failed['"]/);
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
  assert.match(route, /\.limit\(\s*BATCH_SIZE\s*\)/);
});

test('the route responds with counts only, never recipient data', async () => {
  const route = await readFile(ROUTE_PATH, 'utf8');
  assert.match(route, /claimed/);
  assert.match(route, /sent/);
  assert.match(route, /failed/);
  assert.doesNotMatch(route, /recipients:\s*recipients/);
});
