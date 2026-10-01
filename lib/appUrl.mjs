// The public origin that every emailed link is built from: sign-up
// confirmation, invite, password reset, and the CRM notification and
// "View in CRM" links.
//
// These links carry one-time sign-in tokens, so a wrong origin is a security
// problem, not a cosmetic one. NEXT_PUBLIC_APP_URL used to be read raw: unset
// produced `undefined/auth/verify?token_hash=...`, and a value naming a
// retired domain would have mailed live sign-in tokens to whoever now owns it.
// crystalwebsolution.com currently serves a third-party spam site (CLAUDE.md
// §Environments and deployment), so that is not hypothetical. getAppUrl()
// fails closed: it throws instead of returning anything it cannot vouch for.
//
// Resolve the URL BEFORE any write (creating an auth user, generating a link,
// claiming outbox rows) and turn a throw into the call site's own "temporarily
// unavailable" outcome, so a misconfiguration never half-completes.
//
// Everything here is pure and synchronous, and reads the environment when
// called rather than when the module loads, so `next build` (which imports
// every route) cannot fail on it and tests can set the environment per case.

// Domains that must never receive a link. cdsportswearusa.com 301-redirects to
// the live host; crystalwebsolution.com is controlled by a third party. A host
// matches when it equals one of these or is a subdomain of one.
export const RETIRED_HOSTS = Object.freeze([
  'crystalwebsolution.com',
  'cdsportswearusa.com',
]);

// Used only outside production when nothing is configured.
export const LOCAL_APP_URL = 'http://localhost:3000';

/** A configuration problem with the app URL. The message never carries secrets. */
export class AppUrlError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AppUrlError';
  }
}

/** True when `hostname` is a retired domain or a subdomain of one. */
export function isRetiredHost(hostname) {
  const host = String(hostname ?? '').toLowerCase().replace(/\.+$/, '');
  return RETIRED_HOSTS.some((retired) => host === retired || host.endsWith(`.${retired}`));
}

/**
 * Validates one candidate app URL and returns its origin (no trailing slash).
 * Throws AppUrlError when it is not an absolute http(s) URL, carries
 * credentials, a path, query or fragment, names a retired host, or is not
 * https while `requireHttps` is set.
 *
 * The thrown message names the setting and the problem but never echoes the
 * raw value, which could contain credentials.
 */
export function assertSafeAppUrl(value, { requireHttps = false, name = 'NEXT_PUBLIC_APP_URL' } = {}) {
  const raw = typeof value === 'string' ? value.trim() : '';

  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new AppUrlError(`${name} is not a valid absolute URL (expected e.g. https://app.cdsportswearinc.com).`);
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new AppUrlError(`${name} must use https:// (or http:// outside production).`);
  }
  if (url.username || url.password) {
    throw new AppUrlError(`${name} must not contain credentials.`);
  }
  if ((url.pathname !== '/' && url.pathname !== '') || url.search || url.hash) {
    throw new AppUrlError(`${name} must be an origin only, with no path, query or fragment.`);
  }
  if (isRetiredHost(url.hostname)) {
    throw new AppUrlError(
      `${name} names the retired domain ${url.hostname.toLowerCase()}; sign-in links must never point there.`,
    );
  }
  if (requireHttps && url.protocol !== 'https:') {
    throw new AppUrlError(`${name} must be https:// in production.`);
  }

  return url.origin;
}

// Literal `process.env.NEXT_PUBLIC_*` accesses are inlined at build time (the
// Docker image is built with the value as a build arg and the runtime stage
// does not have it), so this must stay a literal read, not `env[key]` against
// process.env. Evaluated per call, never at module load.
function readEnv() {
  return {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
  };
}

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * The validated public origin for emailed links, e.g.
 * `https://app.cdsportswearinc.com` (no trailing slash).
 *
 * - NEXT_PUBLIC_APP_URL when set: validated by assertSafeAppUrl, and
 *   https-only on Vercel Production.
 * - Unset on a Vercel Preview with VERCEL_URL: https://$VERCEL_URL.
 * - Unset outside production (development, test): http://localhost:3000.
 * - Unset in production: throws.
 *
 * @param {Record<string, string | undefined>} [env] Test seam; defaults to the
 *   live environment.
 * @returns {string}
 * @throws {AppUrlError}
 */
export function getAppUrl(env = readEnv()) {
  const vercelEnv = text(env.VERCEL_ENV);
  const configured = text(env.NEXT_PUBLIC_APP_URL);

  if (configured) {
    return assertSafeAppUrl(configured, { requireHttps: vercelEnv === 'production' });
  }

  if (vercelEnv === 'production') {
    throw new AppUrlError('NEXT_PUBLIC_APP_URL is not set in production; refusing to build sign-in links.');
  }

  const vercelUrl = text(env.VERCEL_URL);
  if (vercelEnv === 'preview' && vercelUrl) {
    return assertSafeAppUrl(`https://${vercelUrl}`, { name: 'VERCEL_URL' });
  }

  if (text(env.NODE_ENV) !== 'production') return LOCAL_APP_URL;

  throw new AppUrlError('NEXT_PUBLIC_APP_URL is not set in production; refusing to build sign-in links.');
}
