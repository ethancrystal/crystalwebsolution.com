// FAQPage JSON-LD — every service page already renders a real Q&A list
// (ServicePage.jsx's `page.faq`), it just isn't marked up as structured
// data. This is the one addition that makes it eligible for Google's FAQ
// rich result without inventing any new content.
export default function FaqSchema({ faq = [] }) {
  if (!faq.length) return null;

  const data = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
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
