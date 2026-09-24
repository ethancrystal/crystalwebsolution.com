import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProjectVisual from '../../../components/ProjectVisual';
import MarketingShell from '../../../components/marketing/MarketingShell';
import CaseGallery from '../../../components/marketing/CaseGallery';
import CaseNavRail from '../../../components/marketing/CaseNavRail';
import SectionReveal from '../../../components/SectionReveal';
import BreadcrumbSchema from '../../../components/marketing/BreadcrumbSchema';
import { PROJECTS, getProject } from '../../../lib/projects';
import { getServicePageBySlug } from '../../../lib/servicePages.mjs';
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

  // Keep the rendered <title> at or under 65 chars (Ubersuggest flags longer ones
  // as truncated in results). When "<title> — <category> | <brand>" is too long,
  // fall back to the shorter "<title> — Case Study" stem so the brand survives.
  const MAX_TITLE = 65;
  const categoryStem = `${project.title} — ${project.category}`;
  const titleStem = `${categoryStem} | ${SITE.name}`.length > MAX_TITLE
    ? `${project.title} — Case Study`
    : categoryStem;
  const brandedTitle = `${titleStem} | ${SITE.name}`;
  const titleRepeatsBrand = project.title === SITE.name;

  return {
    title: titleRepeatsBrand ? { absolute: titleStem } : titleStem,
    description,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      type: 'article',
      title: titleRepeatsBrand ? titleStem : brandedTitle,
      description,
      url: absoluteUrl(`/work/${project.slug}`),
      images: [{ url: SOCIAL_IMAGE_PATH }],
    },
    twitter: {
      card: 'summary_large_image',
      title: titleRepeatsBrand ? titleStem : brandedTitle,
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
  const relatedServices = (project.relatedServiceSlugs || [])
    .map((slug) => getServicePageBySlug(slug))
    .filter(Boolean);

  return (
    <MarketingShell>
      <article className="case mkt-inner">
        <Link href="/work" className="case-back">← All projects</Link>
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
        {relatedServices.map((service) => (
          <Link key={service.slug} href={`/services/${service.slug}`} className="case-next">
            <span className="eyebrow">Related service</span>
            <span className="case-next-title">{service.title} →</span>
          </Link>
        ))}
        <Link href="/contact" className="case-next">
          <span className="eyebrow">Start here</span>
          <span className="case-next-title">Send a brief →</span>
        </Link>
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
