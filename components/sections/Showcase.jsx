'use client';

import Link from 'next/link';
import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import ProjectVisual from '../ProjectVisual';
import { PROJECTS } from '../../lib/projects';
import { focusSlab, blurSlab } from '../../lib/focusBeacon';

export default function Showcase() {
  const featured = PROJECTS.slice(0, 4);
  return (
    <section className="section showcase" id="work">
      <p className="eyebrow"><Reveal as="span">Selected work</Reveal></p>
      <DecodeText as="h2" text="Work that pulls its weight." className="section-title" />
      <div className="showcase-grid">
        {featured.map((p, i) => (
          <Reveal key={p.slug} className={`showcase-card ${i % 2 ? 'is-offset' : ''}`} delay={i * 0.08}>
            <Link
              href={`/work/${p.slug}`}
              className="showcase-link"
              data-cursor="View case"
              onPointerEnter={() => focusSlab(i)}
              onPointerLeave={blurSlab}
              onFocus={() => focusSlab(i)}
              onBlur={blurSlab}
            >
              <ProjectVisual palette={p.palette} title={p.title} />
              <div className="showcase-meta">
                <h3>{p.title}</h3>
                <p>{p.category} — {p.year}</p>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      <Reveal className="showcase-more">
        <Link href="/work" className="btn btn-outline" data-cursor="All work">
          All projects <span className="btn-arrow">→</span>
        </Link>
      </Reveal>
    </section>
  );
}
