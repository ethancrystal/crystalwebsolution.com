'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SectionReveal from '../SectionReveal';
import { DURATION_FAST, DURATION_SLOW, EASE_SETTLE } from '../../lib/easing';

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
    desc: 'We audit your brand, market, audience, funnel, and operations before deciding what is worth building.',
  },
  {
    n: '02',
    title: 'Design',
    desc: 'We shape strategy, visual system, motion, content, and user experience as one coherent instrument.',
  },
  {
    n: '03',
    title: 'Build',
    desc: 'The team that designs the system ships it as production code, reducing translation loss and rework.',
  },
  {
    n: '04',
    title: 'Launch',
    desc: 'We test, instrument, launch, and improve with you. Go-live is the beginning of the feedback loop.',
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
        gsap.fromTo(row, { scale: 1 }, { scale: 1.018, duration: DURATION_FAST, ease: EASE_SETTLE, yoyo: true, repeat: 1, overwrite: true });
        gsap.fromTo(
          row,
          { borderBottomColor: 'rgba(89, 243, 255, 0.9)' },
          { borderBottomColor: 'rgba(139, 152, 184, 0.18)', duration: DURATION_SLOW, ease: EASE_SETTLE, overwrite: 'auto' }
        );
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section className="section approach" id="approach" data-quiet ref={sectionRef}>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">How we work</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Four steps. No shortcuts.
        </SectionReveal>
      </div>
      <div className="approach-list">
        {STEPS.map((s, i) => (
          <SectionReveal key={s.n} className="approach-row" direction="left" as="div">
            <div ref={(el) => (rowRefs.current[i] = el)} className="approach-row-inner">
              <span className="approach-num">{s.n}</span>
              <h3 className="approach-title" data-hover data-cursor="✦">{s.title}</h3>
              <p className="approach-desc">{s.desc}</p>
            </div>
          </SectionReveal>
        ))}
      </div>
    </section>
  );
}
