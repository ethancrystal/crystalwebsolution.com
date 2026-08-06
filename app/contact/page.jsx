import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ContactForm from '../../components/marketing/ContactForm';
import { SITE } from '../../lib/site';

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
    <MarketingShell>
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
        <ul className="mkt-contact-direct">
          <li><span className="mkt-contact-label">Email</span><a href={`mailto:${SITE.email}`}>{SITE.email}</a></li>
          {SITE.phone && (
            <li><span className="mkt-contact-label">Phone</span><a href={`tel:${SITE.phone.replace(/[^\d+]/g, '')}`}>{SITE.phone}</a></li>
          )}
          <li><span className="mkt-contact-label">Studio</span><span>{SITE.city}</span></li>
        </ul>
      </ContentSection>
    </MarketingShell>
  );
}
