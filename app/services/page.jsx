import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ServiceGrid from '../../components/marketing/ServiceGrid';
import ServiceThreadArc from '../../components/marketing/ServiceThreadArc';
import { SERVICE_PAGES } from '../../lib/servicePages.mjs';
import { SITE } from '../../lib/site';

const TITLE = 'Services';
const DESCRIPTION =
  'Crystal Web Solution designs and builds websites, brand systems, motion, and AI and workflow automation — focused offers, each owned end to end.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/services' },
  openGraph: {
    type: 'website',
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} | ${SITE.name}`,
    description: DESCRIPTION,
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
    </MarketingShell>
  );
}
