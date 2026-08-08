import SubpageShell from '../../components/SubpageShell';
import WorkIndexClient from '../../components/work/WorkIndexClient';
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
    <SubpageShell>
      <div className="work-index">
        <p className="eyebrow">Selected work</p>
        <h1 className="page-title">Built around the real problem.</h1>
        <p className="work-index-intro">Six projects, each shaped around what the visitor needed to understand, feel, or do next.</p>
        <WorkIndexClient projects={PROJECTS} />
      </div>
    </SubpageShell>
  );
}
