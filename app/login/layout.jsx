// Auth surfaces are thin (16–30 words), duplicate the homepage title/description,
// and sit behind a login — Screaming Frog counted them among the 15 canonicalised
// pages diluting the indexed set. This segment layout is the only place a
// 'use client' page can declare metadata, so noindex + a self-canonical live here.
// Nested /login/{admin,client,employee} inherit this unless they override it.
export const metadata = {
  title: 'Log in',
  description: 'Sign in to the Crystal Web Solution client, employee, or admin portal.',
  alternates: { canonical: '/login' },
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }) {
  return children;
}
