import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ContactForm from '../../components/marketing/ContactForm';
import ContactPulseLinks from '../../components/marketing/ContactPulseLinks';
import { SITE } from '../../lib/site';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

const TITLE = 'Contact';
const DESCRIPTION =
  'Start a project with Crystal Web Solution. Send your brief and get a straight read on scope, timeline, cost, and the first move if it’s a fit.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/contact' },
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

export default function ContactPage() {
  return (
    <MarketingShell sceneVariant="contact">
      <PageHero
        eyebrow="Contact"
        title="Send us your brief."
        lede="Tell us what you are building and what success looks like. We’ll reply by email with a straight read."
      />
      <ContentSection eyebrow="Project brief" title="The form">
        <div className="mkt-contact-wrap">
          <ContactForm variant="marketing" />
        </div>
      </ContentSection>
      <ContentSection eyebrow="Direct" title="Prefer email or a call?" tone="alt">
        <p className="mkt-prose">
          Reach us directly and we’ll route your note to the right person.
        </p>
        <ContactPulseLinks />
      </ContentSection>
      <BreadcrumbSchema trail={[{ name: 'Contact', path: '/contact' }]} />
    </MarketingShell>
  );
}
