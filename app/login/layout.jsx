import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

// /login is noindex, follow (MJ, 2026-09-24 — reverses the 2026-09-11 decision).
// Ubersuggest flagged it as thin content (17 words): a sign-in form has nothing
// to rank for, and brand searches ("cd sportswear") should land on the homepage.
// It stays crawlable (NOT disallowed in app/robots.js) so Google can actually
// read the noindex and drop it. `follow` keeps link equity flowing to the site.
//
// The role-specific portals at /login/{admin,client,employee} declare their own
// `robots: { index: false, follow: false }` and are also disallowed in robots.js.
const TITLE = 'Client Portal Log In — CD Sportswear INC';
const DESCRIPTION = 'Sign in to the CD Sportswear INC client, employee, or admin portal.';

export const metadata = {
  // `absolute` so the root `%s | brand` template doesn't append the brand twice.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/login' },
  robots: { index: false, follow: true },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/login'),
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function LoginLayout({ children }) {
  return children;
}
