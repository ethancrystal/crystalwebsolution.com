'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import Magnetic from '../Magnetic';
import { blast } from '../../lib/pulse';
import { SITE } from '../../lib/site';

gsap.registerPlugin(ScrollTrigger);

// Clicking anywhere in the hero makes the crystal "roar" (blast pulse).
export default function Hero() {
  // The intro loader plays once per session. On a repeat visit it is skipped
  // entirely (cws:intro-seen, stamped pre-hydration in layout.jsx), so the
  // hero copy must not hold back for a curtain that never lifts. Delays are
  // only read inside client effects, so this render-time branch is safe.
  const introSeen = typeof document !== 'undefined'
    && document.documentElement.dataset.cwsIntroSeen === '1';
  const introDelay = introSeen ? 0.15 : 2.6;
  const heroRef = useRef(null);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (reduced || coarse) {
      hero.dataset.refractionFallback = 'true';
      return undefined;
    }

    let pulsed = false;
    const tween = gsap.to(hero, {
      '--refraction-progress': 1,
      '--refraction-sweep': 1,
      scrollTrigger: {
        trigger: hero,
        start: 'top top',
        end: 'bottom top',
        scrub: 0.75,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          hero.dataset.refractionProgress = self.progress.toFixed(3);
          if (!pulsed && self.progress > 0.52) {
            pulsed = true;
            hero.dataset.refractionPulse = 'true';
          }
        },
      },
      ease: 'none',
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  const onBlast = (e) => {
    blast(e.clientX / window.innerWidth, e.clientY / window.innerHeight);
  };

  return (
    <section
      ref={heroRef}
      className="section hero hero-off-axis hero-refraction"
      id="hero"
      onClick={onBlast}
      data-quiet
    >
      <div className="hero-refraction-sweep" aria-hidden="true" />
      <div className="hero-caustics" aria-hidden="true">
        <span className="caustic-ray" />
      </div>
      <div className="text-plate">
        <h1 className="hero-title">
          <DecodeText as="span" text="Built to be" speed={0.045} delay={introDelay + 0.1} className="hero-line" />
          {/* Whitespace text node between the two block-level .hero-line spans.
              Purely visual, the blocks already stack — but without it the H1's
              textContent concatenates to "Built to beunforgettable.", which is
              exactly what crawlers (and Screaming Frog) index. Collapsed by the
              block formatting context, so rendering is unchanged. */}
          {' '}
          <DecodeText as="span" text="unforgettable." speed={0.045} delay={introDelay + 0.5} className="hero-line hero-line-accent" />
        </h1>
        <Reveal className="hero-sub" delay={introDelay + 1}>
          <p>
            Visitors forget a site that blends into the scroll before they have
            even left the tab. We build brands and interactive 3D experiences
            fast enough to hold attention, sharp enough to beat the competition,
            and built only for you — so the click turns into the client.
          </p>
        </Reveal>
        <Reveal className="hero-cta" delay={introDelay + 1.3}>
          <Magnetic>
            <a
              href="/#contact"
              className="btn btn-solid"
              onClick={(e) => e.stopPropagation()}
            >
              Start a project <span className="btn-arrow">→</span>
            </a>
          </Magnetic>
        </Reveal>
        {/* Inline proof line under the CTA. Reads from SITE rather than
            restating the figure, so the homepage and /about (which already
            renders SITE.projectsShipped) can never drift apart. Deliberately a
            single mono line rather than a stat block — the deleted Facts.jsx
            was the stat block, and this is not a reinstatement of it. */}
        <Reveal className="hero-stat" delay={introDelay + 1.5}>
          <p>
            <span className="hero-stat-figure">{SITE.projectsShipped}</span>
            <span className="hero-stat-sep" aria-hidden="true"> · </span>
            <span>{SITE.experience} of practice</span>
          </p>
        </Reveal>
      </div>
      <div className="hero-scroll" aria-hidden="true">
        <span>scroll</span>
        <span className="hero-scroll-line" />
      </div>
    </section>
  );
}
