import Link from 'next/link';
import ProjectVisual from '../../components/ProjectVisual';
import { PROJECTS } from '../../lib/projects';
import { SITE } from '../../lib/site';

export const metadata = {
  title: 'Web Design Work & Case Studies',
  description:
    'Custom web design case studies from Crystal Web Solution — real projects across finance, retail, healthcare, and logistics, with the results to show for it.',
  alternates: { canonical: '/work' },
};

export default function WorkIndex() {
  return (
    <div className="subpage">
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home">
          <span className="nav-logo-mark">◆</span>
          <span className="nav-logo-text">{SITE.name}</span>
        </Link>
        <Link href="/#contact" className="btn btn-ghost" data-cursor="Say hi">let&apos;s talk</Link>
      </header>
      <main className="work-index">
        <p className="eyebrow">All work</p>
        <h1 className="page-title">Every project, one standard.</h1>
        <div className="work-list">
          {PROJECTS.map((p) => (
            <Link key={p.slug} href={`/work/${p.slug}`} className="work-row" data-cursor="View case">
              <ProjectVisual palette={p.palette} title={p.title} ratio="16 / 9" />
              <div className="work-row-meta">
                <h2>{p.title}</h2>
                <p>{p.category} — {p.year}</p>
                <p className="work-row-summary">{p.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
