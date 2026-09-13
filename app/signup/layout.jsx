// See app/login/layout.jsx — /signup is a public entry point and is indexable by
// MJ's decision (2026-09-11). The earlier `noindex` has been reversed and the
// matching `Disallow: /signup` removed from app/robots.js.
export const metadata = {
  title: 'Create your account',
  description: 'Create a CD Sportswear INC client or employee account.',
  alternates: { canonical: '/signup' },
  robots: { index: true, follow: true },
};

export default function SignupLayout({ children }) {
  return children;
}
