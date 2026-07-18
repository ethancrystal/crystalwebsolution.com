'use client';

import DecodeText from '../DecodeText';
import Reveal from '../Reveal';
import RevealPop from '../RevealPop';
import Marquee from '../Marquee';
import { ring } from '../../lib/chime';

// Named awards & press — backs up the studio's ten-year, 140+ project track
// record with an actual list. Rows arrive with RevealPop's overshoot. Hovering
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
        <p className="eyebrow"><Reveal as="span">Recognition</Reveal></p>
        <DecodeText as="h2" text="Judged by the platforms that judge craft hardest." className="section-title" />
      </div>
      <div className="recognition-list">
        {AWARDS.map((a, i) => (
          <RevealPop key={a.name} className="recognition-row" delay={i * 0.08} as="div">
            <span
              className="recognition-row-inner"
              onMouseEnter={() => ring(i)}
              data-hover
              data-cursor="\u2726"
            >
              <span className="recognition-year-wrap">
                <span className="recognition-year-stack">
                  <span className="recognition-year">{a.year}</span>
                  <span className="recognition-year recognition-year-dup">{a.year}</span>
                </span>
              </span>
              <h3 className="recognition-name">{a.name}</h3>
              <p className="recognition-body">{a.body}</p>
            </span>
          </RevealPop>
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
