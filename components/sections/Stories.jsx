'use client';

import SectionReveal from '../SectionReveal';
import StoriesStage from '../StoriesStage';
import { REVIEWS } from '../../lib/reviews';

// Same curated set as before the stage redesign: real, named, five-star
// reviews. The full record (including every other review) stays on /reviews.
const HOME_REVIEW_IDS = [
  'ahmed-jeffrey',
  'porsha-patterson',
  'vaughn-hebron',
  'style-loft',
];
const REVIEWS_BY_ID = new Map(REVIEWS.map((review) => [review.id, review]));

// Brand accents the stage grades to as each review takes focus.
const ACCENTS = ['#3c6cff', '#59f3ff', '#c084fc'];

// The stage sets quotes large, so long reviews hand off to /reviews at a
// word boundary instead of overflowing the fixed-height beat.
function excerpt(text, max = 200) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

const SLIDES = HOME_REVIEW_IDS.map((id) => REVIEWS_BY_ID.get(id)).map(
  (review, i) => ({
    id: review.id,
    name: review.reviewer,
    company: (review.company || 'Verified client').toUpperCase(),
    date: review.date.toUpperCase(),
    rating: review.rating,
    accent: ACCENTS[i % ACCENTS.length],
    quote: excerpt(review.body[0]),
  }),
);

export default function Stories() {
  return (
    <section className="section stories" id="stories" data-quiet>
      <div className="text-plate">
        <p className="eyebrow">
          <SectionReveal as="span" direction="left">Client proof</SectionReveal>
        </p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Real clients. Real outcomes. No invented case studies.
        </SectionReveal>
        <SectionReveal className="stories-intro" direction="up" delay={0.08}>
          <p>Unedited words from the people we have built for — before, during, and after launch.</p>
        </SectionReveal>
      </div>

      <StoriesStage slides={SLIDES} ariaLabel="Client reviews" />

      <SectionReveal className="stories-cta" delay={0.1} direction="up">
        <a href="/reviews" className="link-underline" data-cursor="Read">
          Read every client review →
        </a>
      </SectionReveal>
    </section>
  );
}
