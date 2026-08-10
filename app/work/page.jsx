import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import WorkLibrary from '../../components/marketing/WorkLibrary';
import SectionReveal from '../../components/SectionReveal';
import { PROJECTS } from '../../lib/projects';
import { SITE } from '../../lib/site';

const WORK_TITLE = 'Selected Work';
const WORK_DESCRIPTION =
  'Explore selected Crystal Web Solution projects across product, commerce, local service, learning, and immersive web design.';

export const metadata = {
  title: WORK_TITLE,
  description: WORK_DESCRIPTION,
  alternates: { canonical: '/work' },
  openGraph: {
    type: 'website',
    title: `${WORK_TITLE} | ${SITE.name}`,
    description: WORK_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${WORK_TITLE} | ${SITE.name}`,
    description: WORK_DESCRIPTION,
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
          <Link href="/process" className="btn btn-ghost" data-cursor="Process">
            View the process →
          </Link>
        </SectionReveal>
      </section>
    </MarketingShell>
  );
}
