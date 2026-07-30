'use client';

import { useRef, useEffect, createElement } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE_OVERSHOOT, DURATION_NORMAL } from '../lib/easing';

gsap.registerPlugin(ScrollTrigger);

// Reveal variant with a physical overshoot (back.out) instead of a flat
// settle — rows should arrive with weight, not just fade up. Used by
// Approach/Recognition. Unlike Reveal/DecodeText, this one honors
// prefers-reduced-motion directly (both new sections ship it from the start).
export default function RevealPop({
  as = 'div',
  className = '',
  y = 46,
  scale = 0.92,
  delay = 0,
  duration = DURATION_NORMAL,
  start = 'top 88%',
  children,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { opacity: 1, y: 0, scale: 1 });
      return;
    }

    let trigger;
    const run = () => {
      gsap.fromTo(
        el,
        { opacity: 0, y, scale },
        { opacity: 1, y: 0, scale: 1, duration, delay, ease: EASE_OVERSHOOT }
      );
    };
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.88) run();
    else trigger = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: run });

    return () => {
      if (trigger) trigger.kill();
      gsap.killTweensOf(el);
    };
  }, [y, scale, delay, duration, start]);

  return createElement(as, { ref, className: `reveal ${className}`, style: { opacity: 0 } }, children);
}
