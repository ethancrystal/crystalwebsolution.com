// @vitest-environment node
//
// What each emailed-link call site does when the app URL cannot be trusted
// (lib/appUrl.mjs, plan item F10). The unit tests for getAppUrl() live in
// tests/appUrl.test.mjs and the source-shape contracts next to them; this runs
// the real actions and routes against fakes to prove the behaviour: a bad
// NEXT_PUBLIC_APP_URL in production means nothing is written and no email
// carrying a token goes out, and a good one builds links on that origin.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const generateLink = vi.fn();
const sendTemplate = vi.fn();
const rpcNames = [];
const adminRpc = vi.fn();
const userRpc = vi.fn();

const outbox = {
  select: () => outbox, eq: () => outbox, lt: () => outbox, gte: () => outbox, order: () => outbox, limit: () => outbox,
  then: (resolve) => resolve({ data: [], count: 0, error: null }),
};

vi.mock('@sentry/nextjs', () => ({ captureMessage: vi.fn() }));
vi.mock('next/headers', () => ({ headers: async () => new Headers() }));
vi.mock('next/navigation', () => ({
  redirect: (location) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { digest: `NEXT_REDIRECT;replace;${location};307;` });
  },
}));
vi.mock('@/lib/auth/require-role', () => ({ requireRole: async () => ({}) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ rpc: (...args) => userRpc(...args) }) }));
vi.mock('@/lib/rateLimit.mjs', () => ({
  checkAuthRateLimit: async () => true,
  checkRateLimitStrict: async () => ({ status: 'allowed' }),
  getClientIp: () => '203.0.113.10',
}));
vi.mock('@/lib/hcaptcha.mjs', () => ({
  HCAPTCHA_TOKEN_FIELD: 'hcaptchaToken',
  verifyHCaptchaToken: async () => ({ status: 'passed' }),
}));
vi.mock('@/lib/email/resend', () => ({
  sendTemplate: (...args) => sendTemplate(...args),
  isEmailConfigured: () => true,
  getOperationsAddress: () => 'ops@example.test',
  EmailError: class extends Error {},
}));
// The real buildVerifyUrl, with a fake service-role client in place of Supabase.
vi.mock('@/lib/supabase/admin', async (importOriginal) => ({
  ...(await importOriginal()),
  createAdminClient: () => ({
    auth: { admin: { generateLink: (...args) => generateLink(...args), deleteUser: async () => ({}) } },
    rpc: async (name, args) => {
      rpcNames.push(name);
      return adminRpc(name, args);
    },
    from: () => outbox,
    storage: { from: () => ({ remove: async () => ({ data: [], error: null }) }) },
  }),
}));

const { signUp, resendConfirmationEmail, requestPasswordReset } = await import('@/app/auth/actions.js');
const { inviteUser } = await import('@/app/admin/users/actions.js');
const { POST: contactPost } = await import('@/app/api/contact/route.js');
const { POST: drainPost } = await import('@/app/api/cron/crm-notifications/route.js');
const { CONTACT_BUDGETS } = await import('@/lib/contactForm.mjs');

const LIVE = 'https://app.cdsportswearinc.com';

function productionEnv(appUrl) {
  vi.stubEnv('VERCEL_ENV', 'production');
  vi.stubEnv('NODE_ENV', 'production');
  if (appUrl === undefined) vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  else vi.stubEnv('NEXT_PUBLIC_APP_URL', appUrl);
}

const form = (fields) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const signupForm = () => form({ email: 'jane@example.test', password: 'a-long-password', fullName: 'Jane Client', accountType: 'client' });
const emailOnly = () => form({ email: 'jane@example.test' });
const inviteForm = () => form({ email: 'pm@example.test', fullName: 'Pat Manager', role: 'project_manager' });

const BAD_CONFIGS = [
  ['unset', undefined],
  ['not a URL', 'undefined'],
  ['a retired domain', 'https://crystalwebsolution.com'],
  ['a subdomain of a retired domain', 'https://app.cdsportswearusa.com'],
  ['http', 'http://app.cdsportswearinc.com'],
];

