'use client';

import { useRef, useEffect } from 'react';
import { LazyMotion, domAnimation, m } from 'motion/react';
import SectionReveal from '../SectionReveal';
import { useCardMouseReveal } from '../CardHoverReveal';

const STEPS = [
  {
    title: 'Brief & Discovery',
    description:
      'We map your audience, goals, and constraints so the build starts from the right problem instead of the prettiest assumption.',
    colorTheme: 'blue',
  },
  {
    title: 'Design',
    description:
      'We turn direction into visual system, motion, and interaction craft that earns attention without shouting.',
    colorTheme: 'purple',
  },
  {
    title: 'Development',
    description:
      'Design and engineering move together, so polish survives build time and launch readiness is verified before cutover.',
    colorTheme: 'blue',
  },
  {
    title: 'Deployment',
    description:
      'We launch, instrument, and improve with you—go-live is the beginning of a measurable feedback loop.',
    colorTheme: 'purple',
  },
];

export default function Approach() {
  const sectionRef = useRef(null);

  const height = 930;

  const pathD = STEPS.reduce((path, _, index) => {
    if (index >= STEPS.length - 1) return path;
    if (index === 0) return `${path}M 290 150 C 500 150, 550 270, 710 270`;
    if (index === 1) return `${path} C 850 270, 500 350, 290 450`;
    if (index === 2) return `${path} C 290 600, 550 720, 750 720`;
    return path;
  }, '');

  useEffect(() => {
    const root = sectionRef.current;
    if (!root) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  }, []);

  return (
    <section ref={sectionRef} className="section approach motion-story" id="approach" data-quiet>
      <div className="text-plate">
        <p className="eyebrow">
          <SectionReveal as="span" direction="left">How we work</SectionReveal>
        </p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Four steps. No shortcuts.
        </SectionReveal>
      </div>

      <div className="motion-story-board">
        <LazyMotion features={domAnimation}>
          <div className="motion-story-track" style={{ minHeight: `${height}px` }}>
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none hidden md:block"
              viewBox={`0 0 1000 ${height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <m.path
                d={pathD}
                stroke="currentColor"
                className="text-neutral-700"
                strokeWidth="2"
                strokeDasharray="8 6"
                fill="none"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -140 }}
                transition={{
                  repeat: Infinity,
                  duration: 3,
                  ease: 'linear',
                }}
              />
            </svg>

            {STEPS.map((step, index) => {
              const theme = step.colorTheme || 'blue';
              const { cardRef: stepCardRef, onMouseMove: onStepMouseMove } = useCardMouseReveal();
              const styles = {
                pin: { color: theme === 'purple' ? 'rgba(192, 132, 252, 0.95)' : 'rgba(89, 243, 255, 0.9)' },
                shell: {
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow:
                    theme === 'purple'
                      ? '0 20px 50px rgba(192, 132, 252, 0.06)'
                      : '0 20px 50px rgba(89, 243, 255, 0.08)',
                },
                inner: {
                  background: theme === 'purple' ? 'rgba(192, 132, 252, 0.08)' : 'rgba(89, 243, 255, 0.08)',
                  border: '1px solid ' + (theme === 'purple' ? 'rgba(192, 132, 252, 0.22)' : 'rgba(89, 243, 255, 0.22)'),
                },
                num: {
                  color: theme === 'purple' ? 'rgba(192, 132, 252, 0.95)' : 'rgba(89, 243, 255, 0.9)',
                },
              };

              return (
                <div
                  key={step.title}
                  ref={stepCardRef}
                  className="motion-story-card"
                  onMouseMove={onStepMouseMove}
                >
                  <div style={styles.shell} className="p-2 rounded-[28px]">
                    <span
                      aria-hidden="true"
                      className="motion-story-pin block text-center"
                      style={styles.pin}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="w-8 h-8 mx-auto mb-6"
                      >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
                      </svg>
                    </span>

                    <div className="motion-story-inner">
                      <span className="motion-story-num block" style={styles.num}>
                        0{index + 1}
                      </span>
                      <h3 className="motion-story-title">{step.title}</h3>
                      <p className="motion-story-desc">{step.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </LazyMotion>
      </div>
    </section>
  );
}
