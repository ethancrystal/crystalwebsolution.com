'use client';
// @ts-check

// The "Client proof" review stage: one focused review at a time inside a
// bordered card, the quote itself as the headline instead of the reviewer's
// name. Adapted from a Claude Design mock (see project handoff notes) —
// same review data as before, same input methods (arrows, keyboard,
// autoplay gated on prefers-reduced-motion), new visual template.
//
// The mock drops HeroCarousel's clickable thumbnail filmstrip in favor of a
// numeric position rail; a compact dot row is kept here as its stand-in so
// jumping straight to a review stays possible without a filmstrip.
import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * @param {Object} props
 * @param {Array<Object>} props.items - Review entries; shape driven by whatever renders each card body.
 * @param {boolean} [props.autoplay]
 * @param {number} [props.autoplayDelay]
 * @param {string} [props.ariaLabel]
 * @param {string} [props.className]
 * @returns {import('react').ReactElement}
 */
export function ReviewCarousel({
  items,
  autoplay = false,
  autoplayDelay = 4500,
  ariaLabel = 'Reviews',
  className = '',
}) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const reduced = useReducedMotion();
  const last = items.length - 1;

  const go = React.useCallback(
    (next) => {
      const n = items.length;
      setIndex(((next % n) + n) % n);
    },
    [items.length],
  );

  React.useEffect(() => {
    if (!autoplay || reduced || paused || dragging || items.length < 2) return undefined;
    const id = window.setTimeout(() => go(index + 1), autoplayDelay);
    return () => window.clearTimeout(id);
  }, [autoplay, autoplayDelay, dragging, go, index, items.length, paused, reduced]);

  const active = items[index];
  if (!active) return null;

  const enterTransition = reduced
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 24, mass: 0.85 };

  return (
    <div
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
        if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
      }}
      className={`review-carousel ${className}`.trim()}
    >
      <div className="review-carousel-frame" style={{ '--rc-accent': active.accent }}>
        <AnimatePresence initial={false}>
          <motion.div
            key={`wash-${active.id ?? index}`}
            className="review-carousel-wash"
            initial={reduced ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : 0.5 }}
          />
        </AnimatePresence>
        <div
          className="review-carousel-grain"
          aria-hidden="true"
          style={{ backgroundImage: GRAIN }}
        />
        <div className="review-carousel-legibility" aria-hidden="true" />
        <div className="review-carousel-mark" aria-hidden="true">&ldquo;</div>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`content-${active.id ?? index}`}
            className="review-carousel-quote-wrap"
            initial={reduced ? { opacity: 1 } : { opacity: 0, x: 28, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.18 } }}
            transition={enterTransition}
          >
            <p className="review-carousel-quote">&ldquo;{active.quote}&rdquo;</p>
          </motion.div>
        </AnimatePresence>

        <div className="review-carousel-rating">
          <span>{active.rating}/5</span>
          <span className="review-carousel-date">{active.date}</span>
        </div>

        <div className="review-carousel-rail">
          <span className="review-carousel-index">{String(index + 1).padStart(2, '0')}</span>
          <div className="review-carousel-track">
            <span style={{ width: `${((index + 1) / items.length) * 100}%` }} />
          </div>
          <span className="review-carousel-count">of {String(items.length).padStart(2, '0')}</span>
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`byline-${active.id ?? index}`}
            className="review-carousel-byline"
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.15 } }}
            transition={{ duration: reduced ? 0 : 0.45, delay: reduced ? 0 : 0.05 }}
          >
            <span className="review-carousel-name">{active.reviewer}</span>
            <span className="review-carousel-credit">{active.credit}</span>
            {active.reviewHref ? (
              <a className="review-carousel-link" href={active.reviewHref} data-cursor="Read">
                Read full review →
              </a>
            ) : null}
          </motion.div>
        </AnimatePresence>

        <div className="review-carousel-nav">
          <button
            type="button"
            aria-label="Previous review"
            onClick={() => go(index - 1)}
            className="review-carousel-btn"
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Next review"
            onClick={() => go(index + 1)}
            className="review-carousel-btn"
          >
            →
          </button>
        </div>
      </div>

      <div className="review-carousel-dots" role="tablist" aria-label="Jump to a review">
        {items.map((item, i) => (
          <button
            key={item.id ?? i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={item.reviewer}
            className="review-carousel-dot"
            data-active={i === index || undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
}

export default ReviewCarousel;
