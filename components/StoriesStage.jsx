'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

// The Stories review stage — a single full-bleed card whose accent-tinted
// radial wash, giant watermark quote mark, and quote/byline pop in together
// on a slide-and-settle each time the active review changes. Ported from a
// Claude Design mock ("Testimonial Section - Final"); every color below is
// this project's own token (confirmed against app/globals.css, not guessed).
//
// Deliberately NOT carried over from the mock's own implementation notes:
// wheel-driven navigation. This project removed wheel-scroll hijacking from
// this exact section earlier (the Lenis page owns the wheel), so navigation
// here is prev/next buttons + keyboard + autoplay, matching what's actually
// live rather than the older component the mock was authored against.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const AUTOPLAY_MS = 6000;
const POP = [0.22, 1, 0.36, 1];

export default function StoriesStage({ slides, ariaLabel = 'Client reviews' }) {
  const stageRef = useRef(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const last = slides.length - 1;

  const go = useCallback(
    (next) => {
      const n = slides.length;
      setIndex(((next % n) + n) % n);
    },
    [slides.length],
  );

  useEffect(() => {
    if (reduced || paused || slides.length < 2) return undefined;
    const id = window.setTimeout(() => go(index + 1), AUTOPLAY_MS);
    return () => window.clearTimeout(id);
  }, [go, index, paused, reduced, slides.length]);

  const active = slides[index];
  if (!active) return null;

  const swing = reduced ? { duration: 0 } : { duration: 0.55, ease: POP };
  const pop = reduced
    ? { initial: { opacity: 1 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, x: 28, scale: 0.94 },
        animate: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0 },
      };

  return (
    <div
      ref={stageRef}
      className="stories-stage"
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={(e) => {
        const keys = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: last };
        if (!(e.key in keys)) return;
        e.preventDefault();
        go(keys[e.key]);
      }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={index}
          className="stage-wash"
          style={{ '--wash-accent': active.accent }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={swing}
        />
      </AnimatePresence>
      <div className="stage-grain" aria-hidden="true" style={{ backgroundImage: GRAIN }} />
      <div className="stage-vignette" aria-hidden="true" />
      <span className="stage-quote-mark" aria-hidden="true">&ldquo;</span>

      <AnimatePresence initial={false}>
        <motion.blockquote
          key={`quote-${index}`}
          className="stage-quote"
          {...pop}
          transition={reduced ? { duration: 0 } : { duration: 0.55, ease: POP }}
        >
          &ldquo;{active.quote}&rdquo;
        </motion.blockquote>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <motion.div
          key={`byline-${index}`}
          className="stage-byline"
          {...pop}
          transition={reduced ? { duration: 0 } : { duration: 0.55, delay: 0.05, ease: POP }}
        >
          <span className="stage-name">{active.name}</span>
          <span className="stage-credit">{active.company}</span>
          <a className="stage-link" href={`/reviews#${active.id}`} data-cursor="Read">
            Read full review &rarr;
          </a>
        </motion.div>
      </AnimatePresence>

      <div className="stage-rating">
        <div className="stage-rating-value">{active.rating}/5</div>
        <div className="stage-rating-date">{active.date}</div>
      </div>

      <div className="stage-index" aria-hidden="true">
        <span className="stage-index-num">{String(index + 1).padStart(2, '0')}</span>
        <span className="stage-index-track">
          <span
            className="stage-index-fill"
            style={{ width: `${((index + 1) / slides.length) * 100}%` }}
          />
        </span>
        <span className="stage-index-count">of {String(slides.length).padStart(2, '0')}</span>
      </div>

      <div className="stage-nav">
        <button type="button" className="stage-nav-btn" aria-label="Previous review" onClick={() => go(index - 1)}>
          &larr;
        </button>
        <button type="button" className="stage-nav-btn" aria-label="Next review" onClick={() => go(index + 1)}>
          &rarr;
        </button>
      </div>

      {/* Announce only user-driven changes; autoplay stays silent. */}
      <p className="sr-only" aria-live={paused ? 'polite' : 'off'}>
        Review {index + 1} of {slides.length}: {active.name}
      </p>
    </div>
  );
}
