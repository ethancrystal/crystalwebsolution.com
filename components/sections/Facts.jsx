'use client';

import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import { STAGGER_ROW } from '../../lib/easing';
import { VERIFIED_CLIENTS } from '../../lib/clients';
import { REVIEW_STATS } from '../../lib/reviews';

const FACTS = [
  { num: String(REVIEW_STATS.total), label: 'reviews supplied', note: 'Every supplied review is published in the archive, including critical feedback and company replies.' },
  { num: `${REVIEW_STATS.average}/5`, label: 'archive average', note: 'Calculated directly from the ratings in the supplied twenty-review record.' },
  { num: String(REVIEW_STATS.positive), label: 'four- or five-star reviews', note: 'Seventeen of the supplied reviews carry a rating of four or five stars.' },
  { num: String(VERIFIED_CLIENTS.length).padStart(2, '0'), label: 'named original clients', note: 'Ravivo Kaufman, Kristin Stein, and Porsha Patterson were identified directly as original clients.' },
];

export default function Facts() {
  return (
    <section className="section facts" id="facts" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><SectionReveal as="span" direction="left">Documented record</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Numbers the supplied record can prove.
        </SectionReveal>
      </div>
      <div className="facts-grid">
        {FACTS.map((f, i) => (
          <SectionReveal key={f.label} className="fact-card" delay={i * STAGGER_ROW} direction="up">
            <span className="fact-index" aria-hidden="true">0{i + 1}</span>
            <span className="fact-num">{f.num}</span>
            <h3 className="fact-label">{f.label}</h3>
            <p className="fact-note">{f.note}</p>
          </SectionReveal>
        ))}
      </div>
      <Marquee text="20 supplied reviews · 4.3 average · 17 positive ratings · 3 named original clients" className="facts-marquee" baseSpeed={40} />
    </section>
  );
}
