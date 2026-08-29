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
// Animated media for the duplicated (second-half) tiles in the marquee.
// WebM is preferred for smaller file size and better quality; GIF is used
// only where no WebM is available. These replace the repeated copies of
// the original client screenshots so each tile shows unique content.
const REPLACEMENT_IMAGES = [
  '/d/landon-norris-recording.webm',
  '/d/02-messenger.gif',
  '/d/03-igloo-inc.webm',
  '/d/04-dont-board-me.webm',
  '/d/05-opal-tadpole.webm',
  '/d/06-lusion.webm',
  '/d/07-noomo-agency.webm',
  '/d/08-mana-yerba-mate.webm',
  '/d/09-kpr.webm',
  '/d/10-other-side-of-truth.webm',
  '/d/11-persepolis.webm',
  '/d/12-pangram-pangram.webm',
  '/d/13-star-atlas.webm',
];
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

<WorkMarquee images={CLIENT_TILE_IMAGES} replacementImages={REPLACEMENT_IMAGES} className="motion-marquee" />

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
