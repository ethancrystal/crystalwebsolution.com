'use client';

import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import { light, dim } from '../../lib/beacon';
import { SERVICES } from '../../lib/services.mjs';

const SERVICE_MARQUEE = SERVICES.map((service) => service.title).join(' · ');

export default function Services() {
  return (
    <section className="section services" id="services" data-quiet>
      <div className="services-catalogue">
        <div className="text-plate services-intro">
          <p className="eyebrow"><SectionReveal as="span" direction="left">What we do</SectionReveal></p>
          <SectionReveal as="h2" direction="left" className="section-title services-title">
            Focused vision. Measured execution.
          </SectionReveal>
        </div>
        <div className="services-list">
          {SERVICES.map((s, i) => (
            <SectionReveal
              key={s.n}
              className="service-row"
              direction="left"
              as="div"
              onPointerEnter={() => light(i)}
              onPointerLeave={dim}
            >
              <span className="service-num">{s.n}</span>
              <h3 className="service-title" data-hover data-cursor="✦">{s.title}</h3>
              <p className="service-desc">{s.desc}</p>
            </SectionReveal>
          ))}
        </div>
      </div>
      <Marquee text={SERVICE_MARQUEE} className="services-marquee" baseSpeed={40} />
    </section>
  );
}
