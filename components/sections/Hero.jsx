'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import Magnetic from '../Magnetic';
import { blast } from '../../lib/pulse';
import { SITE } from '../../lib/site';

// Clicking anywhere in the hero makes the crystal "roar" (blast pulse).
export default function Hero() {
  const onBlast = (e) => {
    blast(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  };

  return (
    <section
      className="section hero hero-off-axis"
      id="hero"
      onClick={onBlast}
      data-cursor="Tap"
      data-quiet
    >
      <div className="hero-caustics" aria-hidden="true">
        <span className="caustic-ray" />
      </div>
      <div className="text-plate">
        <p className="eyebrow hero-eyebrow">
          <Reveal as="span" delay={2.6}>Est. {SITE.est} — {SITE.years} years shaping digital direction</Reveal>
        </p>
        <h1 className="hero-title">
          <DecodeText as="span" text="Built to be" speed={0.045} delay={2.7} className="hero-line" />
          <DecodeText as="span" text="unforgettable." speed={0.045} delay={3.1} className="hero-line hero-line-accent" />
        </h1>
        <Reveal className="hero-sub" delay={3.6}>
          <p>
            Imagine a site people still remember months later — faster than
            your old one, sharper than the field, and unmistakably yours.
            That's what we build: brands and interactive 3D experiences
            engineered for clarity, made to move.
          </p>
        </Reveal>
        <Reveal className="hero-cta" delay={3.9}>
          <Magnetic>
            <a
              href="/#contact"
              className="btn btn-solid"
              data-cursor="Let's go"
              onClick={(e) => e.stopPropagation()}
            >
              Start a project <span className="btn-arrow">→</span>
            </a>
          </Magnetic>
          <span className="hero-hint">click the space — the crystal reacts</span>
        </Reveal>
      </div>
      <div className="hero-scroll" aria-hidden="true">
        <span>scroll</span>
        <span className="hero-scroll-line" />
      </div>
    </section>
  );
}
