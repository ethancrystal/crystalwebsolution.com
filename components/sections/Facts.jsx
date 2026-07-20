'use client';

import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import { STAGGER_ROW } from '../../lib/easing';

const FACTS = [
  { num: '140+', label: 'projects shipped', note: 'Across web, brand, 3D, motion and AI systems — eight disciplines, one standard.' },
  { num: '088%', label: 'clients return', note: 'Roughly nine in ten come back for a second build. We treat the first as the start.' },
  { num: '014', label: 'specialists in-house', note: 'Strategy, brand, 3D, front-end, motion and AI — no outsourced hand-off.' },
  { num: '010', label: 'years deep', note: 'Shipping since 2016. A decade of craft, compounding.' },
];

export default function Facts() {
  return (
    <section className="section facts" id="facts" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">Key facts</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          A snapshot of experience and impact.
        </SectionReveal>
      </div>
      <div className="facts-grid">
        {FACTS.map((f, i) => (
          <SectionReveal key={f.label} className="fact-card" delay={i * STAGGER_ROW} direction="up">
            <span className="fact-index" aria-hidden="true">0{i + 1}</span>
            <span className="fact-num">{f.num}</span>
            <h3 className="fact-label">{f.label}</h3>
            <p className="fact-note">{f.note}</p>
          </SectionReveal>
        ))}
      </div>
      <Marquee text="Clarity · Craft · Impact" className="facts-marquee" baseSpeed={40} />
    </section>
  );
}
