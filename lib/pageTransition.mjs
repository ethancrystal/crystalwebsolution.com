// Pure routing rules for the site-wide page transition (components/PageTransition.jsx).
// Only same-origin navigations between public marketing pages are animated.
// CRM/auth surfaces, same-page hash jumps, new tabs, downloads and non-HTTP
// links keep the browser's (or Next's) default behavior.
export const NO_TRANSITION_PREFIXES = Object.freeze([
  '/admin',
  '/api',
  '/auth',
  '/dashboard',
  '/forgot-password',
  '/login',
  '/onboarding',
  '/signup',
  '/team',
]);

export const PAGE_FADE_OUT_S = 0.45;
export const PAGE_FADE_IN_S = 0.6;

export function isTransitionPath(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return false;
  return !NO_TRANSITION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

// Returns the destination (path + search + hash) to animate to, or null to
// leave the click alone.
export function transitionDestination({ href, currentHref, target = '', download = false }) {
  if (!href || download) return null;
  if (target && target !== '_self') return null;

  let next;
  let current;
  try {
    current = new URL(currentHref);
    next = new URL(href, current);
  } catch {
    return null;
  }

  if (next.origin !== current.origin) return null;
  if (next.protocol !== 'http:' && next.protocol !== 'https:') return null;
  if (!isTransitionPath(current.pathname) || !isTransitionPath(next.pathname)) return null;
  // Same page (with or without a hash): in-page scroll, not a page change.
  if (next.pathname === current.pathname && next.search === current.search) return null;

  return `${next.pathname}${next.search}${next.hash}`;
}