beforeEach(() => {
  generateLink.mockReset();
  sendTemplate.mockReset();
  adminRpc.mockReset();
  userRpc.mockReset();
  rpcNames.length = 0;
  generateLink.mockResolvedValue({
    data: {
      user: { id: 'user-1', user_metadata: { full_name: 'Jane Client' } },
      properties: { hashed_token: 'hashed-token-value', verification_type: 'signup' },
    },
    error: null,
  });
  sendTemplate.mockResolvedValue({});
  adminRpc.mockResolvedValue({ data: null, error: null });
  userRpc.mockResolvedValue({ data: null, error: null });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function expectNothingWritten() {
  expect(generateLink).not.toHaveBeenCalled();
  expect(sendTemplate).not.toHaveBeenCalled();
  expect(userRpc).not.toHaveBeenCalled();
}

function expectConfigLogged() {
  const logged = console.error.mock.calls.flat().map(String).join(' ');
  expect(logged).toMatch(/NEXT_PUBLIC_APP_URL/);
}

describe.each(BAD_CONFIGS)('with NEXT_PUBLIC_APP_URL %s in production', (_label, value) => {
  beforeEach(() => productionEnv(value));

  it('signUp fails with its generic message before creating the account', async () => {
    const result = await signUp(signupForm());
    expect(result).toEqual({ error: 'Signup is temporarily unavailable. Please try again later.' });
    expectNothingWritten();
    expectConfigLogged();
  });

  it('resendConfirmationEmail reports its usual generic success without issuing a token', async () => {
    expect(await resendConfirmationEmail(emailOnly())).toEqual({ success: true });
    expectNothingWritten();
    expectConfigLogged();
  });

  it('requestPasswordReset reports its usual generic success without issuing a token', async () => {
    expect(await requestPasswordReset(emailOnly())).toEqual({ success: true });
    expectNothingWritten();
    expectConfigLogged();
  });

  it('inviteUser fails with its generic message before creating the user or assigning a role', async () => {
    const result = await inviteUser(inviteForm());
    expect(result).toEqual({ error: 'Invites are temporarily unavailable. Please try again later.' });
    expectNothingWritten();
    expectConfigLogged();
  });

  it('the notification drain answers 503 and touches no outbox row', async () => {
    vi.stubEnv('CRM_CRON_SECRET', 'cron-secret');
    const response = await drainPost(new Request('https://www.example.test/api/cron/crm-notifications', {
      method: 'POST',
      headers: { 'x-cron-secret': 'cron-secret' },
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ ok: false, error: 'Application URL is not configured.' });
    expect(rpcNames).not.toContain('claim_notification_email_batch');
    expect(rpcNames).not.toContain('mark_notification_email_failed');
    expect(rpcNames).not.toContain('mark_notification_email_sent');
    expectConfigLogged();
  });

  it('the contact form still delivers, just without the CRM link', async () => {
    adminRpc.mockResolvedValue({ data: { deal_id: 'deal-1' }, error: null });
    const response = await contactPost(contactRequest());

    expect(response.status).toBe(202);
    expect(sendTemplate).toHaveBeenCalled();
    const [{ html }] = sendTemplate.mock.calls[0];
    expect(html).not.toContain('/admin/deals/');
    expect(html).not.toContain('undefined');
    expectConfigLogged();
  });
});

describe('with the live portal origin in production', () => {
  beforeEach(() => productionEnv(LIVE));

  it('signUp links the confirmation email to the app host', async () => {
    await expect(signUp(signupForm())).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    expect(generateLink.mock.calls[0][0].options.redirectTo).toBe(`${LIVE}/auth/callback?next=/dashboard`);
    const [{ html }] = sendTemplate.mock.calls[0];
    expect(html).toContain(`${LIVE}/auth/verify?token_hash=hashed-token-value`);
    expect(html).not.toContain('crystalwebsolution.com');
  });

  it('resendConfirmationEmail and requestPasswordReset build their links on the app host', async () => {
    expect(await resendConfirmationEmail(emailOnly())).toEqual({ success: true });
    expect(sendTemplate.mock.calls[0][0].html).toContain(`${LIVE}/auth/verify?token_hash=hashed-token-value`);

    sendTemplate.mockClear();
    expect(await requestPasswordReset(emailOnly())).toEqual({ success: true });
    expect(sendTemplate.mock.calls[0][0].html).toContain(`${LIVE}/auth/verify?token_hash=hashed-token-value`);
  });

  it('inviteUser links the invite to the set-password page on the app host', async () => {
    await expect(inviteUser(inviteForm())).rejects.toMatchObject({ message: 'NEXT_REDIRECT' });

    expect(userRpc).toHaveBeenCalledWith('admin_set_user_role', { p_user_id: 'user-1', p_role: 'project_manager' });
    expect(generateLink.mock.calls[0][0].options.redirectTo).toBe(
      `${LIVE}/auth/callback?next=${encodeURIComponent('/auth/reset-password?reason=invite')}`,
    );
    expect(sendTemplate.mock.calls[0][0].html).toContain(`${LIVE}/auth/verify?token_hash=hashed-token-value`);
  });

  it('the notification drain claims rows once the URL is good', async () => {
    vi.stubEnv('CRM_CRON_SECRET', 'cron-secret');
    adminRpc.mockImplementation(async (name) => ({ data: name === 'claim_attachment_cleanup' ? [] : [], error: null }));
    const response = await drainPost(new Request('https://www.example.test/api/cron/crm-notifications', {
      method: 'POST',
      headers: { 'x-cron-secret': 'cron-secret' },
    }));

    expect(response.status).toBe(200);
    expect(rpcNames).toContain('claim_notification_email_batch');
  });

  it('the contact form links the operations email to the CRM deal on the app host', async () => {
    adminRpc.mockResolvedValue({ data: { deal_id: 'deal-1' }, error: null });
    const response = await contactPost(contactRequest());

    expect(response.status).toBe(202);
    expect(sendTemplate.mock.calls[0][0].html).toContain(`${LIVE}/admin/deals/deal-1`);
  });
});

describe('outside production with nothing configured', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  });

  it('links fall back to localhost so local development keeps working', async () => {
    expect(await requestPasswordReset(emailOnly())).toEqual({ success: true });
    expect(sendTemplate.mock.calls[0][0].html).toContain('http://localhost:3000/auth/verify?token_hash=hashed-token-value');
  });
});

function contactRequest() {
  return new Request('https://www.example.test/api/contact', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Jane Client',
      email: 'jane@example.test',
      company: 'Acme',
      budget: CONTACT_BUDGETS[0],
      brief: 'We need a new website for our shop.',
      website: '',
      hcaptchaToken: 'token-from-widget',
    }),
  });
}
