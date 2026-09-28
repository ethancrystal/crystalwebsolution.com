'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import ProjectVisual from '../ProjectVisual';
import {
  DURATION_FAST,
  DURATION_NORMAL,
  EASE_SETTLE,
  STAGGER_ROW,
} from '../../lib/easing';

const FILTERS = [
  { id: 'all', label: 'ALL', matches: () => true },
  {
    id: 'web-app',
    label: 'WEB & APP',
    matches: (project) => (
      project.category === 'Web & app development'
      || project.category === 'Web design'
    ),
  },
  {
    id: 'commerce',
    label: 'E-COMMERCE',
    matches: (project) => project.category === 'E-commerce',
  },
  {
    id: 'immersive',
    label: 'IMMERSIVE',
    matches: (project) => project.category === 'Immersive web experience',
  },
];

export default function WorkLibrary({ projects }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(() => new Set());
  const root = useRef(null);
  const countRef = useRef(null);
  const previousCount = useRef(projects.length);

  const visibleProjects = useMemo(() => {
    const selected = FILTERS.find((item) => item.id === filter) || FILTERS[0];
    return projects.filter(selected.matches);
  }, [filter, projects]);

  useLayoutEffect(() => {
    const scope = root.current;
    if (!scope) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rows = scope.querySelectorAll('.work-row');
    const context = gsap.context(() => {
      if (reduced) {
        gsap.set(rows, { autoAlpha: 1, y: 0 });
        if (countRef.current) countRef.current.textContent = String(visibleProjects.length);
        return;
      }

      gsap.fromTo(
        rows,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: DURATION_NORMAL,
          stagger: STAGGER_ROW,
          ease: EASE_SETTLE,
        },
      );

      if (countRef.current) {
        const model = { value: previousCount.current };
        gsap.to(model, {
          value: visibleProjects.length,
          duration: DURATION_FAST * 4,
          ease: 'power2.out',
          onUpdate: () => {
            countRef.current.textContent = String(Math.round(model.value));
          },
        });
      }
    }, scope);

    previousCount.current = visibleProjects.length;
    return () => context.revert();
  }, [visibleProjects]);

  const toggleSummary = (slug) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  };

  return (
    <div ref={root}>
      <div className="work-library-controls">
        <p className="eyebrow work-library-count">
          <span ref={countRef}>{visibleProjects.length}</span> case studies
        </p>
        <div className="work-filter-chips" role="group" aria-label="Filter projects">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`work-filter-chip ${filter === item.id ? 'is-active' : ''}`}
              aria-pressed={filter === item.id}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="work-list" aria-live="polite">
        {visibleProjects.map((project) => {
          const isExpanded = expanded.has(project.slug);
          return (
            <article key={project.slug} id={project.slug} className="work-row client-work-row">
              <Link
                href={`/work/${project.slug}`}
                aria-label={`${project.title} — view case study`}
                className="work-row-visual"
              >
                <ProjectVisual palette={project.palette} title={project.title} ratio="16 / 9" />
              </Link>
              <div className="work-row-meta">
                <h2>{project.title}</h2>
                <p>{project.category} • {project.services.join(' • ')}</p>
                <p className={`work-row-summary ${isExpanded ? 'is-expanded' : ''}`}>
                  {project.summary}
                </p>
                <button
                  type="button"
                  className="work-summary-toggle"
                  aria-expanded={isExpanded}
                  onClick={() => toggleSummary(project.slug)}
                >
                  {isExpanded ? 'Show less' : 'Read more'}
                </button>
                <p className="client-work-links">
                  <Link href={`/work/${project.slug}`}>
                    View the case →
                  </Link>
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
