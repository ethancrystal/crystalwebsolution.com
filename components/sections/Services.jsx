'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import Marquee from '../Marquee';

const SERVICES = [
  {
    n: '01',
    title: 'Strategy & Direction',
    desc: 'Positioning, naming, product thinking. We decide what deserves to exist before we design how it looks.',
  },
  {
    n: '02',
    title: 'Brand & Identity',
    desc: 'Marks, systems and voices built for longevity — clarity first, craft always.',
  },
  {
    n: '03',
    title: 'Immersive Web & 3D',
    desc: 'WebGL scenes, scroll choreography and real-time interaction that make a page feel like a place.',
  },
  {
    n: '04',
    title: 'Design & Development',
    desc: 'Design systems shipped as production code. One team, no hand-off gap, no translation loss.',
  },
  {
    n: '05',
    title: 'Motion & Interaction',
    desc: 'Micro-interactions, transitions and choreography — motion that carries meaning, never decoration.',
  },
];

export default function Services() {
  return (
    <section className="section services" id="services" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><Reveal as="span">What we do</Reveal></p>
        <DecodeText as="h2" text="Focused vision. Measured execution." className="section-title" />
      </div>
      <div className="services-list">
        {SERVICES.map((s, i) => (
          <Reveal key={s.n} className="service-row" delay={i * 0.06} as="div">
            <span className="service-num">{s.n}</span>
            <h3 className="service-title" data-hover data-cursor="✦">{s.title}</h3>
            <p className="service-desc">{s.desc}</p>
          </Reveal>
        ))}
      </div>
      <Marquee text="Strategy · Brand · Immersive 3D · Development · Motion" className="services-marquee" />
    </section>
  );
}
