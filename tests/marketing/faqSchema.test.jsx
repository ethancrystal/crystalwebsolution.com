import { render } from '@testing-library/react';
import FaqSchema from '@/components/marketing/FaqSchema';

describe('FaqSchema', () => {
  it('generates correct FAQPage JSON-LD from a q/a array', () => {
    const faq = [
      { q: 'Do you design and build, or just design?', a: 'Both.' },
      { q: 'Will my site be unique to my business?', a: 'Yes.' },
    ];

    const { container } = render(<FaqSchema faq={faq} />);
    const scriptEl = container.querySelector('script[type="application/ld+json"]');
    expect(scriptEl).not.toBeNull();

    const jsonLd = JSON.parse(scriptEl.textContent);

    expect(jsonLd).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Do you design and build, or just design?',
          acceptedAnswer: { '@type': 'Answer', text: 'Both.' },
        },
        {
          '@type': 'Question',
          name: 'Will my site be unique to my business?',
          acceptedAnswer: { '@type': 'Answer', text: 'Yes.' },
        },
      ],
    });
  });

  it('renders nothing for an empty faq array', () => {
    const { container } = render(<FaqSchema faq={[]} />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull();
  });
});
