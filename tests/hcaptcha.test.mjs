import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  HCAPTCHA_DEFAULT_SITE_KEY,
  HCAPTCHA_TOKEN_FIELD,
  HCAPTCHA_TOKEN_MAX_LENGTH,
  HCAPTCHA_VERIFY_URL,
  getHCaptchaSiteKey,
  isHCaptchaEnforced,
  normalizeHCaptchaToken,
  verifyHCaptchaToken,
} from '../lib/hcaptcha.mjs';

const silent = { error() {}, warn() {} };

function fakeFetch({ status = 200, body = { success: true }, throws = null, calls = [] } = {}) {
  return async (url, init) => {
    calls.push({ url, init });
    if (throws) throw throws;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    };
  };
}

test('site key falls back to the production key and can be overridden per environment', () => {
  assert.equal(getHCaptchaSiteKey({}), HCAPTCHA_DEFAULT_SITE_KEY);
  assert.equal(getHCaptchaSiteKey({ NEXT_PUBLIC_HCAPTCHA_SITE_KEY: '  preview-key ' }), 'preview-key');
});

test('enforcement is keyed on HCAPTCHA_SECRET being set (fail open when unconfigured, like the rate limiter)', async () => {
  assert.equal(isHCaptchaEnforced({}), false);
  assert.equal(isHCaptchaEnforced({ HCAPTCHA_SECRET: '   ' }), false);
  assert.equal(isHCaptchaEnforced({ HCAPTCHA_SECRET: 'x' }), true);

  const calls = [];
  const result = await verifyHCaptchaToken('', { env: {}, fetchImpl: fakeFetch({ calls }), logger: silent });
  assert.deepEqual(result, { ok: true, reason: 'not-enforced' });
  assert.equal(calls.length, 0, 'must not call hCaptcha when not enforced');
});

test('token normalisation rejects non-strings, blanks and oversized payloads', () => {
  assert.equal(normalizeHCaptchaToken(undefined), '');
  assert.equal(normalizeHCaptchaToken(42), '');
  assert.equal(normalizeHCaptchaToken('   '), '');
  assert.equal(normalizeHCaptchaToken(' abc '), 'abc');
  assert.equal(normalizeHCaptchaToken('a'.repeat(HCAPTCHA_TOKEN_MAX_LENGTH + 1)), '');
});

test('a missing token is refused without a network call when enforced', async () => {
  const calls = [];
  const result = await verifyHCaptchaToken(undefined, {
    env: { HCAPTCHA_SECRET: 'secret' },
    fetchImpl: fakeFetch({ calls }),
    logger: silent,
  });
  assert.deepEqual(result, { ok: false, reason: 'missing-token' });
  assert.equal(calls.length, 0);
});

