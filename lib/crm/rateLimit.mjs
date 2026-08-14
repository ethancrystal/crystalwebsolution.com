// Rate limiting utilities for CRM endpoints
import { RateLimiterMemory } from 'rate-limiter-flexible';

export const createRateLimiter = (points, duration) => {
  return new RateLimiterMemory({
    points, // number of points
    duration, // per duration seconds
    blockDuration: 60 // block for 60 seconds after limit reached
  });
};

// Pre-configured limiters for different endpoints
export const authRateLimiter = createRateLimiter(5, 60); // 5 attempts per minute
export const contactFormRateLimiter = createRateLimiter(3, 300); // 3 submissions per 5 minutes
export const projectActionRateLimiter = createRateLimiter(30, 60); // 30 actions per minute
export const adminApiRateLimiter = createRateLimiter(100, 60); // 100 requests per minute

// Middleware wrapper for Next.js API routes
export function withRateLimit(limiter) {
  return async function handler(req, res) {
    try {
      await limiter.consume(req.ip);
      return await handler(req, res);
    } catch (rejRes) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          message: 'Too many requests, please try again later.',
        }),
        { status: 429 }
      );
    }
  };
}