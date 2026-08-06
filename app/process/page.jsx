import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ContactForm from '../../components/marketing/ContactForm';
import { SITE } from '../../lib/site';

const TITLE = 'Process';
const DESCRIPTION =
  'How Crystal Web Solution works — a clear path from discovery to a product your team owns, measured against real behavior.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/process' },
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

const STEPS = [
  {
    n: '01',
    title: 'Discover',
    body: 'We learn the goal, the audience, and the one job the work must do. No assumptions, no recycled pitch.',
  },
  {
    n: '02',
    title: 'Define',
    body: 'We turn the brief into structure — information architecture, brand position, or automation map — before a pixel moves.',
  },
  {
    n: '03',
    title: 'Design',
    body: 'Visual systems, copy, and motion are built together so the message and the medium agree.',
  },
  {
    n: '04',
    title: 'Build',
    body: 'Engineering and design stay in lockstep. You see working vertical slices, not a mockup that breaks in the browser.',
  },
  {
    n: '05',
    title: 'Refine',
    body: 'We measure against real behavior and real outcomes, then tighten — the work earns its keep or it changes.',
  },
  {
    n: '06',
    title: 'Hand off',
    body: 'You own maintainable, documented code and assets. We leave your team able to extend without us.',
  },
];

export default function ProcessPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Process"
        title="From idea to outcome, without the limbo."
        lede="A clear path built to keep design and engineering in lockstep — so good ideas actually ship."
      />
      <ContentSection eyebrow="How we work" title="Six steps, one standard of care">
        <ol className="mkt-steps mkt-steps--wide">
          {STEPS.map((step) => (
            <li key={step.n} className="mkt-step">
              <span className="mkt-step-index">{step.n}</span>
              <div className="mkt-step-body">
                <h2 className="mkt-step-title">{step.title}</h2>
                <p className="mkt-step-text">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </ContentSection>
      <ContentSection eyebrow="Start" title="Bring us the brief" tone="alt">
        <p className="mkt-prose">
          Tell us what you are building and what success looks like. We’ll give you a straight read on
          scope, timeline, cost, and the first move if it’s a fit.
        </p>
        <div className="mkt-contact-wrap">
          <ContactForm variant="process" />
        </div>
        <p className="mkt-contact-alt">
          Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </ContentSection>
    </MarketingShell>
  );
}
