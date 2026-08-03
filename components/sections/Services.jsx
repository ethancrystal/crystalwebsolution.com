'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import MagnifiedBento from '../MagnifiedBento';
import { light, dim } from '../../lib/beacon';
import { scrollState } from '../../lib/scrollState';
import { beatProgress, BEAT_IDS } from '../../lib/beatProgress';
import { isBeatProgressActive } from '../../lib/sceneActivity.mjs';
import { SERVICES } from '../../lib/services.mjs';
import { STAGGER_ROW, DURATION_FAST, DURATION_NORMAL, EASE_SETTLE } from '../../lib/easing';

export default function Services() {
  const listRef = useRef(null);
  const markerRef = useRef(null);
  const markerNumRef = useRef(null);
  const moveMarker = useRef(null);
  const fadeMarker = useRef(null);
  const markerPlaced = useRef(false);
  const rowElsRef = useRef([]);
  const isHoveringRef = useRef(false);
  const autoIndexRef = useRef(-1);

  // Ghost numeral: a shared, absolutely-positioned marker in the intro/list
  // gutter that glides to track whichever row is hovered — a single tracked
  // element migrating across the list, distinct from the per-card primitives
  // used elsewhere. It remains desktop-only and uses the same pointer and
  // reduced-motion guard as the rest of the Services interaction.
  useEffect(() => {
    if (
      window.matchMedia('(pointer: coarse)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return undefined;

    const marker = markerRef.current;
    if (!marker) return undefined;

    gsap.set(marker, { yPercent: -50 });
    moveMarker.current = gsap.quickTo(marker, 'y', { duration: DURATION_NORMAL, ease: EASE_SETTLE });
    fadeMarker.current = gsap.quickTo(marker, 'opacity', { duration: DURATION_FAST, ease: 'none' });

    return () => {
      gsap.killTweensOf(marker);
      moveMarker.current = null;
      fadeMarker.current = null;
      markerPlaced.current = false;
    };
  }, []);

  // Shared "activate row i" primitive: moves/fades the ghost marker, lifts
  // this row's ServiceRail emblem via the beacon singleton, and toggles the
  // CSS is-active class that mirrors :hover (background shine + title color)
  // on the row itself. Used by both real pointer hover and the scroll-driven
  // auto-advance below, so a user who never touches this section with a
  // mouse still sees every row 01→08 light up in turn as they scroll past.
  function activateRow(i) {
    light(i);
    const rows = rowElsRef.current;
    rows.forEach((el, idx) => el?.classList.toggle('is-active', idx === i));

    const list = listRef.current;
    if (!list || !markerRef.current || !rows[i]) return;
    const rowRect = rows[i].getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const centerY = rowRect.top - listRect.top + rowRect.height / 2;
    if (markerNumRef.current) markerNumRef.current.textContent = SERVICES[i].n;
    if (!markerPlaced.current) {
      gsap.set(markerRef.current, { y: centerY });
      markerPlaced.current = true;
    } else {
      moveMarker.current?.(centerY);
    }
    fadeMarker.current?.(1);
  }

  function focusRow(i) {
    isHoveringRef.current = true;
    activateRow(i);
  }

  // Scroll-driven auto-advance: a visitor scrolling straight through this
  // section at speed never hovers a row, so the reveal (marker + beacon
  // shine) would otherwise only ever fire for whoever stops to point at it.
  // Mirrors ServiceRail.jsx's own activeStep math exactly (same scrollState/
  // beatProgress inputs) so the DOM marker and the 3D emblem it lights
  // advance in lockstep. Bows out entirely while a row is genuinely
  // hovered — hover always wins, this only fills the gap when it's absent.
  useEffect(() => {
    if (
      window.matchMedia('(pointer: coarse)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return undefined;

    rowElsRef.current = listRef.current
      ? Array.from(listRef.current.querySelectorAll('.service-row'))
      : [];

    const count = SERVICES.length;
    const tick = () => {
      if (isHoveringRef.current) return;
      if (!isBeatProgressActive(scrollState.progress, 'services', BEAT_IDS, beatProgress)) return;

      const start = beatProgress.services;
      const end = beatProgress.approach;
      const span = Math.max(end - start, 0.0001);
      const ease = Math.min(1, Math.max(0, (scrollState.progress - start) / span));
      const step = Math.min(count - 1, Math.floor(ease * count));

      if (step !== autoIndexRef.current) {
        autoIndexRef.current = step;
        activateRow(step);
      }
    };

    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <section className="section services" id="services" data-quiet>
      <div className="services-catalogue">
        <div className="text-plate services-intro">
          <p className="eyebrow"><SectionReveal as="span" direction="left">What we do</SectionReveal></p>
          <SectionReveal as="h2" direction="left" className="section-title">
            Focused vision. Measured execution.
          </SectionReveal>
        </div>
        <div
          className="services-list"
          ref={listRef}
          onPointerLeave={() => {
            isHoveringRef.current = false;
            fadeMarker.current?.(0);
            // Auto-advance will immediately re-mark the current scroll row on
            // its next tick; this only matters (and stays cleared) when the
            // auto effect bailed out for reduced motion / a coarse pointer.
            rowElsRef.current.forEach((el) => el?.classList.remove('is-active'));
          }}
        >
          <div className="service-marker" ref={markerRef} aria-hidden="true">
            <span className="service-marker-num" ref={markerNumRef} />
          </div>
          {SERVICES.map((s, i) => (
            <SectionReveal
              key={s.n}
              className="service-row"
              delay={i * STAGGER_ROW}
              direction="left"
              as="div"
              onPointerEnter={() => focusRow(i)}
              onPointerLeave={dim}
            >
              <h3 className="service-title" data-hover data-cursor="✦">
                <span className="service-title-inner">{s.title}</span>
              </h3>
              <p className="service-desc">{s.desc}</p>
            </SectionReveal>
          ))}
        </div>
      </div>
      <Marquee text="Strategy · Brand · Immersive 3D · Development · Motion" className="services-marquee" />
      <SectionReveal className="services-bento" direction="up" delay={0.1}>
        <MagnifiedBento />
      </SectionReveal>
    </section>
  );
}