test('a valid token is verified against siteverify with secret, response, sitekey and remoteip', async () => {
  const calls = [];
  const result = await verifyHCaptchaToken('tok-123', {
    env: { HCAPTCHA_SECRET: 'secret-abc', NEXT_PUBLIC_HCAPTCHA_SITE_KEY: 'site-xyz' },
    remoteIp: '203.0.113.9',
    fetchImpl: fakeFetch({ calls }),
    logger: silent,
  });
  assert.deepEqual(result, { ok: true, reason: 'verified' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, HCAPTCHA_VERIFY_URL);
  assert.equal(calls[0].init.method, 'POST');
  const params = new URLSearchParams(calls[0].init.body);
  assert.equal(params.get('secret'), 'secret-abc');
  assert.equal(params.get('response'), 'tok-123');
  assert.equal(params.get('sitekey'), 'site-xyz');
  assert.equal(params.get('remoteip'), '203.0.113.9');
});

test('an explicit rejection from hCaptcha refuses the submission and surfaces the error codes', async () => {
  const result = await verifyHCaptchaToken('tok-bad', {
    env: { HCAPTCHA_SECRET: 'secret' },
    fetchImpl: fakeFetch({ body: { success: false, 'error-codes': ['invalid-input-response'] } }),
    logger: silent,
  });
  assert.deepEqual(result, { ok: false, reason: 'rejected', codes: ['invalid-input-response'] });
});

test('a bad server secret is logged loudly but still refuses (the widget must not become decorative)', async () => {
  const logged = [];
  const result = await verifyHCaptchaToken('tok', {
    env: { HCAPTCHA_SECRET: 'wrong' },
    fetchImpl: fakeFetch({ body: { success: false, 'error-codes': ['invalid-input-secret'] } }),
    logger: { error: (message) => logged.push(message) },
  });
  assert.equal(result.ok, false);
  assert.ok(logged.some((message) => /HCAPTCHA_SECRET/.test(message)));
});

test('a network failure or 5xx from hCaptcha fails open so an outage does not drop leads', async () => {
  const down = await verifyHCaptchaToken('tok', {
    env: { HCAPTCHA_SECRET: 'secret' },
    fetchImpl: fakeFetch({ throws: new Error('ECONNRESET') }),
    logger: silent,
  });
  assert.deepEqual(down, { ok: true, reason: 'unavailable' });

  const fiveHundred = await verifyHCaptchaToken('tok', {
    env: { HCAPTCHA_SECRET: 'secret' },
    fetchImpl: fakeFetch({ status: 503, body: {} }),
    logger: silent,
  });
  assert.deepEqual(fiveHundred, { ok: true, reason: 'unavailable' });
});

// Source contracts: the route verifies before anything that costs money or
// writes to the CRM, and the form sends the token under the shared field name.
test('the contact route verifies hCaptcha after validation and before webhook/CRM/email', async () => {
  const route = await readFile('app/api/contact/route.js', 'utf8');
  const verifyAt = route.indexOf('verifyHCaptchaToken(');
  assert.ok(verifyAt > route.indexOf('!validation.valid'), 'verify runs after field validation');
  assert.ok(verifyAt < route.indexOf('CONTACT_WEBHOOK_URL'), 'verify runs before the webhook');
  assert.ok(verifyAt < route.indexOf('createLeadBestEffort(validation.data)'), 'verify runs before the CRM write');
  // The route reads the token under the shared constant, never a re-typed string.
  assert.match(route, /body\?\.\[HCAPTCHA_TOKEN_FIELD\]/);
  assert.equal(HCAPTCHA_TOKEN_FIELD, 'hcaptchaToken');
  // A failed check answers 400 (not 401/403/5xx) so the form treats it as a field error.
  assert.match(route, /captcha[\s\S]*?\}, 400\)/);
});

test('the contact form renders the widget, requires a token client-side, and sends it under the shared field name', async () => {
  const form = await readFile('components/marketing/ContactForm.jsx', 'utf8');
  assert.match(form, /import HCaptcha from '\.\/HCaptcha'/);
  assert.match(form, /<HCaptcha/);
  assert.match(form, /if \(!captchaToken\)/);
  // Loader failure (ad blockers, proxies) must degrade to the direct-email path,
  // never to a form that waits forever for a token.
  assert.match(form, /onUnavailable=/);
  assert.match(form, /captchaUnavailable/);
  assert.match(form, /mailto:\$\{SITE\.email\}/);
  assert.match(form, /\[HCAPTCHA_TOKEN_FIELD\]: captchaToken/);
  // The honeypot and every existing field are still there.
  assert.match(form, /name="website"/);
  for (const field of ['name', 'email', 'company', 'budget', 'brief']) {
    assert.match(form, new RegExp(`name="${field}"`));
  }
});

test('the secret never appears in the hCaptcha source files, and the widget never sees the server env var', async () => {
  const files = [
    'lib/hcaptcha.mjs',
    'components/marketing/HCaptcha.jsx',
    'components/marketing/ContactForm.jsx',
    'app/api/contact/route.js',
    'next.config.js',
  ];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /ES_[0-9a-f]{32}/, `${file} must not contain an hCaptcha secret literal`);
  }
  assert.doesNotMatch(await readFile('components/marketing/HCaptcha.jsx', 'utf8'), /HCAPTCHA_SECRET/);
});
