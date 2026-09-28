// Host split between the marketing site and the client portal.
//
// www.cdsportswearinc.com serves the marketing site; app.cdsportswearinc.com
// serves the CRM portal (login, client dashboard, team and admin areas). Both
// hosts are the same Vercel project and the same build: the split is a set of
// host-conditioned redirects in next.config.js, applied at Vercel's routing
// layer before any page or middleware runs. Owner-approved 2026-09-28.
//
// Every rule is conditioned on a production host name, so preview
// deployments (*.vercel.app) and localhost serve everything on one host,
// exactly as before.

export const SITE_HOST = 'www.cdsportswearinc.com';
export const APP_HOST = 'app.cdsportswearinc.com';
export const APP_ORIGIN = `https://${APP_HOST}`;
export const SITE_ORIGIN = `https://${SITE_HOST}`;

// Top-level path segments that belong to the portal. Keep in step with the
// middleware matcher in middleware.js (tests/portalHost.test.mjs checks it).
export const PORTAL_SEGMENTS = Object.freeze([
  'login',
  'signup',
  'forgot-password',
  'onboarding',
  'dashboard',
  'team',
  'admin',
  'auth',
]);

// Served on both hosts: API routes (the contact form posts from www, the
// pg_cron notification drain calls www/api/cron/...), Next's own assets, and
// Vercel's internal endpoints. Anything with a dot in it is a static file
// (robots.txt, sitemap.xml, icons, fonts, brand images) and is left alone too.
const SHARED_SEGMENTS = Object.freeze(['api', '_next', '_vercel']);

const escapeHost = (host) => host.replace(/\./g, '\\.');
// www, and the apex in case a request reaches the app before Vercel's own
// apex -> www redirect.
const SITE_HOST_PATTERN = `(?:www\\.)?${escapeHost('cdsportswearinc.com')}`;
const APP_HOST_PATTERN = escapeHost(APP_HOST);

/**
 * Redirect rules for next.config.js `redirects()`, in match order.
 *
 * @param {{ crmEnabled: boolean }} options
 *   With the CRM turned off (NEXT_PUBLIC_CRM_ENABLED=false) the middleware
 *   bounces every portal path to "/", so the app host must not send "/" to
 *   /login (that would loop): it sends everything to the marketing site.
 */
export function portalHostRedirects({ crmEnabled }) {
  const onSite = [{ type: 'host', value: SITE_HOST_PATTERN }];
  const onApp = [{ type: 'host', value: APP_HOST_PATTERN }];
  const excluded = [...PORTAL_SEGMENTS, ...SHARED_SEGMENTS].join('|');

  const appToSite = {
    // Everything on the app host that is not a portal page, a shared route
    // or a file goes to the same path on the marketing site. "/" is caught
    // by the rule above this one when the CRM is on.
    source: `/:path((?!(?:${excluded})(?:/|$))(?!.*\\.).*)`,
    has: onApp,
    destination: `${SITE_ORIGIN}/:path`,
    permanent: true,
  };

  if (!crmEnabled) return [appToSite];

  return [
    // Old portal links on www (bookmarks, emailed invites and password
    // resets sent before the switch) keep working: same path, same query
    // string, on the app host. Permanent, per the owner's choice.
    ...PORTAL_SEGMENTS.map((segment) => ({
      source: `/${segment}/:path*`,
      has: onSite,
      destination: `${APP_ORIGIN}/${segment}/:path*`,
      permanent: true,
    })),
    // The bare app host opens the login page. Middleware already sends a
    // signed-in visitor on /login to their own portal home, so this lands
    // clients on their dashboard. Temporary: the target depends on state.
    {
      source: '/',
      has: onApp,
      destination: '/login',
      permanent: false,
    },
    appToSite,
  ];
}
