'use client';

import { createElement, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import SplitType from 'split-type';

gsap.registerPlugin(ScrollTrigger);

// Line-by-line word rise (adapted from doordennis.nl's [data-lines]). The
// block is split into rendered lines; each line masks its words, which rise
// from below together, each line starting LINE_STAGGER after the previous.
// Like BlurLetters, the split is reverted on completion so the settled text
// is plain, reflowable, and read as one sentence by assistive tech.
const LINE_STAGGER = 0.15;

export default function LineRise({
  as = 'p',
  className = '',
  delay = 0,
  start = 'top 90%',
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

    const split = new SplitType(el, { types: 'lines,words' });
    const lines = split.lines || [];
    const perLine = lines.map((line) => Array.from(line.querySelectorAll('.word')));
    const allWords = perLine.flat();

    let reverted = false;
    const restore = () => {
      if (reverted) return;
      reverted = true;
      gsap.killTweensOf(allWords);
      split.revert();
    };

    gsap.set(allWords, { yPercent: 110 });
    gsap.set(el, { opacity: 1 });

    const run = () => {
      const tl = gsap.timeline({ delay, onComplete: restore });
      perLine.forEach((words, index) => {
        tl.to(words, { yPercent: 0, duration: 0.75, ease: 'power3.out' }, index * LINE_STAGGER);
      });
    };

    let trigger;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) run();
    else trigger = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: run });

    return () => {
      trigger?.kill();
      restore();
    };
  }, [delay, start]);

  return createElement(
    as,
    { ref, className: `line-rise ${className}`.trim(), style: { opacity: 0, ...style }, ...rest },
    children,
  );
}
