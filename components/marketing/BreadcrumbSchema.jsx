import { absoluteUrl } from '../../lib/seo.mjs';

// BreadcrumbList JSON-LD. Screaming Frog found 0 structured data types across
// the crawl; breadcrumbs are the one rich result every /work/* and /services/*
// page qualifies for, and they give crawlers the site hierarchy that a
// single-page scroll site otherwise hides.
//
// `trail` is an ordered array of { name, path } — the current page included,
// home excluded (this component prepends it).
export default function BreadcrumbSchema({ trail = [] }) {
  if (!trail.length) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is controlled (no user input), safe to inject.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
