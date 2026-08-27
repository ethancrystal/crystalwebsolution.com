import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

let flagInstance = 0;

async function loadCrmFlag(value) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_CRM_ENABLED;
  else process.env.NEXT_PUBLIC_CRM_ENABLED = value;
  flagInstance += 1;
  const mod = await import(`../../lib/crmFlag.js?security-test=${flagInstance}`);
  return mod.CRM_ENABLED;
}

test('CRM flag treats case and whitespace variants of false as disabled', async () => {
  assert.equal(await loadCrmFlag(' false '), false);
  assert.equal(await loadCrmFlag('FALSE'), false);
  assert.equal(await loadCrmFlag(undefined), true);
});

test('middleware matcher includes auth callback routes for the CRM kill switch', async () => {
  const middleware = await readFile('middleware.js', 'utf8');
  assert.match(middleware, /['"]\/auth\/:path\*['"]/);
});
