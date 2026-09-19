import Link from 'next/link';

// Root layout still emits the site-wide `index, follow` robots tag. Next's
// default 404 also emits `noindex`, which production currently serves as two
// conflicting robots directives on missing URLs. This page is the single
// authoritative signal: missing URLs stay out of the index.
export const metadata = {
  title: 'Page not found',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="mkt-inner">
      <p className="eyebrow">404</p>
      <h1 className="page-title">This page is not here.</h1>
      <p>
        <Link href="/">Back to the homepage</Link>
        {' · '}
        <Link href="/contact">Send a brief</Link>
      </p>
    </section>
  );
}
