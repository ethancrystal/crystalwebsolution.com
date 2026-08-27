import assert from 'node:assert/strict';
import test from 'node:test';

// lib/crmFlag.js reads NEXT_PUBLIC_CRM_ENABLED at module load and holds it in
// a top-level const, so each case sets the env var first and imports a fresh
// instance via a unique query string (Node caches ES module imports by exact
// specifier).
let instance = 0;

async function loadFlag(value) {
  if (value === undefined) delete process.env.NEXT_PUBLIC_CRM_ENABLED;
  else process.env.NEXT_PUBLIC_CRM_ENABLED = value;

  instance += 1;
  const mod = await import(`../lib/crmFlag.js?instance=${instance}`);
  return mod.CRM_ENABLED;
}

test('missing NEXT_PUBLIC_CRM_ENABLED fails open (enabled) for local dev and preview', async () => {
  assert.equal(await loadFlag(undefined), true);
});

test('the literal string "false" disables the CRM', async () => {
  assert.equal(await loadFlag('false'), false);
});

test('case and whitespace variants of "false" still disable the CRM', async () => {
  assert.equal(await loadFlag('False'), false);
  assert.equal(await loadFlag('FALSE'), false);
  assert.equal(await loadFlag(' false '), false);
  assert.equal(await loadFlag('  False\n'), false);
});

test('any other value, including a typo, leaves the CRM enabled', async () => {
  assert.equal(await loadFlag('true'), true);
  assert.equal(await loadFlag('flase'), true);
  assert.equal(await loadFlag('0'), true);
});
