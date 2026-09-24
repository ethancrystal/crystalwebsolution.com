import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

// See app/login/layout.jsx — /signup is a public entry point and is indexable by
// MJ's decision (2026-09-11). The earlier `noindex` has been reversed and the
// matching `Disallow: /signup` removed from app/robots.js.
const TITLE = 'Create your account';
const DESCRIPTION = 'Create a CD Sportswear INC client or employee account.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/signup' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/signup'),
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

export default function SignupLayout({ children }) {
  return children;
}
