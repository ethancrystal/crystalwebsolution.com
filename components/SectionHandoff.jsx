'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE_MASK, EASE_SETTLE } from '../lib/easing';

gsap.registerPlugin(ScrollTrigger);

const INSETS = {
  top: 'inset(0 0 100% 0)',
  right: 'inset(0 0 0 100%)',
  bottom: 'inset(100% 0 0 0)',
  left: 'inset(0 100% 0 0)',
};

export default function SectionHandoff({ children, className = '', from = 'top', tone = 'cyan', label }) {
  const rootRef = useRef(null);
  const maskRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const mask = maskRef.current;
    const content = contentRef.current;
    if (!root || !mask || !content) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) {
      root.dataset.motionFallback = 'true';
      return undefined;
    }

    gsap.set(mask, { clipPath: INSETS[from] || INSETS.top });
    gsap.set(content, { y: 16, autoAlpha: 0.001 });
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: root, start: 'top 86%', end: 'top 48%', scrub: 0.7, invalidateOnRefresh: true },
    });
    timeline
      .to(mask, { clipPath: 'inset(0 0 0 0)', ease: EASE_MASK, duration: 0.72 }, 0)
      .to(content, { y: 0, autoAlpha: 1, ease: EASE_SETTLE, duration: 0.6 }, 0.08);

    return () => {
      timeline.scrollTrigger?.kill();
      timeline.kill();
    };
  }, [from]);

  return (
    <div
      ref={rootRef}
      className={`section-handoff section-handoff--${tone} section-handoff--${from} ${className}`.trim()}
      data-section-handoff
      data-handoff-label={label || undefined}
    >
      <div ref={maskRef} className="section-handoff__mask" aria-hidden="true" />
      <div ref={contentRef} className="section-handoff__content">{children}</div>
    </div>
  );
}
