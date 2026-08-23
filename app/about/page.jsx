import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import FoundingRail from '../../components/marketing/FoundingRail';
import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

const TITLE = 'About the Studio';
const DESCRIPTION =
  'Crystal Web Solution is a digital studio designing websites, brand systems, motion, and AI automation — clarity, craft, and impact since 2016.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/about'),
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

const PRINCIPLES = [
  {
    title: 'Clarity before decoration',
    body: 'We start from what the visitor needs to understand and do. Motion and craft serve the message, never the other way around.',
  },
  {
    title: 'Craft you can feel',
    body: 'Type, spacing, and interaction are tuned like an instrument. The result reads as intentional, not templated.',
  },
  {
    title: 'Built to ship and own',
    body: 'Design and engineering work as one. What we hand off is real, maintainable, and yours to extend.',
  },
  {
    title: 'Impact we can measure',
    body: 'We tie the work to outcomes — whether that is a clearer story, a smoother flow, or a pipeline that finally moves.',
  },
];

export default function AboutPage() {
  return (
    <MarketingShell sceneVariant="about">
      <PageHero
        eyebrow="About"
        title="A studio built on clarity, craft, and impact."
        lede={SITE.statement}
      />
      <ContentSection eyebrow="Who we are" title="Small team, full ownership">
        <p className="mkt-prose">
          {SITE.name} is a digital studio working across web design, brand, motion, and AI automation.
          Since {SITE.founded}, we have helped businesses stand apart with work that is designed with
          intent and engineered to last.
        </p>
        <p className="mkt-prose">
          We are {SITE.projectsShipped} deep, with {SITE.experience} of practice behind every engagement.
          The studio spans {SITE.city} — close enough to your hours to feel local, global enough to ship anywhere.
        </p>
      </ContentSection>
      <ContentSection eyebrow="How we think" title="What we hold to" tone="alt">
        <div className="mkt-principles-wrap">
          <FoundingRail founded={SITE.founded} />
          <ul className="mkt-principles">
            {PRINCIPLES.map((item) => (
              <li key={item.title} className="mkt-principle">
                <h2 className="mkt-principle-title">{item.title}</h2>
                <p className="mkt-principle-body">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </ContentSection>
      <ContentSection eyebrow="Work with us" title="Let’s make something rare">
        <p className="mkt-prose">
          If your site, brand, or workflow needs to stop looking like everyone else, send us the brief.
        </p>
        <Link href="/#contact" className="btn btn-solid" data-cursor="Say hi">Start a project</Link>
      </ContentSection>
      <BreadcrumbSchema trail={[{ name: 'About', path: '/about' }]} />
    </MarketingShell>
  );
}
