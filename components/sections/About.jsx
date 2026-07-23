'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { blastVector } from '../../lib/smilTimeline.mjs';

gsap.registerPlugin(ScrollTrigger);

const WORDS = [
  { text: 'WE', x: 58, y: 300 },
  { text: 'BUILD', x: 486, y: 300 },
  { text: 'DIGITAL', x: 1038, y: 300 },
  { text: 'EXPERIENCES', x: 58, y: 430 },
  { text: 'THAT', x: 770, y: 430 },
  { text: 'TURN', x: 1172, y: 430 },
  { text: 'CLEAR', x: 58, y: 560 },
  { text: 'STRATEGY', x: 548, y: 560 },
  { text: 'INTO', x: 1168, y: 560 },
  { text: 'BRANDS', x: 58, y: 690 },
  { text: 'PEOPLE', x: 510, y: 690 },
  { text: 'REMEMBER.', x: 914, y: 690 },
];

const ROWS = [...new Set(WORDS.map((word) => word.y))].map((y) => ({
  y,
  words: WORDS.filter((word) => word.y === y),
}));

export default function About() {
  const rootRef = useRef(null);
  const svgRef = useRef(null);
  const lastBlastRef = useRef(0);
  const wordElementsRef = useRef([]);
  const wordCentersRef = useRef([]);
  const reducedRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const words = [...svg.querySelectorAll('[data-about-word]')];
    const rows = [...svg.querySelectorAll('[data-about-row]')];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    reducedRef.current = reduced;
    wordElementsRef.current = words;

    const measureWordCenters = () => {
      wordCentersRef.current = words.map((word) => {
        const rect = word.getBoundingClientRect();
        return {
          x: rect.left + window.scrollX + rect.width / 2,
          y: rect.top + window.scrollY + rect.height / 2,
        };
      });
    };

    if (reduced) {
      gsap.set(words, { opacity: 1 });
      gsap.set(rows, { clipPath: 'inset(0 0 0 0)' });
      return undefined;
    }

    const rowReveal = gsap.fromTo(
      rows,
      { clipPath: 'inset(0 100% 0 0)' },
      {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1,
        stagger: 0.08,
        ease: 'power4.out',
        scrollTrigger: {
          trigger: root,
          start: 'top 100%',
          end: 'top 30%',
          scrub: 0.35,
        },
      },
    );

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top 100%',
      end: 'top 30%',
      scrub: 0.35,
      onUpdate: ({ progress }) => {
        const revealProgress = 1 - (1 - progress) ** 2;
        words.forEach((word, index) => {
          const offset = index / Math.max(words.length - 1, 1);
          gsap.set(word, { opacity: Math.max(0.22, Math.min(1, revealProgress * 1.35 - offset * 0.35)) });
        });
      },
    });

    measureWordCenters();
    const resizeObserver = new ResizeObserver(measureWordCenters);
    resizeObserver.observe(svg);
    window.addEventListener('resize', measureWordCenters, { passive: true });
    document.fonts?.ready.then(measureWordCenters).catch(() => {});

    return () => {
      trigger.kill();
      rowReveal.scrollTrigger?.kill();
      rowReveal.kill();
      resizeObserver.disconnect();
      window.removeEventListener('resize', measureWordCenters);
      wordElementsRef.current = [];
      wordCentersRef.current = [];
    };
  }, []);

  const blastAt = (clientX, clientY) => {
    if (reducedRef.current) return;
    const words = wordElementsRef.current;
    const centers = wordCentersRef.current;
    if (!words.length || words.length !== centers.length) return;
    const now = performance.now();
    if (now - lastBlastRef.current < 90) return;
    lastBlastRef.current = now;

    const pointer = { x: clientX + window.scrollX, y: clientY + window.scrollY };
    words.forEach((word, index) => {
      const vector = blastVector(
        pointer,
        centers[index],
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
      data-quiet
      onPointerMove={(event) => blastAt(event.clientX, event.clientY)}
      onPointerDown={(event) => blastAt(event.clientX, event.clientY)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const rect = rootRef.current.getBoundingClientRect();
        blastAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }}
      aria-label="About Crystal Web Solution"
    >
      <p className="about-kicker">Crystal Web Solution — an independent digital studio for brands built to stand out, not blend in.</p>
      <h2 className="sr-only">We build digital experiences that turn clear strategy into brands people remember.</h2>
      <svg ref={svgRef} className="about-smil-copy" viewBox="0 0 1440 900" aria-hidden="true">
        {ROWS.map((row) => (
          <g key={row.y} data-about-row>
            {row.words.map((word) => {
              const index = WORDS.indexOf(word);
              return (
                <g key={word.text} data-about-word opacity={index < 2 ? 1 : 0.14}>
                  <animateTransform data-blast-move attributeName="transform" type="translate" begin="indefinite" dur="0.8s" values="0 0;0 0;0 0" keyTimes="0;0.35;1" calcMode="spline" keySplines="0.16 1 0.3 1;0.2 0.8 0.2 1" />
                  <text x={word.x} y={word.y} className="about-smil-word">
                    {word.text}
                    <animate data-blast-color attributeName="fill" begin="indefinite" dur="0.85s" values="#f3f4ef;#59f3ff;#ff6b2c;#f3f4ef" keyTimes="0;0.24;0.5;1" />
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </section>
  );
}
