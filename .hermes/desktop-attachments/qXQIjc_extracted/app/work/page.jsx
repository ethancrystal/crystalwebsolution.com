import Link from 'next/link';
import MarketingShell from '../../components/marketing/MarketingShell';
import WorkLibrary from '../../components/marketing/WorkLibrary';
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
        <p className="eyebrow">Selected work</p>
        <h1 id="work-title" className="page-title">Built around the real problem.</h1>
        <p className="work-index-intro">
          Six projects, each shaped around what the visitor needed to understand, feel, or do next.
        </p>

        <div className="work-library-heading">
          <p className="eyebrow">Project library</p>
          <h2>Different briefs. One standard of care.</h2>
        </div>

        <WorkLibrary projects={PROJECTS} />

        <div className="work-closing-plate">
          <div>
            <p className="eyebrow">One standard of care</p>
            <h2>Every project starts with the real problem.</h2>
          </div>
          <Link href="/process" className="btn btn-ghost" data-cursor="Process">
            View the process →
          </Link>
        </div>
      </section>
    </MarketingShell>
  );
}
