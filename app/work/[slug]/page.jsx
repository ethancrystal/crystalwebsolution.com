import { notFound } from 'next/navigation';
import SubpageShell from '../../../components/SubpageShell';
import CaseStudyClient from '../../../components/work/CaseStudyClient';
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
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];

  return (
    <SubpageShell>
      <div className="case">
        <CaseStudyClient project={project} prev={prev} next={next} />
      </div>
    </SubpageShell>
  );
}
