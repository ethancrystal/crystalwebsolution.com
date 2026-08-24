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
      className="section portfolio"
      id="portfolio"
      aria-labelledby="portfolio-title"
      data-anchor-progress={DEEP_LINK_PROGRESS}
    >
      <ImageStreamHero
        images={STREAM_IMAGES}
        speed={22}
        axis={52}
        className="portfolio-stream"
      >
        <div className="portfolio-stream-overlay">
          <header className="portfolio-header">
            <div className="portfolio-header-copy">
              <p className="eyebrow">Selected work</p>
              <h2 id="portfolio-title">Work built to move real businesses forward.</h2>
              <p className="portfolio-intro">
                A living archive of products, platforms, and experiences built with intent.
              </p>
            </div>
            <Link href="/work" className="portfolio-link" data-cursor="All projects">
              View all work <span aria-hidden="true">→</span>
            </Link>
          </header>

          <div className="portfolio-index-heading" aria-hidden="true">
            <span>Project archive</span>
            <span>{String(PROJECTS.length).padStart(2, '0')} projects</span>
          </div>

          <ul className="portfolio-stream-index">
            {PROJECTS.map((project, index) => (
              <li key={project.slug}>
                <ProjectHandoffLink
                  href={`/work/${project.slug}`}
                  label={project.title}
                  className="portfolio-stream-item"
                  style={{ '--rail-accent': project.palette[0] }}
                  aria-label={`${project.title} — view case study`}
                  data-cursor="View case study"
                >
                  <span className="portfolio-stream-item-index" aria-hidden="true">
                    0{index + 1}
                  </span>
                  <span className="portfolio-stream-item-copy">
                    <span className="portfolio-stream-item-title">{project.title}</span>
                    <span className="portfolio-stream-item-summary">{project.summary}</span>
                  </span>
                  <span className="portfolio-stream-item-category">{project.category}</span>
                  <span className="portfolio-stream-item-arrow" aria-hidden="true">↗</span>
                </ProjectHandoffLink>
              </li>
            ))}
          </ul>
        </div>
      </ImageStreamHero>
    </section>
  );
}
