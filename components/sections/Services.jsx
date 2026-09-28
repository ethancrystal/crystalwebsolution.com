'use client';

import { useRef, useEffect } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import SectionReveal from '../SectionReveal';
import SectionHeader from '../shared/SectionHeader';
import Marquee from '../Marquee';
import MagnifiedBento from '../MagnifiedBento';
import SectionSkeleton from '../ui/section-skeleton';
import { light, dim } from '../../lib/beacon';
import { skipsPointerAnimation } from '../../lib/interactionGuards.mjs';
import { scrollState } from '../../lib/scrollState';
import { beatProgress, BEAT_IDS } from '../../lib/beatProgress';
import { isBeatProgressActive } from '../../lib/sceneActivity.mjs';
import { SERVICES } from '../../lib/services.mjs';
import { SERVICE_PAGES, SERVICE_SLUG_BY_SIGNAL } from '../../lib/servicePages.mjs';
import { STAGGER_ROW, DURATION_FAST, DURATION_NORMAL, EASE_SETTLE } from '../../lib/easing';

// Per-row detail resolved once at module scope: the first three capabilities
// from the service's own page record, and its /services/[slug] href derived
// through the existing signal→slug join (never by munging the title). Both
// halves are static data, so there is nothing to recompute per render.
const SERVICE_DETAIL = SERVICES.map((service) => {
  const page = SERVICE_PAGES.find((entry) => entry.signal === service.signal) || null;
  const slug = SERVICE_SLUG_BY_SIGNAL[service.signal] || null;
  return {
    slug,
    href: slug ? `/services/${slug}` : null,
    capabilities: (page?.capabilities || []).slice(0, 3),
  };
});

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
    if (skipsPointerAnimation()) return undefined;

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
    rows.forEach((el, idx) => {
      if (!el) return;
      const active = idx === i;
      el.classList.toggle('is-active', active);
      el.dataset.active = active ? 'true' : 'false';
      if (active) el.setAttribute('aria-current', 'true');
      else el.removeAttribute('aria-current');
    });

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
    if (skipsPointerAnimation()) return undefined;

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
      <SectionSkeleton />
      <div className="services-catalogue">
        <div className="text-plate services-intro">
          <SectionHeader eyebrow="What we do" title="Focused vision. Measured execution." />
          <SectionReveal className="services-intro-line" direction="up" delay={0.08}>
            <p>Eight disciplines, one team — bring us the whole build, or just the piece that's stuck.</p>
          </SectionReveal>
        </div>
        <div
          className="services-list"
          data-refraction-services="true"
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
          {SERVICES.map((s, i) => {
            const detail = SERVICE_DETAIL[i];
            return (
              <SectionReveal
                key={s.n}
                className="service-row"
                delay={i * STAGGER_ROW}
                direction="left"
                as="div"
                onPointerEnter={() => focusRow(i)}
                onFocus={() => focusRow(i)}
                onPointerLeave={dim}
                onBlur={() => {
                  isHoveringRef.current = false;
                  dim();
                }}
                data-service-index={i}
                data-active="false"
              >
                <h3 className="service-title">
                  <span className="service-title-inner">{s.title}</span>
                </h3>
                <p className="service-desc">{s.desc}</p>
                {/* Second-column detail block. React's onFocus/onBlur are
                    focusin/focusout, so the link below drives the row's
                    existing focusRow/dim handlers by bubbling — one focus
                    stop per row, so there is no focus thrash. */}
                <div className="service-row-more">
                  {detail.capabilities.length > 0 && (
                    <ul className="case-services service-chips" aria-label={`${s.title} capabilities`}>
                      {detail.capabilities.map((capability) => (
                        <li key={capability}>{capability}</li>
                      ))}
                    </ul>
                  )}
                  {detail.href && (
                    <Link
                      className="link-underline service-more-link"
                      href={detail.href}
                      aria-label={`More info about ${s.title}`}
                    >
                      More info
                      <span className="service-more-arrow" aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </SectionReveal>
            );
          })}
        </div>
      </div>
      <Marquee text="Strategy · Brand · Immersive 3D · Development · Motion" className="services-marquee" />
      <SectionReveal className="services-bento" direction="up" delay={0.1}>
        <MagnifiedBento />
      </SectionReveal>
    </section>
  );
}
