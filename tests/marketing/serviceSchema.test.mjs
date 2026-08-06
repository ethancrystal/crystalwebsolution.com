import { render } from '@testing-library/react';
import ServiceSchema from '@/components/marketing/ServiceSchema';

describe('ServiceSchema', () => {
  it('generates correct JSON-LD for a service', () => {
    const n = 'Web Design';
    const title = 'Professional Web Design';
    const description = 'Custom web design services for businesses';

    const { getByRole } = render(<ServiceSchema n={n} title={title} description={description} />);
    const scriptEl = getByRole('note'); // script tag with application/ld+json has role note

    const jsonLd = JSON.parse(scriptEl.textContent);

    expect(jsonLd).toEqual({
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": n,
      "name": title,
      "description": description,
      "provider": {
        "@type": "Organization",
        "name": "Crystal Web Solution"
      }
    });
  });
});