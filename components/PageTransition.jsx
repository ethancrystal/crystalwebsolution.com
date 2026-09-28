'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EASE_SETTLE } from '../lib/easing';
import {
  PAGE_FADE_IN_S,
  PAGE_FADE_OUT_S,
  isTransitionPath,
  transitionDestination,
} from '../lib/pageTransition.mjs';

gsap.registerPlugin(ScrollTrigger);

const STUCK_TIMEOUT_MS = 5000;

// Site-wide page-to-page transition (adapted from doordennis.nl's Swup flow):
//   1. an internal link is clicked -> the page content fades out;
//   2. once hidden, Next navigates (router.push);
//   3. the new route commits -> jump to the top (unless a #hash was asked for),
//      refresh ScrollTrigger so every scroll animation re-measures, fade in.
// Mounted once in the root layout so it survives route changes. Links that
// own their exit (ProjectHandoffLink's stripe wipe) or opt out with
// data-no-page-transition are left alone, as are CRM/auth routes.
// Opacity only: a transform on <main> would re-anchor the fixed WebGL
// stage and nav to it mid-fade.
export default function PageTransition() {
  const router = useRouter();
  const pathname = usePathname();
  const pendingRef = useRef(false);
  const stuckRef = useRef(0);

  useEffect(() => {
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return;
      if (anchor.hasAttribute('data-no-page-transition')) return;
      if (anchor.querySelector('.project-handoff-overlay')) return;

      const destination = transitionDestination({
        href: anchor.getAttribute('href'),
        currentHref: window.location.href,
        target: anchor.getAttribute('target') || '',
        download: anchor.hasAttribute('download'),
      });
      if (!destination) return;

      const page = document.getElementById('main-content');
      if (!page) return;

      // Stop the browser and next/link; other click handlers (e.g. Menu's
      // close-on-click) still run because propagation is not stopped.
      event.preventDefault();
      if (pendingRef.current) return;
      pendingRef.current = true;
      document.documentElement.classList.add('is-page-leaving');

      gsap.to(page, {
        autoAlpha: 0,
        duration: PAGE_FADE_OUT_S,
        ease: 'power2.inOut',
        overwrite: true,
        onComplete: () => {
          router.push(destination);
          // Safety net: never leave the page invisible if the route fails.
          window.clearTimeout(stuckRef.current);
          stuckRef.current = window.setTimeout(() => {
            pendingRef.current = false;
            document.documentElement.classList.remove('is-page-leaving');
            gsap.to(page, { autoAlpha: 1, duration: PAGE_FADE_IN_S, clearProps: 'opacity,visibility' });
          }, STUCK_TIMEOUT_MS);
        },
      });
    };

    window.addEventListener('click', onClick, true);
    return () => {
      window.removeEventListener('click', onClick, true);
      window.clearTimeout(stuckRef.current);
    };
  }, [router]);

  useEffect(() => {
    if (!pendingRef.current) return undefined;
    pendingRef.current = false;
    window.clearTimeout(stuckRef.current);

    const page = document.getElementById('main-content');
    document.documentElement.classList.remove('is-page-leaving');
    if (!page) return undefined;

    if (!window.location.hash) window.scrollTo(0, 0);

    const frame = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      gsap.fromTo(
        page,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: PAGE_FADE_IN_S,
          ease: EASE_SETTLE,
          overwrite: true,
          clearProps: 'opacity,visibility',
        },
      );
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  // Arriving on a CRM route mid-transition must never keep it hidden.
  useEffect(() => {
    if (isTransitionPath(pathname)) return;
    const page = document.getElementById('main-content');
    if (page) gsap.set(page, { clearProps: 'opacity,visibility' });
  }, [pathname]);

  return null;
}
