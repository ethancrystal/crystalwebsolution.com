// ServiceSchema — renders schema.org Service JSON-LD for an inner service page.
// Pure presentational (no client state) so it can render in a server component.
export default function ServiceSchema({ n, title, description }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: n,
    name: title,
    description,
    provider: {
      '@type': 'Organization',
      name: 'Crystal Web Solution',
    },
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is controlled (no user input), safe to inject.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
