// @vitest-environment node
//
// Runs the real /api/contact route with the real rate limiter and hCaptcha
// modules. Only the edges are mocked: Upstash (@upstash/ratelimit and
// @upstash/redis), the network (global fetch: hCaptcha and the webhook), the
// Supabase admin client (the CRM write) and email sending. In every "cannot
// verify" case the route must answer 503 with Retry-After and must not call
// the webhook, write a lead, or send the operations or acknowledgement email.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const limiter = { impl: async () => ({ success: true }), calls: [] };
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    async limit(identifier) {
      limiter.calls.push(identifier);
      return limiter.impl(identifier);
    }
  },
}));
vi.mock('@upstash/redis', () => ({ Redis: class {} }));

const sendTemplate = vi.fn();
vi.mock('@/lib/email/resend', () => ({
  sendTemplate: (...args) => sendTemplate(...args),
  isEmailConfigured: () => true,
  getOperationsAddress: () => 'ops@example.test',
}));

const rpc = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({ rpc: (...args) => rpc(...args) }) }));

const HCAPTCHA_URL = 'https://api.hcaptcha.com/siteverify';
const WEBHOOK_URL = 'https://hooks.example.test/contact';
const ENV_KEYS = [
  'VERCEL', 'VERCEL_ENV', 'TRUSTED_PROXY_HOPS', 'HCAPTCHA_SECRET',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN', 'CONTACT_WEBHOOK_URL',
  'CONTACT_WEBHOOK_TIMEOUT_MS',
];
const PROD = {
  VERCEL: '1',
  VERCEL_ENV: 'production',
  HCAPTCHA_SECRET: 'secret',
  UPSTASH_REDIS_REST_URL: 'https://redis.example.test',
  UPSTASH_REDIS_REST_TOKEN: 'token',
  CONTACT_WEBHOOK_URL: WEBHOOK_URL,
};

let fetchCalls;
let hcaptchaImpl;
let webhookImpl;

function setEnv(values) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

async function post({ env = PROD, headers = { 'x-real-ip': '203.0.113.10' }, body } = {}) {
  setEnv(env);
  vi.resetModules();
  const { POST } = await import('@/app/api/contact/route.js');
  return POST(new Request('https://www.example.test/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body ?? {
      name: 'Jane Client',
      email: 'jane@example.test',
      company: 'Acme',
      budget: (await import('@/lib/contactForm.mjs')).CONTACT_BUDGETS[0],
      brief: 'We need a new website for our shop.',
      website: '',
      hcaptchaToken: 'token-from-widget',
    }),
  }));
}

function expectNothingSentOrStored() {
  expect(fetchCalls.filter((url) => url === WEBHOOK_URL)).toEqual([]);
  expect(rpc).not.toHaveBeenCalled();
  expect(sendTemplate).not.toHaveBeenCalled();
}

async function expectTemporarilyUnavailable(response) {
  expect(response.status).toBe(503);
  expect(response.headers.get('retry-after')).toBe('120');
  const json = await response.json();
  expect(json).toMatchObject({ ok: false, retryable: true });
  expect(json.message).toMatch(/temporarily unavailable/);
  expectNothingSentOrStored();
}

