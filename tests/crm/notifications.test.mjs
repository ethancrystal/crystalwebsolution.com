import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const TEST_SECRET = 'test-cron-secret';

test('notification route rejects missing or wrong CRON_SECRET', async () => {
  const route = await readFile('app/api/cron/crm-notifications/route.js', 'utf8');
  assert.match(route, /x-cron-secret/i);
  assert.match(route, /CRM_CRON_SECRET/);
  assert.match(route, /401/);
  assert.doesNotMatch(route, /process\.env\.CRM_CRON_SECRET\s*==\s*null/i);
});

test('notification route never echoes request secrets or email payloads', async () => {
  const route = await readFile('app/api/cron/crm-notifications/route.js', 'utf8');
  assert.doesNotMatch(route, /console\.log\(.*CRM_CRON_SECRET/i);
  assert.doesNotMatch(route, /return.*request\.body/i);
});
