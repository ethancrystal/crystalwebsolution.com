import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import WorkLibrary from '../../components/marketing/WorkLibrary';
import SectionReveal from '../../components/SectionReveal';
import FaqSchema from '../../components/marketing/FaqSchema';
import { PROJECTS } from '../../lib/projects';
import { SITE } from '../../lib/site';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';

const WORK_TITLE = 'Selected Work';
const WORK_DESCRIPTION =
  'Explore selected CD Sportswear USA projects across product, commerce, local service, learning, and immersive web design.';

const WORK_FAQ = [
  {
    q: 'Are these real client projects?',
    a: 'Five of the six are real client engagements. The sixth is this site — the one you are looking at right now — which we can show in full because it is our own.',
  },
  {
    q: 'Can I see results or metrics from these projects?',
    a: 'Each case study describes what changed for the business in its own words rather than one isolated number, because a single metric rarely tells the real story of a rebuild.',
  },
  {
    q: 'Why only six projects?',
    a: 'This is selected work, not a full list of everything we have shipped — six chosen to show the range: a product build, an e-commerce rebuild, a local-service site, a learning platform, and this one.',
  },
  {
    q: 'My business isn’t in one of these categories. Can you still help?',
    a: 'Yes — these six show the range, not the limit. If your project maps to one of our services, the category above does not rule it out.',
  },
];

export const metadata = {
  title: WORK_TITLE,
  description: WORK_DESCRIPTION,
  alternates: { canonical: '/work' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/work'),
    title: `${WORK_TITLE} | ${SITE.name}`,
    description: WORK_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${WORK_TITLE} | ${SITE.name}`,
    description: WORK_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
};

export default function WorkIndex() {
  return (
    <MarketingShell>
      <section className="work-index mkt-inner" aria-labelledby="work-title">
        <p className="eyebrow"><SectionReveal as="span" direction="left">Selected work</SectionReveal></p>
        <SectionReveal as="h1" id="work-title" className="page-title" direction="left" delay={0.05}>
          Built around the real problem.
        </SectionReveal>
        <SectionReveal as="p" className="work-index-intro" direction="up" delay={0.15}>
          Six projects, each shaped around what the visitor needed to understand, feel, or do next.
        </SectionReveal>

        <SectionReveal as="div" className="work-library-heading" direction="up">
          <p className="eyebrow">Project library</p>
          <h2>Different briefs. One standard of care.</h2>
        </SectionReveal>

        <WorkLibrary projects={PROJECTS} />

        <SectionReveal as="div" className="work-closing-plate" direction="up">
          <div>
            <p className="eyebrow">One standard of care</p>
            <h2>Every project starts with the real problem.</h2>
          </div>
          <Link href="/process" className="btn btn-ghost">
            View the process →
          </Link>
        </SectionReveal>

        <section className="work-faq" aria-labelledby="work-faq-title">
          <SectionReveal as="div" className="work-faq-heading" direction="up">
            <p className="eyebrow">FAQ</p>
            <h2 id="work-faq-title">Common questions</h2>
          </SectionReveal>
          <SectionReveal as="dl" className="mkt-faq" direction="up" delay={0.1}>
            {WORK_FAQ.map((item) => (
              <div className="mkt-faq-item" key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </SectionReveal>
        </section>

        <section className="work-related" aria-label="More about the studio">
          <SectionReveal as="ul" className="mkt-related" direction="up">
            <li>
              <Link href="/services" className="mkt-related-link">
                <span className="mkt-related-title">Services — the eight offers behind the work above.</span>
                <span className="mkt-related-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link href="/reviews" className="mkt-related-link">
                <span className="mkt-related-title">Client reviews — what these and other clients said, published in full.</span>
                <span className="mkt-related-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link href="/about" className="mkt-related-link">
                <span className="mkt-related-title">About — the team that ran these projects.</span>
                <span className="mkt-related-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
          </SectionReveal>
        </section>

        <section className="work-close" aria-labelledby="work-close-title">
          <p className="eyebrow"><SectionReveal as="span" direction="left">Yours could be next</SectionReveal></p>
          <SectionReveal as="h2" id="work-close-title" direction="left" delay={0.05}>
            Every case study started as a brief like yours.
          </SectionReveal>
          <SectionReveal as="p" direction="up" delay={0.1}>
            Send the specifics — the problem, the timing, what success looks like — and you will get a
            straight read before anything else happens.
          </SectionReveal>
          <SectionReveal direction="up" delay={0.15}>
            <Link href="/contact" className="btn btn-solid">
              Start a project <span aria-hidden="true">→</span>
            </Link>
          </SectionReveal>
        </section>

        <BreadcrumbSchema trail={[{ name: 'Work', path: '/work' }]} />
        <FaqSchema faq={WORK_FAQ} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'ItemList',
              name: `${SITE.name} selected work`,
              itemListElement: PROJECTS.map((project, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: project.title,
                url: absoluteUrl(`/work/${project.slug}`),
              })),
            }),
          }}
        />
      </section>
    </MarketingShell>
  );
}
