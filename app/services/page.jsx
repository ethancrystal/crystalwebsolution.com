import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ServiceGrid from '../../components/marketing/ServiceGrid';
import ServiceThreadArc from '../../components/marketing/ServiceThreadArc';
import { SERVICE_PAGES } from '../../lib/servicePages.mjs';
import { SITE } from '../../lib/site';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

const TITLE = 'Services';
const DESCRIPTION =
  'Crystal Web Solution designs and builds websites, brand systems, motion, and AI and workflow automation — focused offers, each owned end to end.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/services' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/services'),
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function ServicesIndex() {
  return (
    <MarketingShell sceneVariant="services">
      <PageHero
        eyebrow="What we do"
        title="Focused offers. Owned end to end."
        lede="Eight connected services, each run by people who do the work — not a menu of things we resell."
      />
      <ContentSection eyebrow="Services" title="Pick a thread">
        <ServiceThreadArc />
        <ServiceGrid pages={SERVICE_PAGES} />
      </ContentSection>
      <BreadcrumbSchema trail={[{ name: 'Services', path: '/services' }]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${SITE.name} services`,
            itemListElement: SERVICE_PAGES.map((page, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              name: page.title,
              url: absoluteUrl(`/services/${page.slug}`),
            })),
          }),
        }}
      />
    </MarketingShell>
  );
}
