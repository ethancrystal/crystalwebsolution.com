import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProjectVisual from '../../../components/ProjectVisual';
import { PROJECTS, getProject } from '../../../lib/projects';
import { SITE } from '../../../lib/site';

export function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }) {
  const p = getProject(params.slug);
  if (!p) return { title: SITE.name };
  const description =
    p.summary.length > 157 ? `${p.summary.slice(0, 157).trimEnd()}…` : p.summary;
  return {
    title: `${p.title} — ${p.category} Concept Study`,
    description,
    alternates: { canonical: `/work/${p.slug}` },
    openGraph: {
      type: 'article',
      title: `${p.title} — ${p.category} Concept Study | ${SITE.name}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${p.title} — ${p.category} Concept Study | ${SITE.name}`,
      description,
    },
  };
}

export default function CaseStudy({ params }) {
  const p = getProject(params.slug);
  if (!p) notFound();

  const idx = PROJECTS.findIndex((x) => x.slug === p.slug);
  const next = PROJECTS[(idx + 1) % PROJECTS.length];

  return (
    <div className="subpage">
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home">
          <span className="nav-logo-monogram" aria-hidden="true">CWS</span>
          <span className="nav-logo-name">{SITE.name}</span>
        </Link>
        <Link href="/work" className="btn btn-ghost" data-cursor="Back">all work</Link>
      </header>
      <main className="case">
        <p className="eyebrow">Concept study • {p.category} • {p.year}</p>
        <h1 className="page-title">{p.title}</h1>
        <p className="case-summary">{p.summary}</p>
        <ul className="case-services">
          {p.services.map((s) => <li key={s}>{s}</li>)}
        </ul>
        <ProjectVisual palette={p.palette} title={p.title} ratio="21 / 9" />
        <div className="case-body">
          {p.body.map((para, i) => <p key={i}>{para}</p>)}
        </div>
        <Link href={`/work/${next.slug}`} className="case-next" data-cursor="Next">
          <span className="eyebrow">Next concept study</span>
          <span className="case-next-title">{next.title} →</span>
        </Link>
      </main>
    </div>
  );
}
