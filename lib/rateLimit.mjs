import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Sliding-window rate limiting for unauthenticated write endpoints: the
// contact form and the auth actions (signup, resend-confirmation, password
// reset). Backed by Upstash Redis rather than an in-process Map, because
// Vercel's serverless model gives no guarantee two requests land on the same
// warm instance - see docs/adr/ADR-002-contact-form-rate-limiting.md's Option B
// writeup for why an in-memory bucket would silently do nothing here.
//
// Two policies:
//
//   checkRateLimit / checkAuthRateLimit (sign-up, resend, password reset):
//     fail open when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't
//     configured or Redis errors, so an Upstash outage degrades to "no rate
//     limiting" rather than locking people out of their accounts.
//
//   checkRateLimitStrict (the public contact form): in production it FAILS
//     CLOSED. Missing Upstash configuration, a Redis/transport error, or no
//     trusted client IP returns status "unavailable", and the route answers
//     503 with Retry-After instead of accepting an unthrottled submission.
//     Outside production (local dev, previews) a missing configuration is
//     still allowed through, so a fresh checkout works.
//
// Client IP (getClientIp) is taken only from a trusted source; see there.

const configured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

let warnedUnconfigured = false;

const redis = configured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const limiters = new Map();

function getLimiter(name, limit, windowSeconds) {
  const key = `${name}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(key);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${name}`,
      analytics: false,
    });
    limiters.set(key, limiter);
  }
  return limiter;
}

/**
 * @param {string} name Logical bucket, e.g. "contact" or "auth:signup" - each
 *   distinct name gets its own independent budget.
 * @param {string | null | undefined} identifier Usually the client IP.
 * @param {{ limit?: number, windowSeconds?: number }} [opts] Defaults match
 *   ADR-002's suggested starting point (5 requests / 10 minutes per IP).
 * @returns {Promise<boolean>} true if the request is allowed through.
 */
export async function checkRateLimit(name, identifier, opts = {}) {
  if (!configured) {
    if (!warnedUnconfigured && process.env.NODE_ENV === 'production') {
      warnedUnconfigured = true;
      console.warn(
        'Rate limiting is not active (UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set) - see docs/adr/ADR-002-contact-form-rate-limiting.md.'
      );
    }
    return true;
  }

  if (!identifier) {
    // No client IP could be determined - fail open rather than block
    // legitimate traffic on a header/platform quirk.
    return true;
  }

  const limit = opts.limit ?? 5;
  const windowSeconds = opts.windowSeconds ?? 600;

  try {
    const { success } = await getLimiter(name, limit, windowSeconds).limit(identifier);
    return success;
  } catch (error) {
    console.error(`Rate limit check failed for "${name}":`, error.message);
    return true;
  }
}

export function isRateLimitingConfigured() {
  return configured;
}

// Production = the Vercel Production environment. Previews and local builds
// (even with NODE_ENV=production) are not.
export function isProductionDeployment(env = process.env) {
  return env.VERCEL_ENV === 'production';
}

const MAX_TRUSTED_PROXY_HOPS = 5;

function firstIp(value) {
  const ip = String(value ?? '').split(',')[0].trim();
  return ip || null;
}

/**
 * Client IP from a Headers-like object (a Route Handler's `request.headers`
 * or next/headers' `headers()`), taken only from a source the deployment
 * controls. The trusted-proxy contract:
 *
 *   - On Vercel (VERCEL=1) the platform sets `x-real-ip` (what
 *     @vercel/functions' ipAddress() reads) and `x-vercel-forwarded-for`
 *     from the TCP connection. Only those are read; a client-sent
 *     `x-forwarded-for` is ignored.
 *   - Anywhere else (Docker, a custom proxy), `x-forwarded-for` is honoured
 *     only when TRUSTED_PROXY_HOPS says how many proxies you run in front of
 *     the app (1-5). The client IP is then the entry that many places from the
 *     right, the one your outermost proxy appended; everything to its left
 *     is client-controlled and ignored.
 *   - Otherwise there is no trustworthy IP and this returns null.
 */
