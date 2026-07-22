import Link from 'next/link';
import ProjectVisual from '../../components/ProjectVisual';
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
    <div className="subpage">
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home">
          <span className="nav-logo-monogram" aria-hidden="true">CWS</span>
          <span className="nav-logo-name">{SITE.name}</span>
        </Link>
        <Link href="/#contact" className="btn btn-ghost" data-cursor="Say hi">let&apos;s talk</Link>
      </header>
      <main className="work-index">
        <p className="eyebrow">Selected work</p>
        <h1 className="page-title">Built around the real problem.</h1>
        <p className="work-index-intro">Six projects, each shaped around what the visitor needed to understand, feel, or do next.</p>
        <div className="work-library-heading">
          <p className="eyebrow">{PROJECTS.length} case studies</p>
          <h2>Different briefs. One standard of care.</h2>
        </div>
        <div className="work-list">
          {PROJECTS.map((project) => (
            <article key={project.slug} id={project.slug} className="work-row client-work-row">
              <Link href={`/work/${project.slug}`} data-cursor="View case" aria-label={`${project.title} — view case study`}>
                <ProjectVisual palette={project.palette} title={project.title} ratio="16 / 9" />
              </Link>
              <div className="work-row-meta">
                <h2>{project.title}</h2>
                <p>{project.category} • {project.services.join(' • ')}</p>
                <p className="work-row-summary">{project.summary}</p>
                <p className="client-work-links">
                  <Link href={`/work/${project.slug}`} data-cursor="View case">View the case →</Link>
                </p>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
