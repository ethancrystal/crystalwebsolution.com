import { absoluteUrl } from '../../lib/seo.mjs';
import { safeJsonLd } from '../../lib/jsonLd.mjs';

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
      // Crumb names were hardcoded site copy when this component was written,
      // but /blog/[slug] now passes an author-authored post title through
      // `trail`. JSON.stringify does not escape `<`, so a title containing
      // `</script>` would close this element early — safeJsonLd escapes the
      // angle brackets. No-op for the fixed-string callers.
      dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }}
    />
  );
}
