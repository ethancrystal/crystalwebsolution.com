import { headers } from 'next/headers';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Rate limiting for the unauthenticated auth actions (signUp,
// resendConfirmationEmail, requestPasswordReset) - each can trigger a Resend
// send and, for signUp, an admin.generateLink() call. See
// ADR-002-contact-form-rate-limiting.md for why an in-memory limiter doesn't
// work on Vercel's serverless model, and why these three need Upstash rather
// than a Vercel Firewall path rule - Server Actions all POST to the same
// page route, so a path-based edge rule can't isolate one action from every
// other action on that page.
//
// Fails open (no limiting) when UPSTASH_REDIS_REST_URL/_TOKEN aren't
// configured, or if a lookup errors - a rate-limiter outage must not become
// an auth outage. This makes the limiter inert, not broken, until those two
// env vars are set in Vercel.
let limiter = null;
let warnedMissingConfig = false;

function getLimiter() {
  if (limiter) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (!warnedMissingConfig) {
      console.warn('[rateLimit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set - auth-action rate limiting is disabled.');
      warnedMissingConfig = true;
    }
    return null;
  }

  limiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    prefix: 'cws-auth-rl',
  });

  return limiter;
}

export async function getClientIp() {
  try {
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    if (forwardedFor) return forwardedFor.split(',')[0].trim();
    return headerList.get('x-real-ip') ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// Returns { allowed: boolean }. Checks an IP-scoped window and, when an
// email is given, an email-scoped window under the same action name - so a
// single IP can't spam many addresses and a single address can't be
// mail-bombed from many IPs.
export async function checkAuthRateLimit(action, email) {
  const rl = getLimiter();
  if (!rl) return { allowed: true };

  try {
    const ip = await getClientIp();
    const [byIp, byEmail] = await Promise.all([
      rl.limit(`${action}:ip:${ip}`),
      email ? rl.limit(`${action}:email:${email.toLowerCase()}`) : Promise.resolve({ success: true }),
    ]);
    return { allowed: byIp.success && byEmail.success };
  } catch (error) {
    console.error('[rateLimit] check failed, allowing the request:', error);
    return { allowed: true };
  }
}
