// hCaptcha for the public contact form (app/api/contact + ContactForm).
//
// Two halves, two env vars:
//
//   NEXT_PUBLIC_HCAPTCHA_SITE_KEY  browser widget. Public by design (it is in
//                                  the page source either way), so the
//                                  production key doubles as the default and
//                                  the env var exists to point previews at a
//                                  different hCaptcha site if wanted.
//   HCAPTCHA_SECRET                server-side verification. Never in the repo;
//                                  set in Vercel (Production + Preview) and
//                                  .env.local. Verification is enforced only
//                                  when this is set -- same fail-open-when-
//                                  unconfigured contract as lib/rateLimit.mjs,
//                                  so a fresh checkout without the secret still
//                                  accepts submissions and logs a warning.
//
// Failure policy: an explicit "no, that token is bad" from hCaptcha rejects
// the submission. A network/5xx failure reaching hCaptcha lets the brief
// through and logs, because the form is the lead intake and the honeypot +
// rate limiter still stand; a vendor outage should not cost real enquiries.

export const HCAPTCHA_DEFAULT_SITE_KEY = '71b42ada-737a-471e-af00-69e6d9e28ff4';
export const HCAPTCHA_SCRIPT_URL = 'https://js.hcaptcha.com/1/api.js?render=explicit';
export const HCAPTCHA_VERIFY_URL = 'https://api.hcaptcha.com/siteverify';
export const HCAPTCHA_TOKEN_FIELD = 'hcaptchaToken';

// Tokens are opaque strings from the widget; bound the length so a hostile
// payload can't push megabytes at the verify endpoint on our dime.
export const HCAPTCHA_TOKEN_MAX_LENGTH = 4096;

// Next.js only inlines NEXT_PUBLIC_* values where the source contains the
// literal text `process.env.NEXT_PUBLIC_...`; reading it off a passed-in `env`
// object compiles to a runtime lookup that is always undefined in the browser.
// So the browser path reads this module-scope constant, and the injectable
// `env` parameter exists for the server route and tests.
const INLINED_SITE_KEY = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;

export function getHCaptchaSiteKey(env) {
  const raw = env ? env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY : INLINED_SITE_KEY;
  return (raw || '').trim() || HCAPTCHA_DEFAULT_SITE_KEY;
}

export function isHCaptchaEnforced(env = process.env) {
  return Boolean((env.HCAPTCHA_SECRET || '').trim());
}

export function normalizeHCaptchaToken(value) {
  if (typeof value !== 'string') return '';
  const token = value.trim();
  if (!token || token.length > HCAPTCHA_TOKEN_MAX_LENGTH) return '';
  return token;
}

/**
 * Verify a widget token with hCaptcha.
 *
 * @returns {Promise<{ ok: boolean, reason: 'verified'|'not-enforced'|'missing-token'|'rejected'|'unavailable', codes?: string[] }>}
 *   `ok` is what the route should act on. `reason` explains it for logs/tests.
 */
export async function verifyHCaptchaToken(token, { remoteIp, env = process.env, fetchImpl = fetch, logger = console } = {}) {
  if (!isHCaptchaEnforced(env)) {
    return { ok: true, reason: 'not-enforced' };
  }

  const normalized = normalizeHCaptchaToken(token);
  if (!normalized) {
    return { ok: false, reason: 'missing-token' };
  }

  const body = new URLSearchParams({
    secret: env.HCAPTCHA_SECRET.trim(),
    response: normalized,
    sitekey: getHCaptchaSiteKey(env),
  });
  if (remoteIp) body.set('remoteip', remoteIp);

  let result;
  try {
    const response = await fetchImpl(HCAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      cache: 'no-store',
    });
    if (!response.ok) {
      logger.error(`hCaptcha siteverify returned ${response.status}; accepting submission without verification.`);
      return { ok: true, reason: 'unavailable' };
    }
    result = await response.json();
  } catch (error) {
    logger.error('hCaptcha siteverify unreachable; accepting submission without verification:', error?.message);
    return { ok: true, reason: 'unavailable' };
  }

  if (result?.success === true) {
    return { ok: true, reason: 'verified' };
  }

  const codes = Array.isArray(result?.['error-codes']) ? result['error-codes'] : [];
  // A misconfigured secret is our bug, not the visitor's; surface it loudly
  // but still refuse -- silently passing would make the widget decorative.
  if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
    logger.error('hCaptcha rejected the server secret (HCAPTCHA_SECRET); check the Vercel env var.');
  }
  return { ok: false, reason: 'rejected', codes };
}
