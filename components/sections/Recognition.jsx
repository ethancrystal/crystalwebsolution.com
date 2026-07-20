'use client';

import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import { ring } from '../../lib/chime';
import { STAGGER_ROW } from '../../lib/easing';

// Named awards & press — backs up the studio's ten-year, 140+ project track
// record with an actual list. Rows arrive through the shared editorial mask. Hovering
// a row does two things at once: a pure-CSS "slot reel" flip on the year
// (airport-board idiom, zero JS cost), and writes lib/chime.js so the matching
// medal in RecognitionRing sparks in 3D — the DOM half and the WebGL half of
// the same gesture.
const AWARDS = [
  { year: '2026', name: 'Site of the Day', body: 'Awwwards' },
  { year: '2025', name: 'Best Use of WebGL', body: 'CSS Design Awards' },
  { year: '2025', name: 'Honorable Mention', body: 'FWA' },
  { year: '2024', name: 'Clutch Verified', body: 'Clutch' },
];

export default function Recognition() {
  return (
    <section className="section recognition" id="recognition" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">Recognition</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Judged by the platforms that judge craft hardest.
        </SectionReveal>
      </div>
      <div className="recognition-list">
        {AWARDS.map((a, i) => (
          <SectionReveal key={a.name} className="recognition-row" delay={i * STAGGER_ROW} direction="left" as="div">
            <button
              type="button"
              className="recognition-row-inner"
              onPointerEnter={() => ring(i)}
              onFocus={() => ring(i)}
              onClick={() => ring(i)}
              data-hover
              data-cursor="\u2726"
            >
              <span className="recognition-year-wrap">
                <span className="recognition-year-stack">
                  <span className="recognition-year">{a.year}</span>
                  <span className="recognition-year recognition-year-dup" aria-hidden="true">{a.year}</span>
                </span>
              </span>
              <span className="recognition-name">{a.name}</span>
              <span className="recognition-body">{a.body}</span>
            </button>
          </SectionReveal>
        ))}
      </div>
      <Marquee
        text="Site of the Day · Best Use of WebGL · Honorable Mention · Clutch Verified"
        className="recognition-marquee"
        baseSpeed={44}
      />
    </section>
  );
}
