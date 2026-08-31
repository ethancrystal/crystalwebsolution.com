import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ContactForm from '../../components/marketing/ContactForm';
import ProcessStepsRail from '../../components/marketing/ProcessStepsRail';
import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

const TITLE = 'Process';
const DESCRIPTION =
  'How CD Sportswear USA works — a clear path from discovery to a product your team owns, measured against real behavior.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/process' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/process'),
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

// duration/deliverable are PLACEHOLDER values — confirm real figures with
// the studio before this ships. See docs (content plan) for the open
// founder-input checklist this closes once answered.
const STEPS = [
  {
    n: '01',
    title: 'Discover',
    body: 'We learn the goal, the audience, and the one job the work must do. No assumptions, no recycled pitch.',
    duration: 'PLACEHOLDER — confirm typical duration',
    deliverable: 'PLACEHOLDER — confirm deliverable',
  },
  {
    n: '02',
    title: 'Define',
    body: 'We turn the brief into structure — information architecture, brand position, or automation map — before a pixel moves.',
    duration: 'PLACEHOLDER — confirm typical duration',
    deliverable: 'PLACEHOLDER — confirm deliverable',
  },
  {
    n: '03',
    title: 'Design',
    body: 'Visual systems, copy, and motion are built together so the message and the medium agree.',
    duration: 'PLACEHOLDER — confirm typical duration',
    deliverable: 'PLACEHOLDER — confirm deliverable',
  },
  {
    n: '04',
    title: 'Build',
    body: 'Engineering and design stay in lockstep. You see working vertical slices, not a mockup that breaks in the browser.',
    duration: 'PLACEHOLDER — confirm typical duration',
    deliverable: 'PLACEHOLDER — confirm deliverable',
  },
  {
    n: '05',
    title: 'Refine',
    body: 'We measure against real behavior and real outcomes, then tighten — the work earns its keep or it changes.',
    duration: 'PLACEHOLDER — confirm typical duration',
    deliverable: 'PLACEHOLDER — confirm deliverable',
  },
  {
    n: '06',
    title: 'Hand off',
    body: 'You own maintainable, documented code and assets. We leave your team able to extend without us.',
    duration: 'PLACEHOLDER — confirm typical duration',
    deliverable: 'PLACEHOLDER — confirm deliverable',
  },
];

export default function ProcessPage() {
  return (
    <MarketingShell sceneVariant="process">
      <PageHero
        eyebrow="Process"
        title="From idea to outcome, without the limbo."
        lede="A clear path built to keep design and engineering in lockstep — so good ideas actually ship."
      />
      <ContentSection eyebrow="How we work" title="Six steps, one standard of care">
        <ProcessStepsRail steps={STEPS} />
      </ContentSection>
      <ContentSection eyebrow="Start" title="Bring us the brief" tone="alt">
        <p className="mkt-prose">
          Tell us what you are building and what success looks like. We’ll give you a straight read on
          scope, timeline, cost, and the first move if it’s a fit.
        </p>
        <div className="mkt-contact-wrap">
          <ContactForm variant="marketing" />
        </div>
        <p className="mkt-contact-alt">
          Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </ContentSection>
      <BreadcrumbSchema trail={[{ name: 'Process', path: '/process' }]} />
    </MarketingShell>
  );
}
