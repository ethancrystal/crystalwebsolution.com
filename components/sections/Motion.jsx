'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Reveal from '../Reveal';

gsap.registerPlugin(ScrollTrigger);

// A short pinned typographic beat: the two headline lines shear apart as
// the section scrubs, then settle. Deliberately un-quiet (see FocusVeil) —
// like Mark, this section IS the spectacle, not a passage to read.
export default function Motion() {
  const rootRef = useRef(null);
  const lineARef = useRef(null);
  const lineBRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const a = lineARef.current;
    const b = lineBRef.current;
    if (!root || !a || !b) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: 'top top',
        end: '+=100%',
        pin: true,
        scrub: 0.6,
        anticipatePin: 1,
      },
    });
    tl.fromTo(a, { xPercent: -14 }, { xPercent: 5, ease: 'none' }, 0);
    tl.fromTo(b, { xPercent: 14 }, { xPercent: -5, ease: 'none' }, 0);

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <section className="section motion" id="motion" ref={rootRef}>
      <h2 className="motion-title" aria-label="Design in motion">
        <span className="motion-line" ref={lineARef}>Design in</span>
        <span className="motion-line motion-line-accent" ref={lineBRef}>motion.</span>
      </h2>
      <Reveal className="motion-sub" delay={0.15}>
        <p>Concepts, explorations and interface experiments — shared openly as part of our process.</p>
      </Reveal>
      <Reveal className="motion-cta" delay={0.25}>
        <a href="/#contact" className="link-underline" data-cursor="Hello">view the lab →</a>
      </Reveal>
    </section>
  );
}
