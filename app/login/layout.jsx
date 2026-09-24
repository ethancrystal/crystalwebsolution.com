import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

// /login is a public entry point and is indexable by MJ's decision (2026-09-11):
// the earlier `noindex` here — added when Screaming Frog counted the auth pages
// among the 15 canonicalised pages diluting the indexed set — has been reversed,
// and the matching `Disallow: /login` removed from app/robots.js. This segment
// layout is the only place a 'use client' page can declare metadata, so the
// robots directive and the self-canonical live here.
//
// The role-specific portals at /login/{admin,client,employee} are NOT covered by
// this: each declares its own `robots: { index: false, follow: false }`, which
// overrides what it would otherwise inherit from this file.
const TITLE = 'Log in';
const DESCRIPTION = 'Sign in to the CD Sportswear INC client, employee, or admin portal.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/login' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/login'),
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function LoginLayout({ children }) {
  return children;
}
