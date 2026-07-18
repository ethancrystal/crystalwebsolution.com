'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { blastVector } from '../../lib/smilTimeline.mjs';

gsap.registerPlugin(ScrollTrigger);

const WORDS = [
  { text: 'WE', x: 80, y: 250 },
  { text: 'BUILD', x: 507, y: 250 },
  { text: 'DIGITAL', x: 1062, y: 250 },
  { text: 'EXPERIENCES', x: 80, y: 370 },
  { text: 'THAT', x: 785, y: 370 },
  { text: 'TURN', x: 1191, y: 370 },
  { text: 'CLEAR', x: 80, y: 490 },
  { text: 'STRATEGY', x: 571, y: 490 },
  { text: 'INTO', x: 1190, y: 490 },
  { text: 'BRANDS', x: 80, y: 610 },
  { text: 'PEOPLE', x: 529, y: 610 },
  { text: 'REMEMBER.', x: 978, y: 610 },
];

export default function About() {
  const rootRef = useRef(null);
  const svgRef = useRef(null);
  const lastBlastRef = useRef(0);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const words = [...svg.querySelectorAll('[data-about-word]')];
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(words, { opacity: 1 });
      return;
    }

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top 78%',
      end: 'bottom 30%',
      scrub: 0.45,
      onUpdate: ({ progress }) => {
        words.forEach((word, index) => {
          const offset = index / Math.max(words.length - 1, 1);
          gsap.set(word, { opacity: Math.max(0.14, Math.min(1, progress * 1.55 - offset * 0.62)) });
        });
      },
    });

    return () => trigger.kill();
  }, []);

  const blastAt = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return;
    const now = performance.now();
    if (now - lastBlastRef.current < 90) return;
    lastBlastRef.current = now;

    svg.querySelectorAll('[data-about-word]').forEach((word) => {
      const rect = word.getBoundingClientRect();
      const vector = blastVector(
        { x: clientX, y: clientY },
        { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
        240
      );
      if (!vector.active) return;

      const move = word.querySelector('[data-blast-move]');
      const color = word.querySelector('[data-blast-color]');
      move?.setAttribute('values', `0 0;${vector.x} ${vector.y};0 0`);
      move?.setAttribute('dur', `${0.55 + vector.strength * 0.35}s`);
      move?.beginElement?.();
      color?.beginElement?.();
    });
  };

  return (
    <section
      className="section about about-smil"
      id="about"
      ref={rootRef}
      tabIndex={0}
      onPointerMove={(event) => blastAt(event.clientX, event.clientY)}
      onPointerDown={(event) => blastAt(event.clientX, event.clientY)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const rect = rootRef.current.getBoundingClientRect();
        blastAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }}
      aria-label="About Crystal Web Solution. Move over the statement to refract it."
    >
      <p className="about-kicker">Crystal Web Solution — an independent digital studio for brands built to stand out, not blend in.</p>
      <h2 className="sr-only">We build digital experiences that turn clear strategy into brands people remember.</h2>
      <svg ref={svgRef} className="about-smil-copy" viewBox="0 0 1440 900" aria-hidden="true">
        {WORDS.map((word, index) => (
          <g key={word.text} data-about-word opacity={index < 2 ? 1 : 0.14}>
            <animateTransform data-blast-move attributeName="transform" type="translate" begin="indefinite" dur="0.8s" values="0 0;0 0;0 0" keyTimes="0;0.35;1" calcMode="spline" keySplines="0.16 1 0.3 1;0.2 0.8 0.2 1" />
            <text x={word.x} y={word.y} className="about-smil-word">
              {word.text}
              <animate data-blast-color attributeName="fill" begin="indefinite" dur="0.85s" values="#f3f4ef;#59f3ff;#ff6b2c;#f3f4ef" keyTimes="0;0.24;0.5;1" />
            </text>
          </g>
        ))}
      </svg>
      <p className="about-hint">Move across the statement — pointer or touch — and watch the words refract.</p>
    </section>
  );
}
