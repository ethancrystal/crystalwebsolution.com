import Link from 'next/link';
import { SITE } from '../../lib/site';
import { getServicePageBySlug } from '../../lib/servicePages';
import MarketingShell from '../../components/marketing/MarketingShell';
import SectionReveal from '../../components/SectionReveal';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';
import FaqSchema from '../../components/marketing/FaqSchema';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

const PAGE = getServicePageBySlug('seo');

export const metadata = {
  title: PAGE.seoTitle,
  description: PAGE.metaDescription,
  alternates: { canonical: '/services/seo' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/services/seo'),
    title: `${PAGE.seoTitle} | ${SITE.name}`,
    description: PAGE.metaDescription,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${PAGE.seoTitle} | ${SITE.name}`,
    description: PAGE.metaDescription,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function SeoServicePage() {
  return (
    <MarketingShell>
      <main className="case mkt-inner">
        <p className="eyebrow">
          <SectionReveal as="span" direction="left">{PAGE.eyebrow}</SectionReveal>
        </p>
        <SectionReveal as="h1" className="page-title" direction="left" delay={0.05}>
          {PAGE.h1}
        </SectionReveal>

        <SectionReveal as="div" className="callout" direction="up" delay={0.1}>
          <p>
            <strong>Short answer:</strong> SEO is the slow, compounding work of making a
            real business findable by the people already looking for what it sells. We
            handle the technical and strategic pieces that make that happen — and we are
            honest about what is realistic for your site, rather than selling a promise
            search engines do not make.
          </p>
        </SectionReveal>

        <SectionReveal as="div" className="case-body" direction="up" delay={0.1}>
          <p>{PAGE.introduction}</p>
          <p>{PAGE.problem}</p>
          <p>{PAGE.scenario}</p>

          <h2>What SEO actually is — and is not</h2>
          <p>
            SEO is search engine optimization: the work of making a website findable,
            understandable, and credible to search engines, so the right people find the
            right pages when they search.
          </p>
          <p>
            What it is not: a promise of a specific ranking in a specific month. Any
            provider who guarantees a ranking is either misrepresenting how search works
            or optimizing for the wrong thing. We will not do that. Rankings are an output
            — the levers are technical health, content that answers real queries better than
            the current top result, and authority earned over time.
          </p>
          <p>
            That distinction matters before money changes hands, because most SEO
            disappointment comes from starting with rankings and ending with a site that is
            technically broken, thin on content, and invisible to the local buyers it most
            needs. The work that moves the levers is unglamorous, cumulative, and honest.
            That is the work we do.
          </p>

          <h2>What we do</h2>
          <p>
            The SEO engagement covers six areas. Not every engagement touches all six —
            scope is set in the written proposal — but these are the pieces available:
          </p>
          <SectionReveal as="ul" className="case-services" direction="up" delay={0.1}>
            {PAGE.capabilities.map((cap) => {
              const [head, ...rest] = cap.split(' — ');
              return (
                <li key={cap}>
                  <strong>{head}.</strong>{' '}
                  {rest.join(' — ')}
                </li>
              );
            })}
          </SectionReveal>

          {PAGE.capabilityDetails.map((detail, i) => (
            <SectionReveal as="div" className="case-body" direction="up" delay={0.1} key={i}>
              <p>{detail}</p>
            </SectionReveal>
          ))}

          <h2>Deliverables</h2>
          <SectionReveal as="ul" className="case-services" direction="up" delay={0.1}>
            {PAGE.deliverables.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </SectionReveal>

          <h2>Process</h2>
          <p>
            SEO is ongoing by nature — but every engagement starts with a clear sequence, so
            you know what you are buying and what comes next:
          </p>
          <SectionReveal as="ul" className="case-services" direction="up" delay={0.1}>
            {PAGE.process.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </SectionReveal>
          {PAGE.processDetails.map((detail, i) => (
            <SectionReveal as="div" className="case-body" direction="up" delay={0.1} key={i}>
              <p>{detail}</p>
            </SectionReveal>
          ))}

          <h2>Is this the right fit?</h2>
          <p>{PAGE.idealClient}</p>
          <p>{PAGE.notIdealClient}</p>
        </SectionReveal>

        <SectionReveal as="div" className="case-body" direction="up" delay={0.1}>
          <h2>Common questions</h2>
        </SectionReveal>
        <SectionReveal as="dl" className="mkt-faq" direction="up" delay={0.1}>
          {PAGE.faq.map((item) => (
            <div className="mkt-faq-item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </SectionReveal>

        <Link href="/contact" className="case-next">
          <span className="eyebrow">Start here</span>
          <span className="case-next-title">{PAGE.finalCta} →</span>
        </Link>
        <Link href="/work" className="case-next">
          <span className="eyebrow">See our work</span>
          <span className="case-next-title">Every project, one standard →</span>
        </Link>

        <BreadcrumbSchema
          trail={[
            { name: 'Services', path: '/services' },
            { name: 'SEO', path: '/services/seo' },
          ]}
        />
        <FaqSchema faq={PAGE.faq} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Service',
                  '@id': absoluteUrl('/services/seo/#seo-service'),
                  name: 'Search Engine Optimization (SEO)',
                  description: PAGE.metaDescription,
                  url: absoluteUrl('/services/seo'),
                  provider: { '@id': absoluteUrl('/#organization') },
                  areaServed: [
                    { '@type': 'Country', name: 'United States' },
                    { '@type': 'Country', name: 'United Arab Emirates' },
                  ],
                  serviceType: 'Search engine optimization',
                  offers: {
                    '@type': 'Offer',
                    priceSpecification: {
                      '@type': 'NotIncluded',
                      description:
                        'Scope-dependent and quote-only. Send your brief through Contact for a real scope and quote — not a guess.',
                    },
                  },
                },
                {
                  '@type': 'FAQPage',
                  '@id': absoluteUrl('/services/seo/#faq'),
                  mainEntity: PAGE.faq.map((item) => ({
                    '@type': 'Question',
                    name: item.q,
                    acceptedAnswer: {
                      '@type': 'Answer',
                      text: item.a,
                    },
                  })),
                },
              ],
            }),
          }}
        />
      </main>
    </MarketingShell>
  );
}
