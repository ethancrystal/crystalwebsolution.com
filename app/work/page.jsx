import Link from 'next/link';
import ProjectVisual from '../../components/ProjectVisual';
import { VERIFIED_CLIENTS } from '../../lib/clients';
import { SITE } from '../../lib/site';

const WORK_TITLE = 'Verified Client Record';
const WORK_DESCRIPTION =
  'Review the original Crystal Web Solution clients identified directly for this site, with supplied review evidence where available.';

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
    card: 'summary',
    title: `${WORK_TITLE} | ${SITE.name}`,
    description: WORK_DESCRIPTION,
  },
};

export default function WorkIndex() {
  return (
    <div className="subpage">
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home" aria-label="Crystal Web Solution home">
          <span className="nav-logo-art" aria-hidden="true">
            <img
              className="nav-logo-art-full"
              src="/crystal-web-solution-logo.svg"
              alt=""
              width="1616"
              height="243"
            />
          </span>
        </Link>
        <Link href="/#contact" className="btn btn-ghost" data-cursor="Say hi">let&apos;s talk</Link>
      </header>
      <main className="work-index">
        <p className="eyebrow">Original client record</p>
        <h1 className="page-title">Client work we can name.</h1>
        <p className="work-index-intro">This page contains only the three original client relationships supplied directly for Crystal Web Solution. It does not attach invented scopes, outcomes, awards, or performance numbers to their names.</p>
        <div className="work-library-heading">
          <p className="eyebrow">Three supplied relationships</p>
          <h2>People, businesses, and the evidence on record.</h2>
        </div>
        <div className="work-list">
          {VERIFIED_CLIENTS.map((client) => (
            <article key={client.id} id={client.id} className="work-row client-work-row">
              <ProjectVisual palette={client.palette} title={client.company} ratio="16 / 9" />
              <div className="work-row-meta">
                <h2>{client.company}</h2>
                <p>{client.recordLabel} • {client.person}{client.role ? ` • ${client.role}` : ''}</p>
                <p className="work-row-summary">{client.summary}</p>
                <p className="client-work-links">
                  {client.website && (
                    <a href={client.website} target="_blank" rel="noreferrer">Visit {client.websiteLabel} ↗</a>
                  )}
                  {client.reviewId && (
                    <Link href={`/reviews#${client.reviewId}`}>Read the supplied review →</Link>
                  )}
                </p>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
