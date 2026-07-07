'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import { SITE } from '../../lib/site';

export default function About() {
  return (
    <section className="section about" id="about" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><Reveal as="span">About</Reveal></p>
        <Reveal as="h2" className="about-statement">
          {SITE.name} is an independent studio crafting brand experiences
          where strategy, design and real-time 3D meet.
        </Reveal>
      </div>
      <div className="about-cols">
        <Reveal className="about-col" delay={0.1}>
          <p>
            We design for longevity. Every decision starts with a question —
            does this add clarity? — and ends in code we&apos;re proud to ship.
          </p>
        </Reveal>
        <Reveal className="about-col" delay={0.2}>
          <p>
            Our mission is to make technology feel human: digital products that
            are intuitive, purposeful, and worth remembering.
          </p>
        </Reveal>
      </div>
      <Reveal className="about-cta" delay={0.3}>
        <a href="/#contact" className="link-underline" data-cursor="Hello">more about working with us →</a>
      </Reveal>
    </section>
  );
}