beforeEach(() => {
  fetchCalls = [];
  limiter.calls = [];
  limiter.impl = async () => ({ success: true });
  hcaptchaImpl = async () => ({ ok: true, status: 200, json: async () => ({ success: true }) });
  rpc.mockResolvedValue({ data: { deal_id: 'd1' }, error: null });
  sendTemplate.mockResolvedValue({ id: 'e1' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  webhookImpl = async () => ({ ok: true, status: 200, json: async () => ({}) });
  vi.stubGlobal('fetch', vi.fn((url, init) => {
    fetchCalls.push(String(url));
    if (String(url) === HCAPTCHA_URL) return hcaptchaImpl();
    return webhookImpl(init);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rpc.mockReset();
  sendTemplate.mockReset();
  setEnv({});
});

// Each test re-imports the route (fresh env per test); the first import
// compiles next/server and can take several seconds on a cold run.
describe('POST /api/contact fails closed', { timeout: 30_000 }, () => {
  it('delivers a verified, allowed submission (proves the mocks are wired)', async () => {
    const response = await post();
    expect(response.status).toBe(202);
    expect(fetchCalls).toEqual([HCAPTCHA_URL, WEBHOOK_URL]);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledTimes(2);
    expect(limiter.calls).toEqual(['203.0.113.10']);
  });

  it('refuses in production when the rate limiter is not configured', async () => {
    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, ...env } = PROD;
    await expectTemporarilyUnavailable(await post({ env }));
    expect(fetchCalls).toEqual([]);
  });

  it('refuses in production when HCAPTCHA_SECRET is not configured', async () => {
    const { HCAPTCHA_SECRET, ...env } = PROD;
    await expectTemporarilyUnavailable(await post({ env }));
    expect(fetchCalls).toEqual([]);
  });

  it('refuses when hCaptcha cannot be reached', async () => {
    hcaptchaImpl = async () => { throw new Error('ECONNRESET'); };
    await expectTemporarilyUnavailable(await post());
    expect(fetchCalls).toEqual([HCAPTCHA_URL]);
  });

  it('refuses when hCaptcha answers 5xx', async () => {
    hcaptchaImpl = async () => ({ ok: false, status: 502, json: async () => ({}) });
    await expectTemporarilyUnavailable(await post());
  });

  it('refuses when the rate-limit backend fails', async () => {
    limiter.impl = async () => { throw new Error('Upstash timeout'); };
    await expectTemporarilyUnavailable(await post());
    expect(fetchCalls).toEqual([]);
  });

  it('rate-limits by the platform IP, not a spoofed x-forwarded-for', async () => {
    const response = await post({ headers: { 'x-forwarded-for': '6.6.6.6', 'x-real-ip': '203.0.113.10' } });
    expect(response.status).toBe(202);
    expect(limiter.calls).toEqual(['203.0.113.10']);
    const verify = new URLSearchParams(
      globalThis.fetch.mock.calls.find(([url]) => url === HCAPTCHA_URL)[1].body,
    );
    expect(verify.get('remoteip')).toBe('203.0.113.10');
  });

  it('refuses in production when only a spoofable forwarding header is present', async () => {
    await expectTemporarilyUnavailable(await post({ headers: { 'x-forwarded-for': '6.6.6.6' } }));
    expect(limiter.calls).toEqual([]);
  });

  it('answers 429 when over the limit, with nothing sent', async () => {
    limiter.impl = async () => ({ success: false });
    const response = await post();
    expect(response.status).toBe(429);
    expectNothingSentOrStored();
  });

  it('answers 400 (a field error, not 503) when hCaptcha rejects the token', async () => {
    hcaptchaImpl = async () => ({ ok: true, status: 200, json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }) });
    const response = await post();
    expect(response.status).toBe(400);
    expect((await response.json()).errors).toHaveProperty('hcaptcha');
    expectNothingSentOrStored();
  });

  it('a webhook that never answers is abandoned after the timeout; email still delivers', async () => {
    let signal;
    webhookImpl = (init) => { signal = init.signal; return new Promise(() => {}); };
    // Warm the module graph so the timing below measures the request only.
    await post({ env: { ...PROD, CONTACT_WEBHOOK_TIMEOUT_MS: '500' } });
    fetchCalls = [];
    sendTemplate.mockClear();
    rpc.mockClear();

    const started = Date.now();
    const response = await post({ env: { ...PROD, CONTACT_WEBHOOK_TIMEOUT_MS: '500' } });
    const elapsed = Date.now() - started;

    expect(response.status).toBe(202);
    expect(elapsed).toBeLessThan(2500);
    expect(signal.aborted).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledTimes(2);
  });

  it('a webhook transport failure falls through to the CRM write and email', async () => {
    webhookImpl = async () => { throw new TypeError('fetch failed'); };
    const response = await post();
    expect(response.status).toBe(202);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(sendTemplate).toHaveBeenCalledTimes(2);
  });

  it('a hung webhook with email down fails fast as 502, not a hang', async () => {
    webhookImpl = () => new Promise(() => {});
    sendTemplate.mockRejectedValue(new Error('Resend down'));
    const started = Date.now();
    const response = await post({ env: { ...PROD, CONTACT_WEBHOOK_TIMEOUT_MS: '500' } });
    expect(response.status).toBe(502);
    expect(Date.now() - started).toBeLessThan(8000);
  });

  it('still works in local development without either service configured', async () => {
    const response = await post({ env: { CONTACT_WEBHOOK_URL: WEBHOOK_URL }, headers: {} });
    expect(response.status).toBe(202);
    expect(fetchCalls).toEqual([WEBHOOK_URL]);
  });
});
