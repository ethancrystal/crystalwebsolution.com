import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import PageHero from '../../components/marketing/PageHero';
import ContentSection from '../../components/marketing/ContentSection';
import FoundingRail from '../../components/marketing/FoundingRail';
import ContactForm from '../../components/marketing/ContactForm';
import FaqSchema from '../../components/marketing/FaqSchema';
import { SITE } from '../../lib/site';
import { REVIEW_STATS } from '../../lib/reviews';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';

const TITLE = 'About';
const DESCRIPTION =
  'CD Sportswear USA is a digital studio designing websites, brand systems, motion, and AI automation — clarity, craft, and impact since 2016.';

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
    body: 'We start from what the visitor needs to understand and do. Motion and craft serve the message, never the other way around. A homepage that leads with an animation nobody asked for is decoration first. A homepage that leads with the one sentence a visitor needs is clarity first. We build the second kind, then let motion earn its place around it.',
  },
  {
    title: 'Craft you can feel',
    body: 'Type, spacing, and interaction are tuned like an instrument. The result reads as intentional, not templated. The difference between built-from-a-template and built-with-intent rarely shows up as one big thing. It shows up as ten small ones: a transition that eases instead of snaps, spacing that breathes at the right size, type that doesn’t fight the layout.',
  },
  {
    title: 'Built to ship and own',
    body: 'Design and engineering work as one. What we hand off is real, maintainable, and yours to extend. A design that only exists as a file on someone’s laptop is a promise, not a product. We hand off working code, not a picture of what the code should eventually look like.',
  },
  {
    title: 'Impact we can measure',
    body: 'We tie the work to outcomes — whether that is a clearer story, a smoother flow, or a pipeline that finally moves. A rebrand nobody can point to a result from is a cost, not an investment. Before we start, we ask what changes if the work succeeds — more replies, a clearer story, a workflow that stops leaking time — so there is something to check afterward.',
  },
];

// Placeholder for the third entry pending founder input (team headcount and
// discipline breakdown) — see the inner-pages content plan's founder-input
// checklist. Do not ship with only two FAQ items presented as final.
const ABOUT_FAQ = [
  {
    q: 'Do you handle design and build, or just one?',
    a: 'Both, on the same team. Design and engineering work in lockstep here, so what you get is not a mockup that someone else has to reinterpret. It gets built, and built to be owned.',
  },
  {
    q: 'You’re based in Manassas and Sharjah. How does that work for clients?',
    a: `The studio runs across two locations, ${SITE.city} and ${SITE.citySecondary}. That split overlaps with the US working day and extends further into it than a single-office studio would.`,
  },
  {
    q: 'How big is the team?',
    a: 'PLACEHOLDER — confirm real team headcount and discipline breakdown (design, engineering, motion/AI-automation) before publishing.',
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
          The studio spans {SITE.city} and {SITE.citySecondary} — close enough to your hours to feel local, global enough to ship anywhere.
        </p>
        <p className="mkt-prose">
          {SITE.name} keeps every client review public, good and bad. {REVIEW_STATS.total} reviews are
          published in full, averaging {REVIEW_STATS.average}/5.
        </p>
      </ContentSection>
      <ContentSection eyebrow="For you" title="Who this is for">
        <p className="mkt-prose">
          We work best with founders and teams who already know something is wrong and are done living
          with it: a site that stopped representing the business a while ago, a brand system three people
          are each interpreting differently, a workflow still running on someone’s memory instead of a
          system. If fixing it touches web design, development, branding, motion, or automation, and you
          want the same team designing it and building it, that is the work we do.
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
      <ContentSection eyebrow="More" title="See it in practice">
        <p className="mkt-prose">
          Belief statements are easy to write. Here is where you can check them against something real.
        </p>
        <ul className="mkt-related">
          <li>
            <Link href="/work" className="mkt-related-link" data-cursor="View">
              <span className="mkt-related-title">Selected work — every project, shaped around the real problem it had to solve.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/process" className="mkt-related-link" data-cursor="View">
              <span className="mkt-related-title">Process — the steps between a brief and a launch, laid out plainly.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
          <li>
            <Link href="/reviews" className="mkt-related-link" data-cursor="View">
              <span className="mkt-related-title">Client reviews — what clients said, published in full.</span>
              <span className="mkt-related-arrow" aria-hidden="true">→</span>
            </Link>
          </li>
        </ul>
      </ContentSection>

      <ContentSection eyebrow="FAQ" title="Common questions" tone="alt">
        <dl className="mkt-faq">
          {ABOUT_FAQ.map((item) => (
            <div className="mkt-faq-item" key={item.q}>
              <dt>{item.q}</dt>
              <dd>{item.a}</dd>
            </div>
          ))}
        </dl>
      </ContentSection>

      <ContentSection eyebrow="Work with us" title="Let’s make something rare">
        <p className="mkt-prose">
          If your site, brand, or workflow needs to stop looking like everyone else, send us the brief.
        </p>
        <div className="mkt-contact-wrap">
          <ContactForm variant="about" />
        </div>
        <p className="mkt-contact-alt">
          Prefer email? <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </ContentSection>
      <BreadcrumbSchema trail={[{ name: 'About', path: '/about' }]} />
      <FaqSchema faq={ABOUT_FAQ} />
    </MarketingShell>
  );
}
