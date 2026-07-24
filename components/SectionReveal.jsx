'use client';

import { createElement, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DURATION_SLOW, EASE_MASK } from '../lib/easing';

gsap.registerPlugin(ScrollTrigger);

const MASKS = {
  left: { clipPath: 'inset(0 100% 0 0)', x: -18, y: 0 },
  right: { clipPath: 'inset(0 0 0 100%)', x: 18, y: 0 },
  up: { clipPath: 'inset(100% 0 0 0)', x: 0, y: 24 },
  down: { clipPath: 'inset(0 0 100% 0)', x: 0, y: -24 },
};

// Editorial mask used only below the locked Hero. It reserves final geometry
// before animating, resolves immediately for reduced motion, and shares one
// easing/duration language across the site's reading sections.
export default function SectionReveal({
  as = 'div',
  className = '',
  direction = 'up',
  delay = 0,
  duration = DURATION_SLOW,
  start = 'top 96%',
  children,
  style,
  ...rest
}) {
  const ref = useRef(null);
  const initial = MASKS[direction] || MASKS.up;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      gsap.set(el, { opacity: 1, x: 0, y: 0, clipPath: 'inset(0 0 0 0)' });
      return undefined;
    }

    const reveal = () => gsap.fromTo(
      el,
      { opacity: 0, ...initial },
      {
        opacity: 1,
        x: 0,
        y: 0,
        clipPath: 'inset(0 0 0 0)',
        duration,
        delay,
        ease: EASE_MASK,
        clearProps: 'willChange',
      },
    );

    let trigger;
    if (el.getBoundingClientRect().top < window.innerHeight) reveal();
    else trigger = ScrollTrigger.create({ trigger: el, start, once: true, onEnter: reveal });

    return () => {
      trigger?.kill();
      gsap.killTweensOf(el);
    };
  }, [delay, direction, duration, initial, start]);

  return createElement(
    as,
    {
      ref,
      className: `section-reveal ${className}`.trim(),
      style: {
        opacity: 0,
        clipPath: initial.clipPath,
        willChange: 'clip-path, transform, opacity',
        ...style,
      },
      ...rest,
    },
    children,
  );
}
