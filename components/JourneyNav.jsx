'use client';

import { useEffect, useId, useRef, useState } from 'react';
import gsap from 'gsap';
import { scrollState } from '../lib/scrollState';
import { currentBeatIndex } from '../lib/beatProgress';
import { JOURNEY_NAV } from '../lib/journeyNav.mjs';

const pad = (n) => String(n).padStart(2, '0');
const TOTAL = pad(JOURNEY_NAV.length);

// Persistent homepage wayfinding (visual Phase 1b). Native in-page anchors —
// SmoothScroll already upgrades `#id` clicks to Lenis scrolls, and reduced
// motion keeps the browser default — so there is no scroll code here.
//
// The active beat is read from the shared gsap.ticker (one RAF clock) and
// written straight to the DOM only when it changes, the same pattern as
// ScrollProgress: no React state on the per-frame path. React state is only
// the phone popover's open flag, which changes on user input.
export default function JourneyNav() {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const navRef = useRef(null);
  const listRef = useRef(null);
  const toggleRef = useRef(null);
  const indexRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    let shown = -1;
    const tick = () => {
      const i = currentBeatIndex(scrollState.progress);
      if (i === shown) return;
      shown = i;
      const links = listRef.current?.querySelectorAll('a[data-beat]') ?? [];
      links.forEach((link, index) => {
        if (index === i) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      if (indexRef.current) indexRef.current.textContent = pad(i + 1);
      if (labelRef.current) labelRef.current.textContent = JOURNEY_NAV[i]?.label ?? '';
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const nav = navRef.current;
    const onKey = (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onPointer = (event) => {
      if (!nav?.contains(event.target)) setOpen(false);
    };
    // Tabbing out of the list closes it, so the opaque panel never sits over
    // whatever the keyboard moves on to.
    const onFocusOut = (event) => {
      if (event.relatedTarget && !nav?.contains(event.relatedTarget)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    nav?.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
      nav?.removeEventListener('focusout', onFocusOut);
    };
  }, [open]);

  return (
    <nav ref={navRef} className="journey-nav" aria-label="Page sections" data-open={open ? 'true' : undefined}>
      <button
        ref={toggleRef}
        type="button"
        className="journey-nav-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="sr-only">Sections, now at </span>
        <span className="journey-nav-toggle-count">
          <span ref={indexRef}>01</span>
          <span className="journey-nav-toggle-total" aria-hidden="true">/{TOTAL}</span>
        </span>
        <span ref={labelRef} className="journey-nav-toggle-label">{JOURNEY_NAV[0].label}</span>
      </button>
      {/* data-lenis-prevent: on short screens the phone list scrolls, and
          Lenis would otherwise take the wheel/touch input for the page. */}
      <ol id={listId} ref={listRef} className="journey-nav-list" data-lenis-prevent>
        {JOURNEY_NAV.map((item, index) => (
          <li key={item.id}>
            <a href={`#${item.id}`} data-beat={item.id} onClick={() => setOpen(false)}>
              <span className="journey-nav-index" aria-hidden="true">{pad(index + 1)}</span>
              <span className="journey-nav-label">{item.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
