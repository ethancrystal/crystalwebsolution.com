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
//                                  .env.local. REQUIRED in production
//                                  (VERCEL_ENV=production); outside production
//                                  an unset secret skips verification so a
//                                  fresh checkout still works.
//
// Failure policy (fails closed): the result carries a status the route acts on.
//   passed       verified, or not required outside production
//   rejected     the visitor's token is missing or hCaptcha said no -> 400
//   unavailable  we could not verify: no secret in production, hCaptcha
//                unreachable or 5xx, or hCaptcha rejected OUR secret -> 503
//                with Retry-After. Nothing is sent or stored in that case.

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

function hasSecret(env) {
  return Boolean((env.HCAPTCHA_SECRET || '').trim());
}

// Same production signal as lib/rateLimit.mjs isProductionDeployment().
function isProduction(env) {
  return env.VERCEL_ENV === 'production';
}

export function isHCaptchaEnforced(env = process.env) {
  return hasSecret(env) || isProduction(env);
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
 * @returns {Promise<{ ok: boolean, status: 'passed'|'rejected'|'unavailable', reason: 'verified'|'not-enforced'|'missing-token'|'rejected'|'unavailable'|'misconfigured', codes?: string[] }>}
 *   `status` is what the route acts on (see the failure policy above);
 *   `ok` is status === 'passed'. `reason` explains it for logs and tests.
 */
export async function verifyHCaptchaToken(token, { remoteIp, env = process.env, fetchImpl = fetch, logger = console } = {}) {
  if (!hasSecret(env)) {
    if (isProduction(env)) {
      logger.error('HCAPTCHA_SECRET is not set in production; refusing contact submissions until it is.');
      return { ok: false, status: 'unavailable', reason: 'misconfigured' };
    }
    return { ok: true, status: 'passed', reason: 'not-enforced' };
  }

  const normalized = normalizeHCaptchaToken(token);
  if (!normalized) {
    return { ok: false, status: 'rejected', reason: 'missing-token' };
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
      logger.error(`hCaptcha siteverify returned ${response.status}; refusing the submission for now.`);
      return { ok: false, status: 'unavailable', reason: 'unavailable' };
    }
    result = await response.json();
  } catch (error) {
    logger.error('hCaptcha siteverify unreachable; refusing the submission for now:', error?.message);
    return { ok: false, status: 'unavailable', reason: 'unavailable' };
  }

  if (result?.success === true) {
    return { ok: true, status: 'passed', reason: 'verified' };
  }

  const codes = Array.isArray(result?.['error-codes']) ? result['error-codes'] : [];
  // A bad secret is our bug, not the visitor's: refuse, but as "try again
  // later" rather than "your check failed".
  if (codes.includes('invalid-input-secret') || codes.includes('missing-input-secret')) {
    logger.error('hCaptcha rejected the server secret (HCAPTCHA_SECRET); check the Vercel env var.');
    return { ok: false, status: 'unavailable', reason: 'misconfigured', codes };
  }
  return { ok: false, status: 'rejected', reason: 'rejected', codes };
}
