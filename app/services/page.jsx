import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import ServiceGrid from '../../components/marketing/ServiceGrid';
import ServiceThreadArc from '../../components/marketing/ServiceThreadArc';
import FaqSchema from '../../components/marketing/FaqSchema';
import { PRODUCTION_SERVICE_PAGES, STUDIO_SERVICE_PAGES } from '../../lib/servicePages.mjs';
import { SITE } from '../../lib/site';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

// 2026-10-19: embroidery digitizing and custom patches lead (docs/seo/STRATEGY.md
// §2-§3, themes P1/P2), the digital studio follows. Still leads with "Services"
// so the title matches the /services slug, and still avoids every pillar's head
// term ("embroidery digitizing services", "custom patches", "web design",
// "branding") so the hub never competes with its own pillars. Wrapped in
// `absolute` so the root layout's `%s | <brand>` template does not append to it.
const SEO_TITLE = 'Services: Digitizing, Patches & Web — CD Sportswear INC';
const DESCRIPTION =
  'CD Sportswear INC digitizes embroidery and makes custom patches, and its digital studio designs and builds websites, brand systems, motion and automation.';

// No service count anywhere on this page: "Eight disciplines" survived on
// llms.txt after a ninth page shipped (2026-10-19 audit). The grids show the
// count; the copy never states it.
const SERVICES_FAQ = [
  {
    q: 'Do you make the patches, or only the files?',
    a: 'Both. We digitize the artwork and make the patches — embroidered, woven, PVC, leather, chenille and printed — and you see a mockup before anything is produced.',
  },
  {
    q: 'Do I have to commit to more than one service?',
    a: 'No. Every engagement starts scoped to the problem in front of you — a patch run, a file to digitize, a site, an automation. If it later touches a second service, that gets scoped and agreed separately, never assumed upfront.',
  },
  {
    q: 'I don’t know which service my problem needs. Now what?',
    a: 'Describe the problem, not the service you think you need. Matching it to the right offer, or telling you honestly that none of them fit, is our job.',
  },
  {
    q: 'Do you publish pricing per service?',
    a: 'Only the current patch offer, which is on the custom patches page. Everything else varies too much for a public number to mean anything: send the details and you get a real quote, not a guess.',
  },
];

export const metadata = {
  title: { absolute: SEO_TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/services' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/services'),
    title: SEO_TITLE,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO_TITLE,
    description: DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function ServicesIndex() {
  return (
    <MarketingShell sceneVariant="services">
      <PageHero
        eyebrow="What we do"
        title="Embroidery and patches first. The studio alongside."
        lede="Embroidery digitizing and custom patches are the centre of the business: every product starts as a file we prepare and test on the machine. The digital studio builds the websites, brands and automation around them."
      />
      <ContentSection eyebrow="Production" title="Embroidery digitizing and custom patches">
        <ServiceGrid pages={PRODUCTION_SERVICE_PAGES} />
      </ContentSection>
      <ContentSection eyebrow="Digital studio" title="Websites, brands and automation" tone="alt">
        <ServiceThreadArc />
        <ServiceGrid pages={STUDIO_SERVICE_PAGES} />
      </ContentSection>
      <ContentSection eyebrow="Choosing" title="One service or several">
        <p className="mkt-prose">
          Most work starts with a single thread — a file that needs digitizing, a patch run, a site that
          needs rebuilding, a workflow eating hours every week. They connect because one team runs all of
          them: the same people who digitize a logo can put it on a patch, a cap and a website. You are
          never sold a bundle to justify a bigger invoice.
        </p>
        <p className="mkt-prose">
          Have artwork ready? <Link href="/#contact-production">Send the file, the size and the quantity</Link>.
          Planning a site or a brand? <Link href="/contact">Send the brief</Link> and describe the problem,
          not the service — matching it to the right offer is our job, not yours.
        </p>
      </ContentSection>
      <ContentSection eyebrow="FAQ" title="Common questions" tone="alt">
        <dl className="mkt-faq">
          {SERVICES_FAQ.map((item) => (
            <div className="mkt-faq-item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </ContentSection>
      <ContentSection eyebrow="More" title="See the standard behind every offer">
        <ul className="mkt-related">
          <li>
            <Link href="/#quality" className="mkt-related-link">
              <span className="mkt-related-title">Quality control — how a file is sewn out, inspected and corrected before production.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/process" className="mkt-related-link">
              <span className="mkt-related-title">Process — the six stages every studio project runs through.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/work" className="mkt-related-link">
              <span className="mkt-related-title">Selected work — the studio’s services applied to real briefs.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/reviews" className="mkt-related-link">
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
            itemListElement: [...PRODUCTION_SERVICE_PAGES, ...STUDIO_SERVICE_PAGES].map((page, index) => ({
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
