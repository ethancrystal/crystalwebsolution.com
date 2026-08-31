'use client';

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { scrollState } from '../lib/scrollState';
import { measureBeats } from '../lib/beatProgress';
import { registerScrollApi, scrollLock } from '../lib/scrollLock';

gsap.registerPlugin(ScrollTrigger);

// The conductor: one Lenis instance, driven by gsap.ticker (one RAF clock).
// Every Lenis scroll event updates ScrollTrigger AND the scrollState singleton.
export default function SmoothScroll({ children }) {
  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let teardownScroll = () => {};
    let alignHash = () => {};
    let hashFrame = 0;
    let initialHashAligned = false;

    const setupNativeScroll = () => {
      const updateNativeScroll = () => {
        const limit = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
        scrollState.progress = Math.min(1, Math.max(0, window.scrollY / limit));
        scrollState.velocity = 0;
        measureBeats(limit);
        ScrollTrigger.update();
      };
      updateNativeScroll();
      window.addEventListener('scroll', updateNativeScroll, { passive: true });
      alignHash = (destination) => {
        const top = typeof destination === 'number'
          ? destination
          : destination.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top, behavior: 'auto' });
        updateNativeScroll();
      };
      const resizeObserver = typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateNativeScroll);
      resizeObserver?.observe(document.body);
      return () => {
        window.removeEventListener('scroll', updateNativeScroll);
        resizeObserver?.disconnect();
      };
    };

    const setupLenisScroll = () => {
      // Keep the journey smooth without adding a long, detached-feeling tail
      // to every wheel gesture. Pinned beats provide the intentional pauses.
      const lenis = new Lenis({
        duration: 1.15,
        lerp: 0.12,
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 1,
      });

      registerScrollApi({ stop: () => lenis.stop(), start: () => lenis.start() });

      const onScroll = ({ progress, velocity }) => {
        scrollState.progress = progress;
        scrollState.velocity = velocity * 1000;
        ScrollTrigger.update();
      };
      lenis.on('scroll', onScroll);
      alignHash = (destination) => {
        lenis.scrollTo(destination, { immediate: true, force: true });
        ScrollTrigger.update();
      };

      const tick = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Upgrade in-page anchors to animated scrolls only while Lenis owns the
      // scroll path. Native/reduced mode keeps the browser's default behavior.
      const onClick = (event) => {
        const anchor = event.target.closest('a[href^="#"], a[href^="/#"]');
        if (!anchor) return;
        const hash = anchor.getAttribute('href').replace('/', '');
        const target = document.querySelector(hash);
        if (target && window.location.pathname === '/') {
          event.preventDefault();
          lenis.scrollTo(target, { offset: 0, duration: 1.6 });
        }
      };
      document.addEventListener('click', onClick);

      // Measure real section boundaries whenever layout can have changed.
      // Always use lenis.limit so these fractions share scroll progress's
      // exact baseline.
      const remeasure = () => measureBeats(lenis.limit);
      remeasure();
      const resizeObserver = typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(remeasure);
      resizeObserver?.observe(document.body);

      return () => {
        document.removeEventListener('click', onClick);
        gsap.ticker.remove(tick);
        lenis.off('scroll', onScroll);
        lenis.destroy();
        resizeObserver?.disconnect();
        scrollLock.api = null;
      };
    };

    const configureScroll = () => {
      window.cancelAnimationFrame(hashFrame);
      teardownScroll();
      teardownScroll = reducedMotion.matches
        ? setupNativeScroll()
        : setupLenisScroll();
      ScrollTrigger.refresh();

      // The browser resolves a hash before pinned ScrollTriggers know their
      // final ranges. Reconcile once after refresh so direct links enter a
      // pinned story at its declared representative frame instead of an
      // inactive/empty boundary. Regular scrolling remains unchanged.
      hashFrame = window.requestAnimationFrame(() => {
        if (initialHashAligned || !window.location.hash) return;
        const targetId = decodeURIComponent(window.location.hash.slice(1));
        const target = document.getElementById(targetId);
        if (!target) return;

        const requestedProgress = Number.parseFloat(target.dataset.anchorProgress);
        const pinTrigger = Number.isFinite(requestedProgress)
          ? ScrollTrigger.getAll().find((candidate) => candidate.trigger === target)
          : null;
        const destination = pinTrigger
          ? pinTrigger.start + (pinTrigger.end - pinTrigger.start) * Math.min(1, Math.max(0, requestedProgress))
          : target;

        initialHashAligned = true;
        alignHash(destination);
      });
    };

    configureScroll();
    reducedMotion.addEventListener('change', configureScroll);

    return () => {
      window.cancelAnimationFrame(hashFrame);
      reducedMotion.removeEventListener('change', configureScroll);
      teardownScroll();
    };
  }, []);

  return children;
}
