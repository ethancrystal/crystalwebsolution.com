// Contact-form protection fails closed in production (lib/rateLimit.mjs
// checkRateLimitStrict), and the client IP comes only from a trusted source
// (getClientIp). The route-level proof that nothing is sent or stored when a
// check is unavailable is in tests/contact-route-fail-closed.test.jsx.

import test from 'node:test';
import assert from 'node:assert/strict';

import { checkRateLimitStrict, getClientIp, isProductionDeployment } from '../lib/rateLimit.mjs';

const silent = { error() {} };
const PROD = { VERCEL_ENV: 'production', VERCEL: '1' };
const PROD_REDIS = { ...PROD, UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 't' };

test('production means the Vercel Production environment only', () => {
  assert.equal(isProductionDeployment({ VERCEL_ENV: 'production' }), true);
  assert.equal(isProductionDeployment({ VERCEL_ENV: 'preview' }), false);
  assert.equal(isProductionDeployment({ NODE_ENV: 'production' }), false);
});

test('on Vercel, spoofed forwarding headers are ignored in favour of the platform IP', () => {
  const headers = new Headers({
    'x-forwarded-for': '6.6.6.6',
    'x-real-ip': '203.0.113.10',
    'x-vercel-forwarded-for': '203.0.113.10',
  });
  assert.equal(getClientIp(headers, { VERCEL: '1' }), '203.0.113.10');

  // x-vercel-forwarded-for is the fallback; x-forwarded-for never is.
  assert.equal(getClientIp(new Headers({ 'x-vercel-forwarded-for': '203.0.113.11, 10.0.0.1' }), { VERCEL: '1' }), '203.0.113.11');
  assert.equal(getClientIp(new Headers({ 'x-forwarded-for': '6.6.6.6' }), { VERCEL: '1' }), null);
});

test('off Vercel, x-forwarded-for counts only under a declared trusted-proxy contract', () => {
  const spoofed = new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.20', 'x-real-ip': '6.6.6.6' });
  // No contract: nothing is trusted.
  assert.equal(getClientIp(spoofed, {}), null);
  // One trusted proxy: the entry it appended (rightmost) is the client.
  assert.equal(getClientIp(spoofed, { TRUSTED_PROXY_HOPS: '1' }), '203.0.113.20');
  // Two trusted proxies: second from the right.
  assert.equal(getClientIp(new Headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.21, 10.0.0.2' }), { TRUSTED_PROXY_HOPS: '2' }), '203.0.113.21');
  // A chain shorter than the declared hops is not guessed at.
  assert.equal(getClientIp(new Headers({ 'x-forwarded-for': '203.0.113.22' }), { TRUSTED_PROXY_HOPS: '2' }), null);
  // Nonsense or out-of-range values are ignored.
  for (const hops of ['0', '-1', '9', 'abc']) {
    assert.equal(getClientIp(spoofed, { TRUSTED_PROXY_HOPS: hops }), null, hops);
  }
});

test('missing Upstash configuration: unavailable in production, allowed elsewhere', async () => {
  assert.deepEqual(
    await checkRateLimitStrict('contact', '203.0.113.10', { env: PROD, logger: silent }),
    { status: 'unavailable', reason: 'not-configured' },
  );
  assert.deepEqual(
    await checkRateLimitStrict('contact', '203.0.113.10', { env: { VERCEL_ENV: 'preview' }, logger: silent }),
    { status: 'allowed', reason: 'not-configured' },
  );
});

test('a rate-limit backend failure is unavailable, never an allow', async () => {
  const result = await checkRateLimitStrict('contact', '203.0.113.10', {
    env: PROD_REDIS,
    limitImpl: async () => { throw new Error('ECONNRESET'); },
    logger: silent,
  });
  assert.deepEqual(result, { status: 'unavailable', reason: 'backend-error' });
});

test('no trusted client IP in production is unavailable rather than unthrottled', async () => {
  let called = false;
  const result = await checkRateLimitStrict('contact', null, {
    env: PROD_REDIS,
    limitImpl: async () => { called = true; return { success: true }; },
    logger: silent,
  });
  assert.deepEqual(result, { status: 'unavailable', reason: 'no-client-ip' });
  assert.equal(called, false);
});

test('within and over the limit', async () => {
  const seen = [];
  const limitImpl = async (name, identifier, limit, windowSeconds) => {
    seen.push({ name, identifier, limit, windowSeconds });
    return { success: seen.length === 1 };
  };
  const options = { env: PROD_REDIS, limitImpl, limit: 5, windowSeconds: 600, logger: silent };
  assert.equal((await checkRateLimitStrict('contact', '203.0.113.10', options)).status, 'allowed');
  assert.equal((await checkRateLimitStrict('contact', '203.0.113.10', options)).status, 'limited');
  assert.deepEqual(seen[0], { name: 'contact', identifier: '203.0.113.10', limit: 5, windowSeconds: 600 });
});
