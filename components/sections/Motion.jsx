'use client';

import Link from 'next/link';
import ProjectHandoffLink from '../ProjectHandoffLink';
import WorkMarquee from '../ui/work-marquee';
import { PROJECTS } from '../../lib/projects';
import { CLIENT_TILE_IMAGES } from '../../lib/clientTileImages.mjs';
const DEEP_LINK_PROGRESS = 0.32;

// The marquee is decorative (aria-hidden inside WorkMarquee), so all real
// navigation lives in the list below. These are real CD Sportswear USA
// client deployments, not stock screenshots — matching the section's own
// claim that nothing here is an invented case study.
export default function Motion() {
  return (
    <section
      className="section motion"
      id="motion"
      data-anchor-progress={DEEP_LINK_PROGRESS}
    >
      <header className="motion-header">
        <div>
          <p className="eyebrow">Named client record</p>
          <h2>Real names. Real businesses. No invented case studies.</h2>
        </div>
        <Link href="/work" className="motion-link" data-cursor="All projects">
          View all work <span aria-hidden="true">→</span>
        </Link>
      </header>

      <WorkMarquee images={CLIENT_TILE_IMAGES} className="motion-marquee" />

      <ul className="motion-stream-index">
        {PROJECTS.map((project, index) => (
          <li key={project.slug}>
            <ProjectHandoffLink
              href={`/work/${project.slug}`}
              label={project.title}
              className="motion-stream-item"
              style={{ '--rail-accent': project.palette[0] }}
              aria-label={`${project.title} — view case study`}
              data-cursor="View case"
            >
              <span className="motion-stream-item-index" aria-hidden="true">
                0{index + 1}
              </span>
              <span className="motion-stream-item-title">{project.title}</span>
              <span className="motion-stream-item-category">{project.category}</span>
            </ProjectHandoffLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
