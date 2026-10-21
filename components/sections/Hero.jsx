'use client';

import Reveal from '../Reveal';
import { Pin } from '../heritage/Pin';
import { CRYSTAL_DIGITIZING_URL, HERO_FACTS } from '../../lib/heritage.mjs';

// The homepage opens on the production story, not the digital studio: sixteen
// years of Crystal Digitizing, patches, stickers and embroidery. It lives
// inside HeritageWorld's opaque ink ground, so the WebGL crystal waits behind
// it until the Digital Studio bridge. The id stays "hero" because it is still
// the first camera beat (lib/beatProgress.js BEAT_IDS).
export default function Hero() {
  // The intro loader plays once per session. On a repeat visit it is skipped
  // entirely (cws:intro-seen, stamped pre-hydration in layout.jsx), so the
  // hero copy must not hold back for a curtain that never lifts. Delays are
  // only read inside client effects, so this render-time branch is safe.
  const introSeen = typeof document !== 'undefined'
    && document.documentElement.dataset.cwsIntroSeen === '1';
  const introDelay = introSeen ? 0.15 : 2.6;

  return (
    <section className="hx-hero" id="hero" aria-labelledby="hx-hero-title">
      {/* The thread enters from the left edge and crosses the top of the hero
          before dropping down the right gutter. */}
      <Pin left="-3%" top="16%" />
      <Pin left="22%" top="11%" />
      <Pin left="54%" top="14%" />
      <Pin left="86%" top="14%" />
      <Pin lane="r" top="55%" />
      <Pin lane="r" bottom="24px" />
      <div className="hx-hero-photo" aria-hidden="true">
        <img src="/heritage/process.webp" width="1100" height="733" alt="" decoding="async" fetchPriority="low" />
      </div>
      <div className="hx-hero-inner">
        <Reveal className="hx-kicker" delay={introDelay} y={20}>
          <span>CD SPORTSWEAR INC / BUILT ON DIGITIZING</span>
          <span className="hx-kicker-rule" aria-hidden="true" />
        </Reveal>
        <h1 className="hx-hero-title" id="hx-hero-title">
          <Reveal as="span" className="hx-hero-line" delay={introDelay + 0.1} y={24}>
            Over 16 Years Of Experience
          </Reveal>
          {' '}
          <Reveal as="span" className="hx-hero-line" delay={introDelay + 0.4} y={24}>
            <em>under our belts</em>
          </Reveal>
        </h1>
        <div className="hx-hero-row">
          <Reveal as="p" className="hx-hero-lede" delay={introDelay + 0.8} y={20}>
            Every patch, sticker and logo we make starts as a stitch file. Crystal Digitizing has been writing them
            for 16 years.
          </Reveal>
          <Reveal className="hx-ctas" delay={introDelay + 1} y={20}>
            <a className="hx-btn" href={CRYSTAL_DIGITIZING_URL} target="_blank" rel="noopener">
              Explore Crystal Digitizing <span className="hx-arrow" aria-hidden="true">→</span>
            </a>
            <a className="hx-link hx-link--ghost" href="/#make">See what we make</a>
          </Reveal>
        </div>
        {/* start: this row sits at the very bottom of the first screen, below the
            default 88% trigger line, so it must fire on load. */}
        <Reveal as="ul" className="hx-facts" delay={introDelay + 1.2} y={16} start="top 100%">
          {HERO_FACTS.map((fact) => <li key={fact}>{fact}</li>)}
          {/* Points at the scroll thread, which is only drawn from 900px up. */}
          <li className="hx-thread-copy">FOLLOW THE THREAD ↓</li>
        </Reveal>
      </div>
    </section>
  );
}
