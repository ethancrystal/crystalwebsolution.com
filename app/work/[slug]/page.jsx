import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProjectVisual from '../../../components/ProjectVisual';
import MarketingShell from '../../../components/marketing/MarketingShell';
import CaseGallery from '../../../components/marketing/CaseGallery';
import CaseNavRail from '../../../components/marketing/CaseNavRail';
import SectionReveal from '../../../components/SectionReveal';
import BreadcrumbSchema from '../../../components/marketing/BreadcrumbSchema';
import { PROJECTS, getProject } from '../../../lib/projects';
import { SITE } from '../../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../../lib/seo.mjs';

// Splits a project's body[] into the narrative beats the case-study layout
// reads: THE PROBLEM (opening paragraph), OUR APPROACH (the middle of the
// story), THE RESULT (closing paragraph). Content is progressive — a project
// with fewer than 3 paragraphs still renders correctly as a single beat,
// no data migration required.
function beatsFor(body) {
  if (body.length < 3) {
    return [{ id: 'work', eyebrow: 'THE WORK', direction: 'up', paragraphs: body }];
  }
  return [
    { id: 'problem', eyebrow: '01 — THE PROBLEM', direction: 'left', paragraphs: body.slice(0, 1) },
    { id: 'approach', eyebrow: '02 — OUR APPROACH', direction: 'right', paragraphs: body.slice(1, -1) },
    { id: 'result', eyebrow: '03 — THE RESULT', direction: 'left', paragraphs: body.slice(-1) },
  ];
}

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
      url: absoluteUrl(`/work/${project.slug}`),
      images: [{ url: SOCIAL_IMAGE_PATH }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.title} — ${project.category} | ${SITE.name}`,
      description,
      images: [{ url: SOCIAL_IMAGE_PATH }],
    },
  };
}

export default async function CaseStudy({ params }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const index = PROJECTS.findIndex((item) => item.slug === project.slug);
  const prev = PROJECTS[(index - 1 + PROJECTS.length) % PROJECTS.length];
  const next = PROJECTS[(index + 1) % PROJECTS.length];
  const beats = beatsFor(project.body);

  return (
    <MarketingShell>
      <article className="case">
        <Link href="/work" className="case-back" data-cursor="Work">← All projects</Link>
        <p className="eyebrow">
          <SectionReveal as="span" direction="left">Case study • {project.category}</SectionReveal>
        </p>
        <SectionReveal as="h1" className="page-title" direction="left" delay={0.05}>
          {project.title}
        </SectionReveal>
        <SectionReveal as="p" className="case-summary" direction="up" delay={0.1}>
          {project.summary}
        </SectionReveal>
        <SectionReveal as="ul" className="case-services" aria-label="Services" direction="up" delay={0.15}>
          {project.services.map((service) => <li key={service}>{service}</li>)}
        </SectionReveal>

        <SectionReveal direction="up" delay={0.2}>
          <ProjectVisual palette={project.palette} title={project.title} ratio="21 / 9" />
        </SectionReveal>

        <div className="case-beats">
          {beats.map((beat) => (
            <SectionReveal
              key={beat.id}
              as="section"
              direction={beat.direction}
              className={`case-beat${beat.direction === 'right' ? ' is-offset' : ''}`}
            >
              <p className="eyebrow case-beat-eyebrow">{beat.eyebrow}</p>
              {beat.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </SectionReveal>
          ))}
        </div>

        <SectionReveal as="div" direction="up" className="case-gallery-wrap">
          <p className="eyebrow">The look</p>
          <CaseGallery palette={project.palette} title={project.title} />
        </SectionReveal>

        <CaseNavRail prev={prev} next={next} />
      </article>
      <BreadcrumbSchema
        trail={[
          { name: 'Work', path: '/work' },
          { name: project.title, path: `/work/${project.slug}` },
        ]}
      />
      {/* CreativeWork ties each case study back to the Organization node in
          app/layout.jsx, so the portfolio reads as authored work rather than
          unattributed pages. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            '@id': `${absoluteUrl(`/work/${project.slug}`)}#case-study`,
            name: project.title,
            headline: `${project.title} — ${project.category}`,
            description: project.summary,
            url: absoluteUrl(`/work/${project.slug}`),
            genre: project.category,
            keywords: project.services.join(', '),
            inLanguage: 'en',
            creator: { '@id': `${absoluteUrl('/')}#organization` },
            provider: { '@id': `${absoluteUrl('/')}#organization` },
          }),
        }}
      />
    </MarketingShell>
  );
}
