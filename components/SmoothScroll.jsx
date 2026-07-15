'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollState } from '../lib/scrollState';
import { BEAT_IDS, beatProgress, measureBeats } from '../lib/beatProgress';
import { pinnedRanges } from '../lib/pinnedRanges';
import { EASE_SNAP, DURATION_SLOW } from '../lib/easing';

gsap.registerPlugin(ScrollTrigger);

// The conductor: one Lenis instance, driven by gsap.ticker (one RAF clock).
// Every Lenis scroll event updates ScrollTrigger AND the scrollState singleton.
export default function SmoothScroll({ children }) {
  useEffect(() => {
    // Heavier, more deliberate feel: longer settle duration and a lower
    // wheel/touch multiplier mean a single scroll gesture covers less
    // ground, so sections read as places to arrive at rather than blur past.
    const lenis = new Lenis({
      duration: 1.6,
      lerp: 0.085,
      smoothWheel: true,
      wheelMultiplier: 0.82,
      touchMultiplier: 0.9,
    });

    // Magnetic section snap: once scrolling has fully settled (the user
    // let go AND Lenis's own inertia has drained), ease the rest of the way
    // to whichever section is nearest, so a scroll gesture never strands
    // someone half between two sections. Skipped while inside a pinned
    // ScrollTrigger's own range (e.g. Showcase's card belt) — that
    // animation already maps scroll 1:1 to its own progress and has its
    // own hold points; snapping would fight it. Also skipped for
    // prefers-reduced-motion, since this is an extra animated scroll on
    // top of whatever the user just did.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const snapEase = gsap.parseEase(EASE_SNAP);
    let idleTimer = null;

    const withinPinnedRange = (scroll) =>
      pinnedRanges.some((range) => scroll >= range.start - 1 && scroll <= range.end + 1);

    const scheduleSnap = () => {
      if (reduceMotion) return;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!document.getElementById('hero')) return;
        const scroll = lenis.scroll;
        const limit = lenis.limit;
        if (!limit || withinPinnedRange(scroll)) return;

        const current = scroll / limit;
        let nearestId = BEAT_IDS[0];
        let nearestDist = Infinity;
        for (const id of BEAT_IDS) {
          const dist = Math.abs(beatProgress[id] - current);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestId = id;
          }
        }

        const target = beatProgress[nearestId] * limit;
        if (Math.abs(target - scroll) < 2 || withinPinnedRange(target)) return;
        lenis.scrollTo(target, { duration: DURATION_SLOW, easing: snapEase });
      }, 220);
    };

    const onScroll = ({ progress, velocity }) => {
      scrollState.progress = progress;
      scrollState.velocity = velocity * 1000;
      ScrollTrigger.update();
      scheduleSnap();
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
      clearTimeout(idleTimer);
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(tick);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      ro.disconnect();
    };
  }, []);

  return children;
}
