'use client';

import Link from 'next/link';
import ProjectHandoffLink from '../ProjectHandoffLink';
import ImageStreamHero from '../ui/image-stream-hero';
import { PROJECTS } from '../../lib/projects';
const DEEP_LINK_PROGRESS = 0.32;

// The corridor is decorative (aria-hidden inside the component), so all real
// navigation lives in the overlay list below. Each stream card uses a supplied
// project image; the text list remains the accessible source of navigation.
const STREAM_IMAGES = [
  { src: '/projects/cws-live-izanami.webp' },
  { src: '/projects/cws-live-oimachi.webp' },
  { src: '/projects/cws-live-ciao-energy.webp' },
  { src: '/projects/cws-live-inspiring.webp' },
  { src: '/projects/cws-innovation-studio.webp' },
  { src: '/projects/cws-izanami.webp' },
];

export default function Motion() {
  return (
    <section
      className="section motion"
      id="motion"
      data-anchor-progress={DEEP_LINK_PROGRESS}
    >
      {/* cards must match images.length: ImageStreamHero cycles images via
          i % images.length, so any cards count that isn't a multiple of the
          image count puts two duplicate photos in the same visible pass. */}
      <ImageStreamHero
        images={STREAM_IMAGES}
        cards={STREAM_IMAGES.length}
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
