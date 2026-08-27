import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  buildAuthRateLimitKeys,
  normalizeRateLimitEmail,
} from '../../lib/rateLimit.mjs';

test('normalizes auth rate-limit email identifiers without changing submitted values', () => {
  assert.equal(normalizeRateLimitEmail('  Client@Example.COM '), 'client@example.com');
  assert.equal(normalizeRateLimitEmail(''), null);
  assert.equal(normalizeRateLimitEmail(null), null);
});

test('builds independent IP and normalized-email buckets for each auth action', () => {
  const headers = new Headers({
    'x-forwarded-for': '203.0.113.10, 198.51.100.4',
  });

  assert.deepEqual(
    buildAuthRateLimitKeys('auth:signup', ' Client@Example.COM ', headers),
    {
      ip: { name: 'auth:signup:ip', identifier: '203.0.113.10' },
      email: { name: 'auth:signup:email', identifier: 'client@example.com' },
    },
  );
});

test('allows auth requests when shared rate limiting is not configured', async () => {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const { checkAuthRateLimit } = await import('../../lib/rateLimit.mjs?unconfigured-test');

  assert.equal(
    await checkAuthRateLimit('auth:signup', 'client@example.com', new Headers()),
    true,
  );
});

test('all unauthenticated email-sending auth actions use the composite limiter before side effects', async () => {
  const source = await readFile('app/auth/actions.js', 'utf8');

  for (const action of ['signUp', 'resendConfirmationEmail', 'requestPasswordReset']) {
    const actionStart = source.indexOf(`export async function ${action}`);
    assert.ok(actionStart >= 0, `${action} must exist`);
    const nextAction = source.indexOf('\nexport async function ', actionStart + 1);
    const body = source.slice(actionStart, nextAction < 0 ? source.length : nextAction);

    assert.match(body, /checkAuthRateLimit\(/, `${action} must use the composite auth limiter`);
    const rateLimitIndex = body.indexOf('checkAuthRateLimit(');
    const sideEffectIndex = body.indexOf('generateLink(');
    assert.ok(sideEffectIndex < 0 || rateLimitIndex < sideEffectIndex, `${action} checks rate limits after generateLink`);
  }
});
