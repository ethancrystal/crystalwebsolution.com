import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProjectVisual from '../../../components/ProjectVisual';
import MarketingShell from '../../../components/marketing/MarketingShell';
import SectionReveal from '../../../components/SectionReveal';
import { PROJECTS, getProject } from '../../../lib/projects';
import { SITE } from '../../../lib/site';

export function generateStaticParams() {
  return PROJECTS.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const project = getProject(slug);
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

export default async function CaseStudy({ params }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = PROJECTS.findIndex((item) => item.slug === project.slug);
  const next = PROJECTS[(index + 1) % PROJECTS.length];

  return (
    <MarketingShell>
      <article className="case">
        <Link href="/work" className="case-back" data-cursor="Work">← All projects</Link>
        <SectionReveal as="p" className="eyebrow" direction="left">
          Case study • {project.category}
        </SectionReveal>
        <SectionReveal as="h1" className="page-title" direction="left" delay={0.05}>
          {project.title}
        </SectionReveal>
        <SectionReveal as="p" className="case-summary" direction="up" delay={0.1}>
          {project.summary}
        </SectionReveal>
        <SectionReveal as="ul" className="case-services" aria-label="Services" direction="up" delay={0.15}>
          {project.services.map((service) => <li key={service}>{service}</li>)}
        </SectionReveal>
        <SectionReveal direction="up" delay={0.1}>
          <ProjectVisual palette={project.palette} title={project.title} ratio="21 / 9" />
        </SectionReveal>
        <SectionReveal as="div" className="case-body" direction="up" delay={0.1}>
          {project.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </SectionReveal>
        <Link href={`/work/${next.slug}`} className="case-next" data-cursor="Next case">
          <span className="eyebrow">Next case study</span>
          <span className="case-next-title">{next.title} →</span>
        </Link>
      </article>
    </MarketingShell>
  );
}
