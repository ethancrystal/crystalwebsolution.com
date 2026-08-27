import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Sliding-window rate limiting for unauthenticated write endpoints: the
// contact form and the auth actions (signup, resend-confirmation, password
// reset). Backed by Upstash Redis rather than an in-process Map, because
// Vercel's serverless model gives no guarantee two requests land on the same
// warm instance - see ADR-002-contact-form-rate-limiting.md's Option B
// writeup for why an in-memory bucket would silently do nothing here.
//
// Fails open when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't
// configured, matching the no-throttle behavior that existed before this
// module - create a free Upstash Redis database and set both env vars to
// actually turn limiting on. It also fails open on a Redis-side error, so an
// Upstash outage degrades to "no rate limiting" rather than blocking
// legitimate signups/submissions.

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
        'Rate limiting is not active (UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set) - see ADR-002-contact-form-rate-limiting.md.'
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

/**
 * Best-effort client IP extraction from a Headers-like object - works with
 * both a Route Handler's `request.headers` and next/headers' `headers()`.
 */
export function getClientIp(headersLike) {
  const forwardedFor = headersLike.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim() || null;
  }
  return headersLike.get('x-real-ip') || null;
}

export function normalizeRateLimitEmail(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  return normalized || null;
}

export function buildAuthRateLimitKeys(action, email, headersLike) {
  const normalizedEmail = normalizeRateLimitEmail(email);
  const keys = {
    ip: {
      name: `${action}:ip`,
      identifier: getClientIp(headersLike),
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
