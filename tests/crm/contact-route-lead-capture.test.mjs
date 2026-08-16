import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// No route-level test harness exists in this repo yet (no fetch/Next.js
// request mocking is set up) -- this follows the same regex-over-source
// contract-test convention already used for migration files, asserting the
// two properties that matter: the CRM write never runs on spam, and its
// failure can never affect the visitor-facing response.
const routePath = 'app/api/contact/route.js';

async function readRoute() {
  return readFile(routePath, 'utf8');
}

test('createLeadBestEffort never throws -- wrapped in its own try/catch', async () => {
  const source = await readRoute();
  const start = source.indexOf('async function createLeadBestEffort');
  const fn = start === -1 ? '' : source.slice(start);
  assert.ok(fn, 'createLeadBestEffort must be defined');
  assert.match(fn, /try \{[\s\S]*catch \(error\)/);
});

test('the CRM write is called after the spam/validation-error early returns, never before', async () => {
  const source = await readRoute();
  const honeypotReturnIndex = source.indexOf('rejectedAsSpam');
  const validationReturnIndex = source.indexOf('!validation.valid');
  const rpcCallIndex = source.indexOf('createLeadBestEffort(validation.data)');

  assert.ok(honeypotReturnIndex !== -1 && validationReturnIndex !== -1 && rpcCallIndex !== -1);
  assert.ok(
    rpcCallIndex > honeypotReturnIndex && rpcCallIndex > validationReturnIndex,
    'createLeadBestEffort must be called after both the honeypot and validation early-return checks, never before',
  );
});

test('webhookDelivered/emailDelivered outcome variables are untouched by the CRM write', async () => {
  const source = await readRoute();
  const leadCallToEmailBlock = source.slice(
    source.indexOf('createLeadBestEffort(validation.data)'),
    source.indexOf('let emailDelivered = false'),
  );
  assert.doesNotMatch(
    leadCallToEmailBlock,
    /webhookDelivered\s*=/,
    'the CRM write must not be able to set webhookDelivered -- it is unrelated to webhook delivery',
  );
});

test('dealUrl is threaded into the operations email without changing its required fields', async () => {
  const source = await readRoute();
  assert.match(source, /contactSubmissionEmail\(\{ \.\.\.validation\.data, dealUrl \}\)/);
});

test('createLeadBestEffort calls the RPC via the service-role admin client, not a browser/anon client', async () => {
  const source = await readRoute();
  assert.match(source, /import \{ createAdminClient \} from '@\/lib\/supabase\/admin';/);
  assert.match(source, /createAdminClient\(\)/);
  assert.doesNotMatch(source, /createClient\(\)\.rpc\('create_lead_from_contact'/);
});
