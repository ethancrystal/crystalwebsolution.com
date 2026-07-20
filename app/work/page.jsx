import Link from 'next/link';
import ProjectVisual from '../../components/ProjectVisual';
import { VERIFIED_CLIENTS } from '../../lib/clients';
import { PROJECTS } from '../../lib/projects';
import { SITE } from '../../lib/site';

const WORK_TITLE = 'Web Design Work & Concept Studies';
const WORK_DESCRIPTION =
  'Explore Crystal Web Solution concept studies across web design, brand identity, motion, digital marketing, and AI automation—each framed around the problem, the work, and the result.';

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
        <h1 className="page-title">Every project, one standard.</h1>
        <p className="work-index-intro">Different industries. Different constraints. The same commitment to clear strategy, exact craft, and work that moves the business forward.</p>
        <section className="client-record" aria-labelledby="client-record-title">
          <div>
            <p className="eyebrow">Selected clients</p>
            <h2 id="client-record-title">People and businesses we&apos;ve worked with.</h2>
          </div>
          <ul>
            {VERIFIED_CLIENTS.map((client) => (
              <li key={client.id}>
                <strong>{client.person}</strong>
                <span>
                  {client.role && `${client.role} • `}
                  {client.website ? (
                    <a href={client.website} target="_blank" rel="noreferrer">{client.company} ↗</a>
                  ) : client.company}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <div className="work-library-heading">
          <p className="eyebrow">Concept studies</p>
          <h2>How we think through hard problems.</h2>
        </div>
        <div className="work-list">
          {PROJECTS.map((p) => (
            <Link key={p.slug} href={`/work/${p.slug}`} className="work-row" data-cursor="View case">
              <ProjectVisual palette={p.palette} title={p.title} ratio="16 / 9" />
              <div className="work-row-meta">
                <h2>{p.title}</h2>
                <p>Concept study • {p.category} • {p.year}</p>
                <p className="work-row-summary">{p.summary}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
