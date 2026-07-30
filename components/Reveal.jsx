'use client';

import { useRef, useEffect, createElement } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Simple rise + fade for blocks that should NOT be char-split.
export default function Reveal({
  as = 'div',
  className = '',
  y = 40,
  delay = 0,
  duration = 1,
  start = 'top 88%',
  children,
  ...rest
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    let trigger;
    const run = () => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        { opacity: 1, y: 0, duration, delay, ease: 'power3.out' }
      );
    };
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.88) run();
    else trigger = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: run });
    return () => {
      if (trigger) trigger.kill();
      gsap.killTweensOf(el);
    };
  }, [y, delay, duration, start]);

  return createElement(as, { ref, className: `reveal ${className}`, style: { opacity: 0 }, ...rest }, children);
}
