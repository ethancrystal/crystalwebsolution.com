'use client';

import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import { ring } from '../../lib/chime';
import { STAGGER_ROW } from '../../lib/easing';

// The interaction remains expressive; the labels are limited to records the
// client supplied instead of implying awards or third-party endorsements.
const PROOF_RECORD = [
  { badge: 'CLIENT', name: 'Ravivo Kaufman', body: 'Owner • Talk to My Lawyer' },
  { badge: 'CLIENT', name: 'Kristin Stein', body: 'Tucker Trips' },
  { badge: '5/5', name: 'Porsha Patterson', body: 'Zues Towing • supplied review' },
  { badge: '20', name: 'Complete review archive', body: 'Positive and critical feedback included' },
];

export default function Recognition() {
  return (
    <section className="section recognition" id="recognition" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">Proof, not placeholders</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Client names and feedback we can stand behind.
        </SectionReveal>
      </div>
      <div className="recognition-list">
        {PROOF_RECORD.map((item, i) => (
          <SectionReveal key={item.name} className="recognition-row" delay={i * STAGGER_ROW} direction="left" as="div">
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
                  <span className="recognition-year">{item.badge}</span>
                  <span className="recognition-year recognition-year-dup" aria-hidden="true">{item.badge}</span>
                </span>
              </span>
              <span className="recognition-name">{item.name}</span>
              <span className="recognition-body">{item.body}</span>
            </button>
          </SectionReveal>
        ))}
      </div>
      <Marquee
        text="Ravivo Kaufman · Kristin Stein · Porsha Patterson · Complete review archive"
        className="recognition-marquee"
        baseSpeed={44}
      />
    </section>
  );
}
