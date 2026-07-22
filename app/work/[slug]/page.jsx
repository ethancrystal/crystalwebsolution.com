import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProjectVisual from '../../../components/ProjectVisual';
import { PROJECTS, getProject } from '../../../lib/projects';
import { SITE } from '../../../lib/site';

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export function generateMetadata({ params }) {
  const project = getProject(params.slug);
  if (!project) return { title: SITE.name };

  const description = project.summary.length > 157
    ? `${project.summary.slice(0, 157).trimEnd()}…`
    : project.summary;

  return {
    title: `${project.title} — ${project.category}`,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      type: 'article',
      title: `${project.title} — ${project.category} | ${SITE.name}`,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} — ${project.category} | ${SITE.name}`,
      description,
    },
  };
}

export default function CaseStudy({ params }) {
  const project = getProject(params.slug);
  if (!project) notFound();

  const index = PROJECTS.findIndex((item) => item.slug === project.slug);
  const next = PROJECTS[(index + 1) % PROJECTS.length];

  return (
    <div className="subpage">
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home">
          <span className="nav-logo-monogram" aria-hidden="true">CWS</span>
          <span className="nav-logo-name">{SITE.name}</span>
        </Link>
        <Link href="/work" className="btn btn-ghost" data-cursor="Back">All projects</Link>
      </header>
      <main className="case">
        <p className="eyebrow">Case study • {project.category}</p>
        <h1 className="page-title">{project.title}</h1>
        <p className="case-summary">{project.summary}</p>
        <ul className="case-services" aria-label="Services">
          {project.services.map((service) => <li key={service}>{service}</li>)}
        </ul>
        <ProjectVisual palette={project.palette} title={project.title} ratio="21 / 9" />
        <div className="case-body">
          {project.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <Link href={`/work/${next.slug}`} className="case-next" data-cursor="Next case">
          <span className="eyebrow">Next case study</span>
          <span className="case-next-title">{next.title} →</span>
        </Link>
      </main>
    </div>
  );
}
