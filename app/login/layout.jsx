// This segment layout is the only place a 'use client' page can declare
// metadata, so the title, description and self-canonical live here.
//
// The noindex that used to sit here was removed on 2026-09-12 at the site
// owner's request — /login is to be indexable — along with the matching
// Disallow in app/robots.js. Nested /login/{admin,client,employee} declare
// their own noindex and are unaffected.
//
// Caveat on record: this page is thin (16–30 words) and Screaming Frog counted
// it among the 15 canonicalised pages diluting the indexed set, which is why
// the noindex was added originally.
export const metadata = {
  title: 'Log in',
  description: 'Sign in to the CD Sportswear INC client, employee, or admin portal.',
  alternates: { canonical: '/login' },
};

export default function LoginLayout({ children }) {
  return children;
}
