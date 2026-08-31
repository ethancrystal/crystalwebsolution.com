import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ContactForm from '../../components/marketing/ContactForm';
import ContactPulseLinks from '../../components/marketing/ContactPulseLinks';
import FaqSchema from '../../components/marketing/FaqSchema';
import { SITE } from '../../lib/site';
import { REVIEW_STATS } from '../../lib/reviews';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

// Response-time answers below are PLACEHOLDER pending founder input — see
// the inner-pages content plan's founder-input checklist (Contact #15).
const CONTACT_FAQ = [
  {
    q: 'Do you take on smaller projects?',
    a: 'Yes. Our budget ranges start under $5k, and if a lighter option fits better than a full custom build, we’ll tell you before you spend anything.',
  },
  {
    q: 'What should I put in the project brief?',
    a: 'The goal, the current state, your timing, and what a strong outcome looks like — the same thing the form itself asks for. That’s enough for us to give you a real answer on scope, timeline, and cost.',
  },
  {
    q: 'Do you work with clients outside the United States?',
    a: 'Yes. We work with clients across the United States and the United Arab Emirates, and remotely everywhere in between.',
  },
  {
    q: 'How quickly will you respond?',
    a: 'PLACEHOLDER — confirm the real reply-window commitment (e.g. "within 1 business day") before publishing.',
  },
  {
    q: 'Will you sign an NDA before reviewing our brief?',
    a: 'PLACEHOLDER — confirm whether an NDA is offered on request, and link a privacy/data-handling policy if one exists.',
  },
];

const TITLE = 'Contact';
const DESCRIPTION =
  'Start a project with CD Sportswear USA. Send your brief and get a straight read on scope, timeline, cost, and the first move if it’s a fit.';

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
        lede="Tell us what you are building and what success looks like. PLACEHOLDER — confirm reply-window before publishing: We’ll reply by email within [X business days] with a straight read."
      />
      <ContentSection eyebrow="Project brief" title="The form">
        <div className="mkt-contact-wrap">
          <ContactForm variant="marketing" />
        </div>
      </ContentSection>
      <ContentSection eyebrow="Who this is for" title="Early-stage is fine" tone="alt">
        <p className="mkt-prose">
          This page is for people who can describe a real goal, even an early one. Budget ranges start
          under $5k, so early-stage doesn’t rule you out — what we need is a specific brief, not a
          finished plan. Still deciding which service fits? <Link href="/services">Browse services</Link> first;
          the right page names the fit before you write anything here.
        </p>
      </ContentSection>
      <ContentSection eyebrow="Next" title="What happens after you submit">
        <p className="mkt-prose">
          Every brief gets a straight read by email: whether it’s a fit, a rough scope, and the first
          move if it is. If it’s a fit, everything after that follows the same six-stage path we use on
          every project, from discovery through hand-off.
        </p>
        <Link href="/process" className="mkt-related-link" data-cursor="View">
          <span className="mkt-related-title">See how we work</span>
          <span className="mkt-related-arrow" aria-hidden="true">→</span>
        </Link>
      </ContentSection>
      <ContentSection eyebrow="Direct" title="Prefer email or a call?" tone="alt">
        <p className="mkt-prose">
          Reach us directly and we’ll route your note to the right person. We work across the United
          States and the United Arab Emirates — remote is the default here, not an exception. Not ready
          to write a brief yet? Read {REVIEW_STATS.total} <Link href="/reviews">client reviews</Link>, published
          in full, or look through recent <Link href="/work">work</Link> first.
        </p>
        <ContactPulseLinks />
      </ContentSection>
      <ContentSection eyebrow="FAQ" title="Common questions">
        <dl className="mkt-faq">
          {CONTACT_FAQ.map((item) => (
            <div className="mkt-faq-item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </ContentSection>
      <BreadcrumbSchema trail={[{ name: 'Contact', path: '/contact' }]} />
      <FaqSchema faq={CONTACT_FAQ} />
    </MarketingShell>
  );
}
