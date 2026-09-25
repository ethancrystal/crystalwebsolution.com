import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

// See app/login/layout.jsx — /signup is noindex, follow (MJ, 2026-09-24),
// reversing the 2026-09-11 decision after Ubersuggest flagged it as thin
// content. It stays crawlable so the noindex is seen.
const TITLE = 'Create your account';
const DESCRIPTION = 'Create a CD Sportswear INC client or employee account.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/signup' },
  robots: { index: false, follow: true },
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
