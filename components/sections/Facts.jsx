'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import Marquee from '../Marquee';

const FACTS = [
  { num: '060+', label: 'projects shipped', note: 'Across fintech, luxury retail, deep tech and culture.' },
  { num: '090%', label: 'clients return', note: 'Nine in ten clients come back for a second project.' },
  { num: '012', label: 'specialists', note: 'Different skills. One standard.' },
  { num: '025+', label: 'awards & features', note: 'Recognised on the platforms that judge craft hardest.' },
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
