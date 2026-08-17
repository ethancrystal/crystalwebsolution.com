import Link from 'next/link';
import ProjectHandoffLink from '../ProjectHandoffLink';
import { PROJECTS } from '../../lib/projects';
import { getMotionRailState } from '../../lib/motionLayout.mjs';

const DEEP_LINK_PROGRESS = 0.32;
const RAIL_STATE = getMotionRailState({ count: PROJECTS.length });

// Matches the existing per-card accents in PROJECTS order.
const RAIL_ACCENTS = ['#c084fc', '#59f3ff', '#ff8dd1', '#ffc64a', '#63d9ff', '#9678ff'];

function RailCard({ project, index }) {
  const position = getMotionRailState({ index, count: PROJECTS.length });

  return (
    <ProjectHandoffLink
      href={`/work/${project.slug}`}
      label={project.title}
      className="motion-card"
      style={{ '--rail-accent': RAIL_ACCENTS[index % RAIL_ACCENTS.length] }}
      aria-label={`${project.title} — view case study`}
      aria-posinset={position.index + 1}
      aria-setsize={position.count}
      data-cursor="View case"
      data-motion-card
      data-motion-index={position.index}
    >
      <span className="motion-card-index" aria-hidden="true">{position.indexLabel}</span>
      <span className="motion-card-line" aria-hidden="true" />
      <span className="motion-card-category">{project.category}</span>
      <span className="motion-card-body">
        <strong className="motion-card-title">{project.title}</strong>
        <span className="motion-card-footer">
          View project <span aria-hidden="true">→</span>
        </span>
      </span>
    </ProjectHandoffLink>
  );
}

export default function Motion() {
  return (
    <section
      className="section motion"
      id="motion"
      data-anchor-progress={DEEP_LINK_PROGRESS}
      aria-labelledby="motion-title"
    >
      <header className="motion-header">
        <div className="motion-header-copy">
          <p className="eyebrow">Named client record</p>
          <h2 id="motion-title">Real names. Real businesses. No invented case studies.</h2>
        </div>
        <div className="motion-header-actions">
          <p className="motion-rail-progress" aria-label={`${RAIL_STATE.countLabel} named client records`}>
            <span aria-hidden="true">{RAIL_STATE.indexLabel}</span>
            <span className="motion-rail-progress-slash" aria-hidden="true">/</span>
            <span>{RAIL_STATE.countLabel}</span>
          </p>
          <Link href="/work" className="motion-link" data-cursor="All projects">
            View all work <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>
      <div className="motion-rail" role="list" aria-label="Selected client case studies">
        {PROJECTS.map((project, index) => (
          <RailCard key={project.slug} project={project} index={index} />
        ))}
      </div>
      <p className="motion-rail-hint" aria-hidden="true">
        Drag or scroll to move through the record <span>↗</span>
      </p>
    </section>
  );
}
