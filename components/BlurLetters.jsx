'use client';

import { createElement, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

// Blur-letter heading entrance (adapted from doordennis.nl's [data-blur-letters]).
// Each word rises into place while every letter turns in from edge-on
// (rotateY -90deg), un-blurs and grows from 0.9 to full size. The split is
// reverted once the entrance finishes, so the settled heading is plain text
// again: accessible name, text-wrap: balance, gradients and resize wrapping
// all behave exactly as before the animation ran.
export default function BlurLetters({
  as = 'h2',
  className = '',
  delay = 0,
  start = 'top 90%',
  stagger = 0.022,
  children,
  style,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { opacity: 1 });
      return undefined;
    }

    // Letters become separate spans mid-animation; keep the heading's
    // accessible name whole while they exist.
    const label = el.textContent.trim();
    const hadLabel = el.hasAttribute('aria-label');
    if (!hadLabel && label) el.setAttribute('aria-label', label);

    const split = new SplitType(el, { types: 'words,chars' });
    const words = split.words || [];
    const chars = split.chars || [];
    words.forEach((word) => {
      word.setAttribute('aria-hidden', 'true');
      word.style.perspective = '600px';
    });

    let reverted = false;
    const restore = () => {
      if (reverted) return;
      reverted = true;
      gsap.killTweensOf([...words, ...chars]);
      split.revert();
      if (!hadLabel) el.removeAttribute('aria-label');
    };

    gsap.set(words, { yPercent: 60 });
    gsap.set(chars, {
      rotateY: -90,
      scale: 0.9,
      y: '-0.66vw',
      filter: 'blur(8px)',
      transformOrigin: '50% 50%',
    });
    gsap.set(el, { opacity: 1 });

    const run = () => {
      gsap.timeline({ delay, onComplete: restore })
        .to(words, { yPercent: 0, duration: 0.75, ease: 'power3.out', stagger: 0.04 }, 0)
        .to(chars, {
          rotateY: 0,
          scale: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.75,
          ease: 'power3.out',
          stagger,
        }, 0);
    };

    let trigger;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) run();
    else trigger = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: run });

    return () => {
      trigger?.kill();
      restore();
    };
  }, [delay, start, stagger]);

  return createElement(
    as,
    { ref, className: `blur-letters ${className}`.trim(), style: { opacity: 0, ...style }, ...rest },
    children,
  );
}
