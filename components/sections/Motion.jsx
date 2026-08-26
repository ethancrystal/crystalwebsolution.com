'use client';

import Link from 'next/link';
import ProjectHandoffLink from '../ProjectHandoffLink';
import ImageMarqueeRows from '../ui/image-marquee-rows';
import { PROJECTS } from '../../lib/projects';
const DEEP_LINK_PROGRESS = 0.32;

// The marquee rows are decorative (aria-hidden inside the component), so all
// real navigation lives in the list below. The text list remains the
// accessible source of navigation.
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
      <div className="motion-stream">
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

        <ImageMarqueeRows images={STREAM_IMAGES} className="motion-marquee" />
      </div>
    </section>
  );
}
