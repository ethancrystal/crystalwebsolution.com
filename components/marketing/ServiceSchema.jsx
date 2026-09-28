// ServiceSchema — renders schema.org Service JSON-LD for an inner service page.
// Pure presentational (no client state) so it can render in a server component.
// Fields stay tied to visible copy: name/description/url plus the real
// Organization provider. No AggregateRating, reviews, or invented offers.
import { SITE } from '../../lib/site';
import { SITE_ORIGIN } from '../../lib/seo.mjs';

// Matches the Organization's areaServed in app/layout.jsx: national, remote.
export const DEFAULT_SERVICE_AREA_SERVED = [
  { '@type': 'Country', name: 'United States' },
];

export default function ServiceSchema({ n, title, description, url, areaServed }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: n,
    name: title,
    description,
    url,
    provider: {
      '@type': 'Organization',
      '@id': `${SITE_ORIGIN}/#organization`,
      name: SITE.name,
      url: `${SITE_ORIGIN}/`,
    },
    areaServed: areaServed || DEFAULT_SERVICE_AREA_SERVED,
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is controlled (no user input), safe to inject.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
