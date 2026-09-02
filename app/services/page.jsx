import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ServiceGrid from '../../components/marketing/ServiceGrid';
import ServiceThreadArc from '../../components/marketing/ServiceThreadArc';
import FaqSchema from '../../components/marketing/FaqSchema';
import { SERVICE_PAGES } from '../../lib/servicePages.mjs';
import { SITE } from '../../lib/site';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

const TITLE = 'Services';
const DESCRIPTION =
  'CD Sportswear USA designs and builds websites, brand systems, motion, and AI and workflow automation — focused offers, each owned end to end.';

const SERVICES_FAQ = [
  {
    q: 'Do I have to commit to more than one service?',
    a: 'No. Every engagement starts scoped to the problem in front of you — a site, a brand system, an automation. If it later touches a second service, that gets scoped and agreed separately, never assumed upfront.',
  },
  {
    q: 'What if my project needs two or three of these at once?',
    a: 'That is the common case, not the exception — a rebrand that needs a new site, a new site that needs a workflow behind it. One team runs the combination, so nothing gets lost in a handoff between vendors.',
  },
  {
    q: 'I don’t know which service my problem needs. Now what?',
    a: 'Describe the problem in a brief, not the service you think you need. Matching it to the right offer, or telling you honestly that none of them fit, is our job.',
  },
  {
    q: 'Do you publish pricing per service?',
    a: 'Not as fixed ranges — scope varies too much for a public number to mean anything. Send your brief through Contact and you get a real quote, not a guess.',
  },
];

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
      <ContentSection eyebrow="Choosing" title="One service or all eight" tone="alt">
        <p className="mkt-prose">
          Most engagements start with a single thread — a site that needs rebuilding, a brand system
          that needs order, a workflow eating hours every week. The eight connect because one team runs
          all of them: pull on one and the rest are already staffed if the work grows into them. You are
          never sold a bundle to justify a bigger invoice.
        </p>
        <p className="mkt-prose">
          Not sure which one fits? <Link href="/contact">Send the brief</Link> and describe the problem,
          not the service — matching it to the right offer is our job, not yours.
        </p>
      </ContentSection>
      <ContentSection eyebrow="FAQ" title="Common questions">
        <dl className="mkt-faq">
          {SERVICES_FAQ.map((item) => (
            <div className="mkt-faq-item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </ContentSection>
      <ContentSection eyebrow="More" title="See the standard behind every offer" tone="alt">
        <ul className="mkt-related">
          <li>
            <Link href="/process" className="mkt-related-link" data-cursor="View">
              <span className="mkt-related-title">Process — the six stages every one of these services runs through.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/work" className="mkt-related-link" data-cursor="View">
              <span className="mkt-related-title">Selected work — see the services above applied to real briefs.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/reviews" className="mkt-related-link" data-cursor="View">
              <span className="mkt-related-title">Client reviews — what it was like to work with us, published in full.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </ContentSection>
      <BreadcrumbSchema trail={[{ name: 'Services', path: '/services' }]} />
      <FaqSchema faq={SERVICES_FAQ} />
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
