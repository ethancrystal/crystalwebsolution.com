import Link from 'next/link';
import BorderGlow, { hexToHslTriplet } from '../BorderGlow';
import { PROJECTS } from '../../lib/projects';

const DEEP_LINK_PROGRESS = 0.32;

// Matches the Claude Design's per-card accent, in PROJECTS order.
const RAIL_ACCENTS = ['#c084fc', '#59f3ff', '#ff8dd1', '#ffc64a', '#63d9ff', '#9678ff'];

function RailCard({ project, index }) {
  const accent = RAIL_ACCENTS[index % RAIL_ACCENTS.length];
  return (
    <BorderGlow
      className="motion-card-glow"
      backgroundColor="transparent"
      borderRadius={14}
      glowRadius={24}
      colors={[accent, accent, accent]}
      glowColor={hexToHslTriplet(accent)}
    >
      <Link
        href={`/work/${project.slug}`}
        className="motion-card"
        style={{ '--rail-accent': accent }}
        aria-label={`${project.title} — view case study`}
        data-cursor="View case"
      >
        <span className="motion-card-index" aria-hidden="true">0{index + 1}</span>
        <span className="motion-card-category">{project.category}</span>
        <span className="motion-card-body">
          <strong className="motion-card-title">{project.title}</strong>
          <span className="motion-card-footer">
            View project <span aria-hidden="true">→</span>
          </span>
        </span>
      </Link>
    </BorderGlow>
  );
}

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
      <div className="motion-rail">
        {PROJECTS.map((project, index) => (
          <RailCard key={project.slug} project={project} index={index} />
        ))}
      </div>
    </section>
  );
}
