// @vitest-environment node
//
// POST /api/contact with the production-request payload (kind: 'production').
// Same harness as contact-route-fail-closed.test.jsx: the real route, rate
// limiter and hCaptcha modules, with only the edges mocked (Upstash, the
// network, the Supabase admin client, email). The point is that the new payload
// shape rides the existing contract: same guards, same CRM RPC, same emails.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow() { return {}; }
    async limit() { return { success: true }; }
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

const productionBody = (overrides = {}) => ({
  kind: 'production',
  name: 'Jordan Reyes',
  email: 'jordan@example.test',
  category: 'Custom patches',
  size: '3.5 in wide',
  quantity: '250',
  artworkLink: 'https://drive.example.test/file/abc',
  notes: 'Merrowed border.',
  website: '',
  hcaptchaToken: 'token-from-widget',
  ...overrides,
});

let fetchCalls;
let webhookBodies;
let hcaptchaImpl;

function setEnv(values) {
  for (const key of ENV_KEYS) delete process.env[key];
  Object.assign(process.env, values);
}

async function post({ env = PROD, body = productionBody() } = {}) {
  setEnv(env);
  vi.resetModules();
  const { POST } = await import('@/app/api/contact/route.js');
  return POST(new Request('https://www.example.test/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': '203.0.113.10' },
    body: JSON.stringify(body),
  }));
}

function expectNothingSentOrStored() {
  expect(fetchCalls.filter((url) => url === WEBHOOK_URL)).toEqual([]);
  expect(rpc).not.toHaveBeenCalled();
  expect(sendTemplate).not.toHaveBeenCalled();
}

beforeEach(() => {
  fetchCalls = [];
  webhookBodies = [];
  hcaptchaImpl = async () => ({ ok: true, status: 200, json: async () => ({ success: true }) });
  rpc.mockResolvedValue({ data: { deal_id: 'd1' }, error: null });
  sendTemplate.mockResolvedValue({ id: 'e1' });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.stubGlobal('fetch', vi.fn(async (url, init) => {
    fetchCalls.push(String(url));
    if (String(url) === HCAPTCHA_URL) return hcaptchaImpl();
    webhookBodies.push(JSON.parse(init.body));
    return { ok: true, status: 200, json: async () => ({}) };
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  rpc.mockReset();
  sendTemplate.mockReset();
  setEnv({});
});

describe('POST /api/contact with a production request', { timeout: 30_000 }, () => {
  it('delivers it through the same guards, CRM RPC, webhook and emails as a brief', async () => {
    const response = await post();

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json.ok).toBe(true);
    expect(json.message).toMatch(/production request was sent/);
    expect(fetchCalls).toEqual([HCAPTCHA_URL, WEBHOOK_URL]);

    // The lead is written through create_lead_from_contact with no new
    // parameters: the composed brief carries the structure, budget is empty.
    expect(rpc).toHaveBeenCalledTimes(1);
    const [fn, args] = rpc.mock.calls[0];
    expect(fn).toBe('create_lead_from_contact');
    expect(Object.keys(args).sort()).toEqual(
      ['p_brief', 'p_budget', 'p_company', 'p_email', 'p_name', 'p_source'],
    );
    expect(args).toMatchObject({
      p_name: 'Jordan Reyes',
      p_email: 'jordan@example.test',
      p_company: null,
      p_budget: null,
      p_source: 'website_production_request',
    });
    expect(args.p_brief).toContain('Production request: Custom patches');
    expect(args.p_brief).toContain('Size: 3.5 in wide');
    expect(args.p_brief).toContain('Quantity: 250');
    expect(args.p_brief).toContain('Artwork: https://drive.example.test/file/abc');
    expect(args.p_brief).toContain('Notes:\nMerrowed border.');

    // The webhook still gets a `brief` (consumers keyed on it are not blank)
    // plus the structured keys, and never the captcha token.
    expect(webhookBodies).toHaveLength(1);
    expect(webhookBodies[0]).toMatchObject({
      kind: 'production',
      name: 'Jordan Reyes',
      category: 'Custom patches',
      size: '3.5 in wide',
      quantity: '250',
      budget: '',
    });
    expect(webhookBodies[0].brief).toContain('Production request: Custom patches');
    expect(JSON.stringify(webhookBodies[0])).not.toContain('token-from-widget');

    expect(sendTemplate).toHaveBeenCalledTimes(2);
    const [ops, opsOptions] = sendTemplate.mock.calls[0];
    expect(ops.subject).toBe('New production request — Jordan Reyes');
    expect(opsOptions).toMatchObject({ to: 'ops@example.test', replyTo: 'jordan@example.test' });
    const [ack, ackOptions] = sendTemplate.mock.calls[1];
    expect(ack.subject).toMatch(/production request/);
    expect(ackOptions.to).toBe('jordan@example.test');
  });

  it('ignores a budget or company a client tries to attach', async () => {
    const response = await post({ body: productionBody({ budget: '$50k+', company: 'Injected Inc' }) });

    expect(response.status).toBe(202);
    expect(rpc.mock.calls[0][1]).toMatchObject({ p_budget: null, p_company: null });
  });

  it('still sends a web brief exactly as before', async () => {
    const response = await post({
      body: {
        name: 'Jane Client',
        email: 'jane@example.test',
        company: 'Acme',
        budget: '$15–50k',
        brief: 'We need a new website for our shop.',
        website: '',
        hcaptchaToken: 'token-from-widget',
      },
    });

    expect(response.status).toBe(202);
    expect((await response.json()).message).toMatch(/project brief was sent/);
    expect(rpc.mock.calls[0][1]).toMatchObject({
      p_budget: '$15–50k',
      p_company: 'Acme',
      p_source: 'website_contact_form',
    });
    expect(sendTemplate.mock.calls[0][0].subject).toBe('New project brief — Jane Client');
    expect(webhookBodies[0]).not.toHaveProperty('kind');
  });

  it('answers 400 with field errors for an unknown category, and sends nothing', async () => {
    const response = await post({ body: productionBody({ category: 'Custom hats' }) });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.errors).toHaveProperty('category');
    expect(fetchCalls).toEqual([]);
    expectNothingSentOrStored();
  });

  it('answers 400 for missing size and quantity', async () => {
    const response = await post({ body: productionBody({ size: '', quantity: '' }) });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(Object.keys(json.errors).sort()).toEqual(['quantity', 'size']);
    expectNothingSentOrStored();
  });

  it('rejects a hostile artwork link without storing it', async () => {
    const response = await post({ body: productionBody({ artworkLink: 'javascript:alert(1)' }) });

    expect(response.status).toBe(400);
    expect((await response.json()).errors).toHaveProperty('artworkLink');
    expectNothingSentOrStored();
  });

  it('rejects a filled honeypot before anything is verified, stored or sent', async () => {
    const response = await post({ body: productionBody({ website: 'https://bot.example' }) });

    expect(response.status).toBe(400);
    expect(fetchCalls).toEqual([]);
    expectNothingSentOrStored();
  });

  it('still requires a passing hCaptcha token', async () => {
    hcaptchaImpl = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
    });
    const response = await post();

    expect(response.status).toBe(400);
    expect((await response.json()).errors).toHaveProperty('hcaptcha');
    expectNothingSentOrStored();
  });

  it('still fails closed in production when the rate limiter is not configured', async () => {
    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN, ...env } = PROD;
    const response = await post({ env });

    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('120');
    expect(fetchCalls).toEqual([]);
    expectNothingSentOrStored();
  });
});
