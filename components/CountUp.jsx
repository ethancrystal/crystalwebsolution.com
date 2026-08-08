'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { DURATION_CINEMATIC, EASE_SETTLE } from '../lib/easing';

gsap.registerPlugin(ScrollTrigger);

// Counts a number up from 0 to `value` once it enters the viewport. Fires
// once, respects reduced motion, and never touches React state on the way
// (a plain tween on a ref, the same discipline as ScrollProgress).
export default function CountUp({
  value,
  decimals = 0,
  duration = DURATION_CINEMATIC,
  prefix = '',
  suffix = '',
  className = '',
  as = 'span',
}) {
  const ref = useRef(null);
  const Tag = as;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const format = (n) => `${prefix}${n.toFixed(decimals)}${suffix}`;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      el.textContent = format(value);
      return undefined;
    }

    const counter = { n: 0 };
    const tween = () => gsap.to(counter, {
      n: value,
      duration,
      ease: EASE_SETTLE,
      onUpdate: () => { el.textContent = format(counter.n); },
    });

    let trigger;
    if (el.getBoundingClientRect().top < window.innerHeight) tween();
    else trigger = ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: tween });

    return () => {
      trigger?.kill();
      gsap.killTweensOf(counter);
    };
  }, [value, decimals, duration, prefix, suffix]);

  return <Tag ref={ref} className={className}>{prefix}0{suffix}</Tag>;
}
