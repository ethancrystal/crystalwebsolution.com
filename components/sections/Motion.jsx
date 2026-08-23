'use client';

import Link from 'next/link';
import ProjectHandoffLink from '../ProjectHandoffLink';
import ImageStreamHero from '../ui/image-stream-hero';
import { PROJECTS } from '../../lib/projects';
import { paletteArt } from '../../lib/proceduralArt';

const DEEP_LINK_PROGRESS = 0.32;

// The corridor is decorative (aria-hidden inside the component), so all real
// navigation lives in the overlay list below. Each stream card is procedural
// art generated from the matching project's palette — no binary media.
const STREAM_IMAGES = PROJECTS.flatMap((project) => [
  { src: paletteArt(project.palette, project.slug) },
  { src: paletteArt([...project.palette].reverse(), `${project.slug}-alt`) },
]);

export default function Motion() {
  return (
    <section
      className="section motion"
      id="motion"
      data-anchor-progress={DEEP_LINK_PROGRESS}
    >
      <ImageStreamHero
        images={STREAM_IMAGES}
        speed={22}
        axis={52}
        className="motion-stream"
      >
        <div className="motion-stream-overlay">
          <header className="motion-header">
            <div>
              <p className="eyebrow">Named client record</p>
              <h2>Real names. Real businesses. No invented case studies.</h2>
            </div>
            <Link href="/work" className="motion-link" data-cursor="All projects">
              View all work <span aria-hidden="true">→</span>
            </Link>
          </header>

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
        </div>
      </ImageStreamHero>
    </section>
  );
}
