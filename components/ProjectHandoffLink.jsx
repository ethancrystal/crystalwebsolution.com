'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import gsap from 'gsap';
import { EASE_MASK, EASE_SETTLE } from '../lib/easing';

const STRIPE_COUNT = 5;

export default function ProjectHandoffLink({ href, label, children, className = '', style, ...props }) {
  const router = useRouter();
  const overlayRef = useRef(null);
  const busyRef = useRef(false);

  const navigate = (event) => {
    if (event.defaultPrevented || (event.button && event.button !== 0) || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;

    const overlay = overlayRef.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!overlay || reduced) {
      router.push(href);
      return;
    }

    const stripes = overlay.querySelectorAll('[data-project-stripe]');
    const title = overlay.querySelector('[data-project-transition-label]');
    gsap.set(overlay, { autoAlpha: 1 });
    gsap.set(stripes, { scaleX: 0, transformOrigin: (index) => index % 2 ? 'right center' : 'left center' });
    gsap.set(title, { y: 18, autoAlpha: 0 });

    gsap.timeline({
      defaults: { overwrite: 'auto' },
      onComplete: () => router.push(href),
    })
      .to(stripes, { scaleX: 1, duration: 0.46, ease: EASE_MASK, stagger: { amount: 0.12, from: 'edges' } })
      .to(title, { y: 0, autoAlpha: 1, duration: 0.24, ease: EASE_SETTLE }, '-=0.24');
  };

  return (
    <a href={href} className={className} style={style} onClick={navigate} {...props}>
      {children}
      <span className="project-handoff-overlay" ref={overlayRef} aria-hidden="true">
        {Array.from({ length: STRIPE_COUNT }, (_, index) => (
          <span key={index} data-project-stripe className="project-handoff-stripe" />
        ))}
        <span data-project-transition-label className="project-handoff-label">{label}</span>
      </span>
    </a>
  );
}
