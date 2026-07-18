'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import RevealPop from '../RevealPop';

gsap.registerPlugin(ScrollTrigger);

// How we work, in four steps. Rows arrive with a physical overshoot
// (RevealPop), then as the camera flies through this beat, the row matching
// the 3D compass's currently-lit marker (components/three/ApproachCompass.jsx)
// gets a one-shot "hit": a quick scale-punch + border flash, timed off the
// same section-local progress the compass reads — DOM and mascot as one
// synced instrument instead of two unrelated animations.
const STEPS = [
  {
    n: '01',
    title: 'Discover',
    desc: 'Teams commit budget before they know the goal — so they build the wrong thing beautifully. We audit your brand, market and funnel first, then decide what’s worth building.',
  },
  {
    n: '02',
    title: 'Design',
    desc: 'Brand and product get designed in silos, so the launch feels stitched together. We draft system, motion and tone as one instrument — so it reads as one company everywhere it ships.',
  },
  {
    n: '03',
    title: 'Build',
    desc: 'The design-to-code hand-off is where fidelity and budget leak. We ship the design system as production code — one team, no translation loss between mockup and live build.',
  },
  {
    n: '04',
    title: 'Launch',
    desc: 'Most studios go quiet at go-live and leave you guessing what works. We ship, instrument and iterate with you — the relationship starts at launch, not after it.',
  },
];

export default function Approach() {
  const sectionRef = useRef(null);
  const rowRefs = useRef([]);
  const lastActive = useRef(-1);

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top center',
      end: 'bottom center',
      onUpdate: (self) => {
        const step = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length));
        if (step === lastActive.current) return;
        lastActive.current = step;
        const row = rowRefs.current[step];
        if (!row) return;
        gsap.fromTo(row, { scale: 1 }, { scale: 1.018, duration: 0.22, ease: 'power3.out', yoyo: true, repeat: 1, overwrite: true });
        gsap.fromTo(
          row,
          { borderBottomColor: 'rgba(89, 243, 255, 0.9)' },
          { borderBottomColor: 'rgba(139, 152, 184, 0.18)', duration: 0.7, ease: 'power2.out', overwrite: 'auto' }
        );
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section className="section approach" id="approach" data-quiet ref={sectionRef}>
      <div className="text-plate">
        <p className="eyebrow"><Reveal as="span">How we work</Reveal></p>
        <DecodeText as="h2" text="Four steps. No shortcuts." className="section-title" />
      </div>
      <div className="approach-list">
        {STEPS.map((s, i) => (
          <RevealPop key={s.n} className="approach-row" delay={i * 0.08} as="div">
            <div ref={(el) => (rowRefs.current[i] = el)} className="approach-row-inner">
              <span className="approach-num">{s.n}</span>
              <h3 className="approach-title" data-hover data-cursor="✦">{s.title}</h3>
              <p className="approach-desc">{s.desc}</p>
            </div>
          </RevealPop>
        ))}
      </div>
    </section>
  );
}
