'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  EASE_MASK,
  EASE_SETTLE,
  EASE_SNAP,
} from '../lib/easing';

// The Stories review stage — a frameless "transmission" that sits directly on
// the veil-dimmed WebGL scene instead of a boxed filmstrip. Each review enters
// as a choreographed GSAP timeline: an accent signal-line sweep leads, the
// reviewer's name decodes through the site's glyph scramble, the stars stroke-
// draw, and the quote wipes up word by word from masks. The index rail's
// active entry fills over the autoplay window so the countdown is visible.
//
// All motion is event-driven (slide changes), so nothing here touches React
// state per frame; GSAP animates DOM nodes found inside the active slide.
const GLYPHS = '!<>-_\\/[]{}—=+*^?#01';
const AUTOPLAY_SECONDS = 7;
const SCRAMBLE_PER_CHAR_MS = 30;
const SCRAMBLE_LOCK_BASE_MS = 240;

const STAR_PATH =
  'M12 2.6l2.8 6 6.6.6-5 4.4 1.5 6.4-5.9-3.5-5.9 3.5 1.5-6.4-5-4.4 6.6-.6z';

function Stars({ rating }) {
  return (
    <span className="stage-stars" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className="stage-star"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d={STAR_PATH}
            pathLength="1"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            opacity={i < rating ? 1 : 0.25}
          />
        </svg>
      ))}
    </span>
  );
}

function slideParts(slideEl) {
  return {
    chars: slideEl.querySelectorAll('.stage-char'),
    words: slideEl.querySelectorAll('.stage-qword'),
    metaItems: slideEl.querySelectorAll('.stage-meta > *'),
    stars: slideEl.querySelectorAll('.stage-star path'),
    signal: slideEl.querySelector('.stage-signal'),
    link: slideEl.querySelector('.stage-link'),
  };
}

