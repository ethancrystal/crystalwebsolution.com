import { render } from '@testing-library/react';
import ServiceSchema from '@/components/marketing/ServiceSchema';

describe('ServiceSchema', () => {
  it('generates Service JSON-LD aligned to visible copy without invented ratings', () => {
    const n = 'Web Design';
    const title = 'Custom web design for brands';
    const description = 'A custom web design studio for brands.';
    const url = 'https://www.cdsportswearinc.com/services/web-design';
    const areaServed = [
      {
        '@type': 'City',
        name: 'Manassas',
        containedInPlace: {
          '@type': 'State',
          name: 'Virginia',
        },
      },
      { '@type': 'Country', name: 'United States' },
      { '@type': 'Country', name: 'United Arab Emirates' },
    ];

    const { container } = render(
      <ServiceSchema
        n={n}
        title={title}
        description={description}
        url={url}
        areaServed={areaServed}
      />,
    );
    const scriptEl = container.querySelector('script[type="application/ld+json"]');
    expect(scriptEl).not.toBeNull();

    const jsonLd = JSON.parse(scriptEl.textContent);

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Service',
      serviceType: n,
      name: title,
      description,
      url,
      provider: {
        '@type': 'Organization',
        '@id': 'https://www.cdsportswearinc.com/#organization',
        name: 'CD Sportswear Inc',
        url: 'https://www.cdsportswearinc.com/',
      },
      areaServed,
    });
    expect(jsonLd.aggregateRating).toBeUndefined();
    expect(jsonLd.review).toBeUndefined();
    expect(jsonLd.offers).toBeUndefined();
  });

  it('defaults areaServed to the countries already declared on the Organization', () => {
    const { container } = render(
      <ServiceSchema
        n="Branding"
        title="Branding systems that won’t blend in"
        description="A branding studio for companies that refuse to blend in."
        url="https://www.cdsportswearinc.com/services/branding"
      />,
    );
    const jsonLd = JSON.parse(
      container.querySelector('script[type="application/ld+json"]').textContent,
    );

    expect(jsonLd.areaServed).toEqual([
      { '@type': 'Country', name: 'United States' },
      { '@type': 'Country', name: 'United Arab Emirates' },
    ]);
  });
});
