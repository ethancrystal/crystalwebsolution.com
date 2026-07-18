'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import Marquee from '../Marquee';

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
        <p className="eyebrow"><Reveal as="span">Key facts</Reveal></p>
        <DecodeText as="h2" text="A snapshot of experience and impact." className="section-title" />
      </div>
      <div className="facts-grid">
        {FACTS.map((f, i) => (
          <Reveal key={f.label} className="fact-card" delay={i * 0.08}>
            <span className="fact-num">{f.num}</span>
            <h3 className="fact-label">{f.label}</h3>
            <p className="fact-note">{f.note}</p>
          </Reveal>
        ))}
      </div>
      <Marquee text="Clarity · Craft · Impact" className="facts-marquee" baseSpeed={40} />
    </section>
  );
}
