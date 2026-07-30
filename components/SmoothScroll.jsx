'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollState } from '../lib/scrollState';
import { measureBeats } from '../lib/beatProgress';

gsap.registerPlugin(ScrollTrigger);

// The conductor: one Lenis instance, driven by gsap.ticker (one RAF clock).
// Every Lenis scroll event updates ScrollTrigger AND the scrollState singleton.
export default function SmoothScroll({ children }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.25,
      lerp: 0.1,
      smoothWheel: true,
    });

    const onScroll = ({ progress, velocity }) => {
      scrollState.progress = progress;
      scrollState.velocity = velocity * 1000;
      ScrollTrigger.update();
    };
    lenis.on('scroll', onScroll);

    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    // Upgrade in-page anchors to animated scrolls.
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"], a[href^="/#"]');
      if (!a) return;
      const hash = a.getAttribute('href').replace('/', '');
      const el = document.querySelector(hash);
      if (el && window.location.pathname === '/') {
        e.preventDefault();
        lenis.scrollTo(el, { offset: 0, duration: 1.6 });
      }
    };
    document.addEventListener('click', onClick);

    // Measure real section boundaries whenever layout can have changed —
    // font swap, image load, the loader animating off, viewport resize.
    // A window 'load' listener is unreliable here: it's registered inside
    // an effect that runs after hydration, by which point the browser's
    // load event has often already fired and the listener never triggers.
    // ResizeObserver on <body> instead re-measures on any actual size
    // change, whenever it happens. Always measure against lenis.limit (see
    // beatProgress.js) so these fractions share scrollState.progress's
    // exact baseline.
    const remeasure = () => measureBeats(lenis.limit);
    remeasure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(tick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      ro.disconnect();
    };
  }, []);

  return children;
}
