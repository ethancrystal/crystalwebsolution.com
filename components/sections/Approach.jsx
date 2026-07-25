'use client';

import { useRef } from 'react';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import SectionReveal from '../SectionReveal';
import { onCardMouseGlow } from '../../lib/cardMouseGlow';

// How we work, in four steps, as a pinned board of rotated cards linked by
// one animated dashed path — replacing the old scrolling-row layout. The 3D
// compass mascot (components/three/ApproachCompass.jsx) is unaffected: it
// reads only scrollState/beatProgress, never this section's DOM, so it keeps
// lighting its four markers across the same scroll span regardless of how
// this section's own cards are laid out.
// Card accent (cyan/violet) alternates by position via :nth-child in CSS,
// matching this order — not stored per-step since nothing here reads it.
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

const BOARD_HEIGHT = 930;

const PATH_D =
  'M 290 150 C 500 150, 550 270, 710 270 C 850 270, 500 350, 290 450 C 290 600, 550 720, 750 720';

export default function Approach() {
  const sectionRef = useRef(null);
  const reducedMotion = useReducedMotion();

  return (
    <section className="section approach" id="approach" data-quiet ref={sectionRef}>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">How we work</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Four steps. No shortcuts.
        </SectionReveal>
      </div>

      <div className="motion-story-board">
        <LazyMotion features={domAnimation}>
          <div className="motion-story-track" style={{ minHeight: `${BOARD_HEIGHT}px` }}>
            <svg
              className="motion-story-path-wrap"
              viewBox={`0 0 1000 ${BOARD_HEIGHT}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <m.path
                d={PATH_D}
                className="motion-story-path"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="8 6"
                fill="none"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ strokeDashoffset: 0 }}
                animate={reducedMotion ? undefined : { strokeDashoffset: -140 }}
                transition={reducedMotion ? undefined : { repeat: Infinity, duration: 3, ease: 'linear' }}
              />
            </svg>

            {STEPS.map((step, index) => (
              <div
                key={step.n}
                className="motion-story-card"
                onMouseMove={onCardMouseGlow}
              >
                <div className="motion-story-shell">
                  <span aria-hidden="true" className="motion-story-pin">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                      <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
                    </svg>
                  </span>

                  <div className="motion-story-inner">
                    <span className="motion-story-num">0{index + 1}</span>
                    <h3 className="motion-story-title" data-hover data-cursor="✦">{step.title}</h3>
                    <p className="motion-story-desc">{step.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </LazyMotion>
      </div>
    </section>
  );
}
