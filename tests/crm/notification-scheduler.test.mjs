import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const RUNBOOK_PATH = 'docs/CRM-OPERATIONS.md';
const CRON_CONFIG_PATH = 'vercel.json';
const SCHEDULER_MIGRATION_PATH = 'supabase/migrations/0025_schedule_notification_drain.sql';

test('notification operations runbook documents primary and backstop schedulers', async () => {
  const runbook = await readFile(RUNBOOK_PATH, 'utf8');
  const vercel = JSON.parse(await readFile(CRON_CONFIG_PATH, 'utf8'));
  const schedulerMigration = await readFile(SCHEDULER_MIGRATION_PATH, 'utf8');

  assert.doesNotMatch(runbook, /protected stub/i);
  assert.match(runbook, /Supabase[^\n]*pg_cron/i);
  assert.match(runbook, /every\s+five\s+minutes|\*\/5\s+\*\s+\*\s+\*\s\*/i);
  assert.match(runbook, /Vercel[^\n]*Cron/i);
  assert.match(runbook, /daily\s+backstop|0\s+13\s+\*\s+\*\s\*/i);
  assert.match(runbook, /CRM_CRON_SECRET/);
  assert.match(runbook, /CRON_SECRET/);
  assert.match(runbook, /crm_cron_secret/);
  assert.match(runbook, /pnpm\s+test:crm/);
  assert.match(runbook, /pnpm\s+test:db/);
  assert.match(runbook, /owner|approval/i);
  assert.match(schedulerMigration, /drain-crm-outbox/);
  assert.match(schedulerMigration, /crm_cron_secret/);

  const cron = vercel.crons?.find((entry) => entry.path === '/api/cron/crm-notifications');
  assert.ok(cron, 'Vercel notification backstop is missing');
  assert.equal(cron.schedule, '0 13 * * *');
});

test('notification operations runbook defines safe smoke-test boundaries', async () => {
  const runbook = await readFile(RUNBOOK_PATH, 'utf8');

  assert.match(runbook, /do not.*production.*migration|production.*approval/i);
  assert.match(runbook, /no.*payload|payload.*secret|never.*secret/i);
  assert.match(runbook, /pending.*email|email.*pending/i);
  assert.match(runbook, /lease|claim/i);
});