export function getClientIp(headersLike, env = process.env) {
  if (env.VERCEL === '1') {
    return firstIp(headersLike.get('x-real-ip')) || firstIp(headersLike.get('x-vercel-forwarded-for'));
  }

  const hops = Number.parseInt(env.TRUSTED_PROXY_HOPS ?? '', 10);
  if (Number.isInteger(hops) && hops >= 1 && hops <= MAX_TRUSTED_PROXY_HOPS) {
    const chain = String(headersLike.get('x-forwarded-for') ?? '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
    return chain.length >= hops ? chain[chain.length - hops] : null;
  }

  return null;
}

const strictRedisByConfig = new Map();

function defaultStrictLimit(env) {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  return async (name, identifier, limit, windowSeconds) => {
    if (env === process.env && configured) {
      return getLimiter(name, limit, windowSeconds).limit(identifier);
    }
    const cacheKey = `${url}|${name}|${limit}|${windowSeconds}`;
    let limiter = strictRedisByConfig.get(cacheKey);
    if (!limiter) {
      limiter = new Ratelimit({
        redis: new Redis({ url, token }),
        limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
        prefix: `ratelimit:${name}`,
        analytics: false,
      });
      strictRedisByConfig.set(cacheKey, limiter);
    }
    return limiter.limit(identifier);
  };
}

/**
 * Rate limit that fails closed in production (see the header comment).
 *
 * @returns {Promise<{ status: 'allowed'|'limited'|'unavailable', reason: string }>}
 */
export async function checkRateLimitStrict(name, identifier, {
  limit = 5,
  windowSeconds = 600,
  env = process.env,
  limitImpl,
  logger = console,
} = {}) {
  const production = isProductionDeployment(env);
  const hasConfig = Boolean(env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN);

  if (!limitImpl && !hasConfig) {
    if (production) {
      logger.error(`Rate limiting for "${name}" is required in production but Upstash Redis is not configured.`);
      return { status: 'unavailable', reason: 'not-configured' };
    }
    return { status: 'allowed', reason: 'not-configured' };
  }

  if (!identifier) {
    if (production) {
      logger.error(`No trusted client IP for "${name}"; refusing rather than skipping the rate limit.`);
      return { status: 'unavailable', reason: 'no-client-ip' };
    }
    return { status: 'allowed', reason: 'no-client-ip' };
  }

  try {
    const { success } = await (limitImpl ?? defaultStrictLimit(env))(name, identifier, limit, windowSeconds);
    return success ? { status: 'allowed', reason: 'within-limit' } : { status: 'limited', reason: 'over-limit' };
  } catch (error) {
    logger.error(`Rate limit backend failed for "${name}":`, error?.message);
    return { status: 'unavailable', reason: 'backend-error' };
  }
}

export function normalizeRateLimitEmail(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

export function buildAuthRateLimitKeys(action, email, headersLike, env = process.env) {
  const normalizedEmail = normalizeRateLimitEmail(email);
  const keys = {
    ip: {
      name: `${action}:ip`,
      identifier: getClientIp(headersLike, env),
    },
  };

  if (normalizedEmail) {
    keys.email = {
      name: `${action}:email`,
      identifier: normalizedEmail,
    };
  }

  return keys;
}

export async function checkAuthRateLimit(action, email, headersLike, opts = {}) {
  const keys = buildAuthRateLimitKeys(action, email, headersLike);
  const [ipAllowed, emailAllowed] = await Promise.all([
    checkRateLimit(keys.ip.name, keys.ip.identifier, opts),
    keys.email
      ? checkRateLimit(keys.email.name, keys.email.identifier, opts)
      : Promise.resolve(true),
  ]);

  return ipAllowed && emailAllowed;
}
