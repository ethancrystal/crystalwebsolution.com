'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import ProjectVisual from '../ProjectVisual';
import SectionReveal from '../SectionReveal';
import CountUp from '../CountUp';
import { EASE_SETTLE } from '../../lib/easing';

gsap.registerPlugin(ScrollTrigger);

function WorkRow({ project }) {
  const rowRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const isLong = project.summary.length > 140;

  return (
    <SectionReveal
      as="article"
      id={project.slug}
      className="work-row client-work-row"
      start="top 82%"
    >
      <div ref={rowRef}>
        <Link href={`/work/${project.slug}`} data-cursor="View case" aria-label={`${project.title} — view case study`}>
          <ProjectVisual palette={project.palette} title={project.title} ratio="16 / 9" />
        </Link>
        <div className="work-row-meta">
          <h2>{project.title}</h2>
          <p>{project.category} • {project.services.join(' • ')}</p>
          <p className={`work-row-summary ${expanded ? 'is-expanded' : ''}`}>{project.summary}</p>
          {isLong && (
            <button
              type="button"
              className="work-row-more"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
          <p className="client-work-links">
            <Link href={`/work/${project.slug}`} data-cursor="View case">View the case →</Link>
          </p>
        </div>
      </div>
    </SectionReveal>
  );
}

export default function WorkIndexClient({ projects }) {
  const categories = useMemo(
    () => ['All', ...Array.from(new Set(projects.map((p) => p.category)))],
    [projects],
  );
  const [active, setActive] = useState('All');
  const listRef = useRef(null);

  const filtered = active === 'All' ? projects : projects.filter((p) => p.category === active);

  const changeFilter = (category) => {
    if (category === active) return;
    const el = listRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!el || reduced) {
      setActive(category);
      return;
    }
    gsap.to(el, {
      opacity: 0,
      y: 8,
      duration: 0.2,
      ease: EASE_SETTLE,
      onComplete: () => {
        setActive(category);
        gsap.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25, ease: EASE_SETTLE });
      },
    });
  };

  return (
    <>
      <div className="work-library-heading">
        <div className="work-library-heading-text">
          <p className="eyebrow">
            <CountUp value={projects.length} /> case studies
          </p>
          <h2>Different briefs. One standard of care.</h2>
        </div>
        <div className="work-filter-row" role="group" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={`work-filter-chip ${active === category ? 'is-active' : ''}`}
              onClick={() => changeFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      <div className="work-list" ref={listRef}>
        {filtered.map((project) => (
          <WorkRow key={project.slug} project={project} />
        ))}
      </div>
      <SectionReveal as="div" className="work-closing-plate" direction="up" start="top 90%">
        <p>Every project, one standard of care.</p>
        <Link href="/#approach" className="btn-arrow-link" data-cursor="Go">
          View the process <span aria-hidden="true">→</span>
        </Link>
      </SectionReveal>
    </>
  );
}
