import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ContactForm from '../../components/marketing/ContactForm';
import ContactPulseLinks from '../../components/marketing/ContactPulseLinks';
import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
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
    url: absoluteUrl('/contact'),
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

export default function ContactPage() {
  return (
    <MarketingShell sceneVariant="contact">
      <PageHero
        eyebrow="Contact"
        title="Send us your brief."
        lede="Tell us what you are building and what success looks like. We’ll reply by email with a straight read."
      />
      <ContentSection eyebrow="Start with context" title="What to include in your brief">
        <p>Tell us what you are building, who it is for, and what is not working today. A useful brief can be short; the important part is giving us enough context to understand the decision behind the request.</p>
        <p>Include the current website or product, the outcome you want, any timing or technical constraints, and the people who need to review the work. If you have references, existing brand assets, or a rough list of required pages and integrations, include those too.</p>
        <p>We will read the brief, clarify the real scope, and respond with a direct next step. The form is not a commitment to begin a project.</p>
      </ContentSection>

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
