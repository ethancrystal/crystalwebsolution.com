import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function read(path) {
  return readFile(path, 'utf8');
}

test('clientSafeProject exposes budget_amount and currency to the client role', async () => {
  const source = await read('lib/crm/projects.js');
  const fnStart = source.indexOf('function clientSafeProject');
  const fnBody = source.slice(fnStart, source.indexOf('\nfunction sharedOnly'));
  assert.match(fnBody, /budget_amount: project\.budget_amount/);
  assert.match(fnBody, /currency: project\.currency/);
});

test('ProjectOverview renders budget only when set, with currency', async () => {
  const source = await read('components/crm/ProjectOverview.jsx');
  assert.match(source, /project\.budget_amount/);
  assert.match(source, /project\.currency/);
});
