import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

// next.config.js reads NEXT_PUBLIC_SUPABASE_URL at module scope to derive the
// connect-src origins, so it has to be stubbed before the require below.
const SUPABASE_ORIGIN = 'https://example.supabase.co';

// The whole Content-Security-Policy, pinned directive by directive.
//
// Why an exact set rather than the `includes(...)` assertions in
// analytics.test.mjs and login-background.test.mjs: those name individual
// origins, so they only catch the one regression each was written for. A
// widening they don't name passes silently — verified against this suite at
// v1.13, where adding `https://cdn.unpkg.com` to script-src, and even
// collapsing it to a bare `https:`, left all 449 tests green. Comparing the
// full parsed policy fails on ANY change, which is the point: a CSP edit
// should not be able to land without someone deliberately updating this
// table and justifying the new token in review.
//
// Tokens are compared order-insensitively — reordering a directive changes
// nothing about what the browser enforces.
const EXPECTED_CSP = {
  'default-src': ["'self'"],
  // 'unsafe-inline'/'unsafe-eval' are required by Next's inline bootstrap and
  // the R3F/GSAP runtime; removing them needs a nonce refactor, tracked
  // separately. blob: is for Three.js shader workers. The only third-party
  // origin is gtag.js — see analytics.test.mjs for why it must stay.
  'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:', 'https://www.googletagmanager.com'],
  'worker-src': ["'self'", 'blob:'],
  'style-src': ["'self'", "'unsafe-inline'"],
  // Deliberately wide: img-src permits any https host. Images cannot execute,
  // so this trades a real risk reduction for not having to enumerate every
  // CMS/CDN host the marketing pages reference. Narrow it if that changes.
  'img-src': ["'self'", 'data:', 'blob:', 'https:'],
  'font-src': ["'self'", 'data:'],
  'connect-src': [
    "'self'",
    SUPABASE_ORIGIN,
    SUPABASE_ORIGIN.replace(/^https:/, 'wss:'),
    'https://www.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://analytics.google.com',
    'https://*.analytics.google.com',
    'https://stats.g.doubleclick.net',
    'https://*.g.doubleclick.net',
    'https://www.google.com',
  ],
  'media-src': ["'self'", 'data:', 'blob:'],
  'frame-src': ["'self'", 'https://td.doubleclick.net'],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"],
};

const parseCsp = (value) =>
  Object.fromEntries(
    value.split('; ').map((directive) => {
      const [name, ...tokens] = directive.split(' ');
      return [name, tokens.slice().sort()];
    }),
  );

const sortExpected = (expected) =>
  Object.fromEntries(Object.entries(expected).map(([name, tokens]) => [name, tokens.slice().sort()]));

async function loadCsp() {
  process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_ORIGIN;
  const config = createRequire(import.meta.url)(path.join(ROOT, 'next.config.js'));
  const [rule] = await config.headers();
  return rule.headers.find((header) => header.key === 'Content-Security-Policy').value;
}

test('the Content-Security-Policy matches its pinned allowlist exactly', async () => {
  const actual = parseCsp(await loadCsp());

  assert.deepStrictEqual(
    actual,
    sortExpected(EXPECTED_CSP),
    'The CSP no longer matches the allowlist pinned in this test.\n' +
      'This is not a test to silence — it is the review checkpoint for a security header.\n' +
      'If the change is intended, update EXPECTED_CSP above and say in the PR what needs\n' +
      'the new token and why a narrower one will not do. If it is not intended, a\n' +
      'dependency or edit has widened the policy.',
  );
});

test('no fetch directive falls back to default-src by omission', async () => {
  const actual = parseCsp(await loadCsp());

  // CSP has no "deny everything else" catch-all: a directive that is absent
  // inherits default-src, and one that is present but empty blocks entirely.
  // Both are easy to introduce by editing the array in next.config.js, and
  // neither shows up as an error anywhere at runtime.
  for (const name of Object.keys(EXPECTED_CSP)) {
    assert.ok(name in actual, `${name} is missing from the CSP — it would silently inherit default-src`);
    assert.ok(actual[name].length > 0, `${name} is present but empty, which blocks the resource type outright`);
  }
});

test('script-src never allows a bare scheme or wildcard host', async () => {
  const { 'script-src': scriptSrc } = parseCsp(await loadCsp());

  // The exact-match test above already fails on any widening. This one exists
  // to name the specific failure mode in its message, because a bare `https:`
  // or `*` in script-src is the difference between a policy that constrains
  // script execution and one that only looks like it does.
  for (const token of scriptSrc) {
    assert.notEqual(token, 'https:', 'script-src allows any https origin to execute script — the directive is doing nothing');
    assert.notEqual(token, '*', 'script-src allows any origin to execute script — the directive is doing nothing');
    assert.doesNotMatch(
      token,
      /^https:\/\/\*\.?$/,
      `script-src contains the wildcard host ${token}, which permits script from any origin`,
    );
  }
});