export default function StoriesStage({ slides, ariaLabel = 'Client reviews' }) {
  const stageRef = useRef(null);
  const slideRefs = useRef([]);
  const fillRefs = useRef([]);
  const tlRef = useRef(null);
  const progressRef = useRef(null);
  const scrambleRaf = useRef(0);
  const indexRef = useRef(0);
  const startedRef = useRef(false);
  const visibleRef = useRef(false);
  const pausedRef = useRef(false);
  const reducedRef = useRef(false);
  const goRef = useRef(() => {});
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const last = slides.length - 1;

  const stopScramble = () => {
    cancelAnimationFrame(scrambleRaf.current);
    scrambleRaf.current = 0;
  };

  // Cycle unlocked name glyphs through the cipher, locking left-to-right —
  // the same effect DecodeText gives headlines, retriggerable per slide.
  const startScramble = useCallback((chars) => {
    stopScramble();
    const startedAt = performance.now();
    const loop = (now) => {
      const elapsed = now - startedAt;
      let done = true;
      for (let i = 0; i < chars.length; i++) {
        const finalChar = chars[i].dataset.final;
        if (elapsed < i * SCRAMBLE_PER_CHAR_MS + SCRAMBLE_LOCK_BASE_MS) {
          done = false;
          if (finalChar.trim()) {
            chars[i].textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
        } else {
          chars[i].textContent = finalChar;
        }
      }
      if (!done) scrambleRaf.current = requestAnimationFrame(loop);
    };
    scrambleRaf.current = requestAnimationFrame(loop);
  }, []);

  const stopAutoplay = () => {
    if (progressRef.current) {
      progressRef.current.kill();
      progressRef.current = null;
    }
  };

  const armAutoplay = useCallback(() => {
    stopAutoplay();
    if (reducedRef.current || !visibleRef.current || slides.length < 2) return;
    const fill = fillRefs.current[indexRef.current];
    if (!fill) return;
    progressRef.current = gsap.fromTo(
      fill,
      { scaleX: 0, transformOrigin: '0 50%' },
      {
        scaleX: 1,
        duration: AUTOPLAY_SECONDS,
        ease: 'none',
        onComplete: () => {
          goRef.current(indexRef.current === last ? 0 : indexRef.current + 1);
        },
      },
    );
    if (pausedRef.current) progressRef.current.pause();
  }, [last, slides.length]);

  const go = useCallback(
    (next) => {
      const clamped = Math.min(Math.max(next, 0), last);
      const prev = startedRef.current ? indexRef.current : null;
      if (clamped === prev) return;

      const stage = stageRef.current;
      const nextSlide = slideRefs.current[clamped];
      if (!stage || !nextSlide) return;

      tlRef.current?.kill();
      stopScramble();
      stopAutoplay();

      const prevSlide = prev === null ? null : slideRefs.current[prev];
      const from = prev === null ? -1 : prev;
      indexRef.current = clamped;
      startedRef.current = true;
      setIndex(clamped);

      // Any slide left half-visible by an interrupted timeline goes dark.
      for (let i = 0; i < slideRefs.current.length; i++) {
        if (i !== from && i !== clamped && slideRefs.current[i]) {
          gsap.set(slideRefs.current[i], { autoAlpha: 0 });
        }
      }
      for (let i = 0; i < fillRefs.current.length; i++) {
        if (fillRefs.current[i]) gsap.set(fillRefs.current[i], { scaleX: 0 });
      }

      const parts = slideParts(nextSlide);
      const accent = slides[clamped].accent;

      if (reducedRef.current) {
        // Reduced motion: a clean cut. No scramble, no wipes, no autoplay.
        if (prevSlide) gsap.set(prevSlide, { autoAlpha: 0 });
        gsap.set(stage, { '--stage-accent': accent });
        gsap.set(nextSlide, { autoAlpha: 1 });
        gsap.set(
          [parts.chars, parts.words, parts.metaItems, parts.link],
          { clearProps: 'all', autoAlpha: 1, yPercent: 0, y: 0 },
        );
        gsap.set(parts.stars, { strokeDasharray: 1, strokeDashoffset: 0 });
        gsap.set(parts.signal, { scaleX: 1, autoAlpha: 1 });
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: EASE_SETTLE },
        onComplete: armAutoplay,
      });
      tlRef.current = tl;

      let inAt = 0;
      if (prevSlide) {
        const out = slideParts(prevSlide);
        tl.to(
          out.chars,
          { yPercent: -85, autoAlpha: 0, duration: 0.3, stagger: 0.006, ease: 'power2.in' },
          0,
        )
          .to(
            out.words,
            { yPercent: -70, autoAlpha: 0, duration: 0.28, stagger: 0.005, ease: 'power2.in' },
            0.02,
          )
          .to(
            [out.metaItems, out.link, out.signal],
            { autoAlpha: 0, y: -8, duration: 0.24, ease: 'power2.in' },
            0,
          )
          .set(prevSlide, { autoAlpha: 0 });
        inAt = 0.3;
      }

      tl.set(nextSlide, { autoAlpha: 1 }, inAt)
        .set(parts.chars, { yPercent: 110, autoAlpha: 1 }, inAt)
        .set(parts.words, { yPercent: 120, autoAlpha: 1 }, inAt)
        .set(parts.metaItems, { autoAlpha: 0, y: 10 }, inAt)
        .set(parts.link, { autoAlpha: 0, y: 10 }, inAt)
        .set(parts.stars, { strokeDasharray: 1, strokeDashoffset: 1 }, inAt)
        .to(stage, { '--stage-accent': accent, duration: 0.9, ease: 'power2.out' }, inAt)
        .fromTo(
          parts.signal,
          // y back to 0: the out-phase nudges the signal up with the meta row.
          { scaleX: 0, y: 0, transformOrigin: '0 50%', autoAlpha: 1 },
          { scaleX: 1, duration: 0.7, ease: EASE_SNAP },
          inAt + 0.05,
        )
        .to(
          parts.chars,
          {
            yPercent: 0,
            duration: 0.6,
            stagger: 0.03,
            ease: EASE_MASK,
            onStart: () => startScramble(parts.chars),
          },
          inAt + 0.08,
        )
        .to(
          parts.stars,
          { strokeDashoffset: 0, duration: 0.5, stagger: 0.07, ease: 'power2.out' },
          inAt + 0.3,
        )
        .to(
          parts.metaItems,
          { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.06 },
          inAt + 0.32,
        )
        .to(
          parts.words,
          { yPercent: 0, duration: 0.55, stagger: 0.012, ease: EASE_MASK },
          inAt + 0.34,
        )
        .to(parts.link, { autoAlpha: 1, y: 0, duration: 0.4 }, inAt + 0.62);
    },
    [armAutoplay, last, slides, startScramble],
  );
  goRef.current = go;

  // Hide every slide up front, then let the first viewport entry run the
  // opening transmission; leaving the viewport parks the autoplay clock.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;

    reducedRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (const slide of slideRefs.current) {
      if (slide) gsap.set(slide, { autoAlpha: 0 });
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        visibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          if (!startedRef.current) {
            goRef.current(0);
          } else if (!progressRef.current) {
            armAutoplay();
          } else if (!pausedRef.current) {
            progressRef.current.play();
          }
        } else {
          progressRef.current?.pause();
        }
      },
      // Low threshold: on short viewports the stage is taller than the
      // window, so a high ratio would never be reached at all.
      { threshold: 0.2 },
    );
    io.observe(stage);

    const onVisibility = () => {
      if (document.hidden) {
        progressRef.current?.pause();
      } else if (visibleRef.current && !pausedRef.current) {
        progressRef.current?.play();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      tlRef.current?.kill();
      stopScramble();
      stopAutoplay();
      gsap.killTweensOf(stage);
    };
  }, [armAutoplay]);

  const setPause = (next) => {
    pausedRef.current = next;
    setPaused(next);
    if (next) {
      progressRef.current?.pause();
    } else if (visibleRef.current) {
      progressRef.current?.play();
    }
  };

  const active = slides[index];

  return (
    <div
      ref={stageRef}
      className="stories-stage"
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      style={{ '--stage-accent': slides[0]?.accent }}
      onKeyDown={(e) => {
        const keys = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: last };
        if (!(e.key in keys)) return;
        e.preventDefault();
        go(keys[e.key]);
      }}
      onPointerEnter={() => setPause(true)}
      onPointerLeave={() => setPause(false)}
      onFocus={() => setPause(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setPause(false);
      }}
    >
      <div className="stage-glow" aria-hidden="true" />

      {/* Announce only user-driven changes; autoplay stays silent. */}
      <div className="stage-slides" aria-live={paused ? 'polite' : 'off'}>
        {slides.map((slide, i) => (
          <article
            key={slide.id}
            ref={(el) => { slideRefs.current[i] = el; }}
            className="stage-slide"
            inert={i !== index}
            aria-hidden={i !== index}
          >
            <header className="stage-meta">
              <span className="stage-kicker">
                Signal {String(i + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
              </span>
              <span className="stage-company">{slide.company}</span>
              <Stars rating={slide.rating} />
              <span className="stage-date">{slide.date}</span>
            </header>

            <h3 className="stage-name" aria-label={slide.name}>
              {slide.name.split(' ').map((word, w) => (
                <span key={w} className="stage-name-line" aria-hidden="true">
                  {Array.from(word).map((char, c) => (
                    <span key={c} className="stage-char" data-final={char}>
                      {char}
                    </span>
                  ))}
                </span>
              ))}
            </h3>

            <span className="stage-signal" aria-hidden="true" />

            <blockquote className="stage-quote">
              <p>
                {slide.quote.split(' ').map((word, w) => (
                  <span key={w} className="stage-qword-mask">
                    <span className="stage-qword">{word}</span>
                  </span>
                ))}
              </p>
            </blockquote>

            <a className="stage-link" href={`/reviews#${slide.id}`} data-cursor="Read">
              Read full review →
            </a>
          </article>
        ))}
      </div>

      <div className="stage-rail">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            className={`stage-rail-item${i === index ? ' active' : ''}`}
            aria-label={`Show review by ${slide.name}`}
            aria-current={i === index}
            onClick={() => go(i)}
          >
            <span className="stage-rail-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="stage-rail-name">{slide.name}</span>
            <span className="stage-rail-track" aria-hidden="true">
              <span
                className="stage-rail-fill"
                ref={(el) => { fillRefs.current[i] = el; }}
              />
            </span>
          </button>
        ))}
      </div>

      <p className="sr-only" aria-live="off">
        Review {index + 1} of {slides.length}: {active?.name}
      </p>
    </div>
  );
}
