'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import ProjectVisual from '../ProjectVisual';
import SectionReveal from '../SectionReveal';
import CountUp from '../CountUp';

const BEAT_LABELS = ['01 — The problem', '02 — Our approach', '03 — The result'];

function toNumericValue(value) {
  const match = /-?\d+(\.\d+)?/.exec(String(value));
  return match ? Number(match[0]) : null;
}

function ResultFigure({ result }) {
  const numeric = toNumericValue(result.value);
  const prefix = numeric === null ? '' : String(result.value).slice(0, String(result.value).indexOf(String(numeric)));
  const suffix = numeric === null ? '' : String(result.value).slice(
    String(result.value).indexOf(String(numeric)) + String(numeric).length,
  );

  return (
    <div className="results-figure">
      {numeric === null ? (
        <span className="results-figure-value">{result.value}</span>
      ) : (
        <CountUp
          as="span"
          className="results-figure-value"
          value={numeric}
          prefix={prefix}
          suffix={suffix}
        />
      )}
      <p className="results-figure-label">{result.label}</p>
    </div>
  );
}

export default function CaseStudyClient({ project, prev, next }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.target instanceof HTMLElement) {
        const tag = event.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target.isContentEditable) return;
      }
      if (event.key === 'ArrowLeft') window.location.href = `/work/${prev.slug}`;
      if (event.key === 'ArrowRight') window.location.href = `/work/${next.slug}`;
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [prev.slug, next.slug]);

  const beats = project.body.length > 1
    ? project.body.slice(0, 3)
    : [project.body[0] || ''];
  const beatLabels = project.body.length > 1 ? BEAT_LABELS : ['The work'];

  return (
    <>
      <SectionReveal as="div" className="case-hero" direction="up">
        <p className="eyebrow">Case study • {project.category}</p>
        <h1 className="page-title">{project.title}</h1>
        <p className="case-summary">{project.summary}</p>
        <ul className="case-services" aria-label="Services">
          {project.services.map((service) => <li key={service}>{service}</li>)}
        </ul>
        <a href="/#contact" className="btn btn-ghost" data-cursor="Say hi">Start a project</a>
      </SectionReveal>

      <div className="case-hero-visual">
        <ProjectVisual palette={project.palette} title={project.title} ratio="21 / 9" />
      </div>

      {(project.client || project.year) && (
        <SectionReveal as="dl" className="case-meta-strip" direction="up" start="top 90%">
          {project.client && (
            <div><dt>Client</dt><dd>{project.client}</dd></div>
          )}
          {project.year && (
            <div><dt>Year</dt><dd>{project.year}</dd></div>
          )}
          <div><dt>Scope</dt><dd>{project.services.join(', ')}</dd></div>
          {project.results?.[0] && (
            <div><dt>Result</dt><dd>{project.results[0].value} {project.results[0].label}</dd></div>
          )}
        </SectionReveal>
      )}

      <div className="case-beats">
        {beats.map((paragraph, i) => (
          <SectionReveal
            key={beatLabels[i]}
            as="div"
            className={`case-beat ${i === 1 ? 'is-offset' : ''}`}
            direction={i === 1 ? 'right' : 'left'}
            start="top 92%"
          >
            <p className="eyebrow">{beatLabels[i]}</p>
            <p>{paragraph}</p>
          </SectionReveal>
        ))}
      </div>

      {project.results?.length > 0 && (
        <SectionReveal as="div" className="results-band" direction="up" start="top 90%">
          {project.results.map((result) => (
            <ResultFigure key={result.label} result={result} />
          ))}
        </SectionReveal>
      )}

      <div className="case-gallery">
        {[project.palette, [...project.palette].reverse()].map((palette, i) => (
          <SectionReveal
            key={i}
            as="div"
            className={`showcase-card case-gallery-tile ${i === 1 ? 'is-offset' : ''}`}
            direction="up"
            start="top 92%"
            delay={i * 0.08}
          >
            <ProjectVisual palette={palette} title={project.title} ratio="4 / 3" />
          </SectionReveal>
        ))}
      </div>

      <div className="case-rail">
        <Link href={`/work/${prev.slug}`} className="case-rail-cell case-rail-prev" data-cursor="Prev case">
          <span className="eyebrow">← Previous</span>
          <span className="case-rail-title">{prev.title}</span>
        </Link>
        <Link href={`/work/${next.slug}`} className="case-rail-cell case-rail-next" data-cursor="Next case">
          <span className="eyebrow">Next →</span>
          <span className="case-rail-title">{next.title}</span>
        </Link>
      </div>
    </>
  );
}
