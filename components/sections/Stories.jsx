'use client';

import SectionReveal from '../SectionReveal';
import SectionHeader from '../shared/SectionHeader';
import ReviewCarousel from '../ui/review-carousel';
import { REVIEWS } from '../../lib/reviews';

// Same curated set as before the visual redesign: real, named, five-star
// reviews. The full record (including every other review) stays on /reviews.
const HOME_REVIEW_IDS = [
  'ahmed-jeffrey',
  'porsha-patterson',
  'vaughn-hebron',
  'style-loft',
];
const REVIEWS_BY_ID = new Map(REVIEWS.map((review) => [review.id, review]));

// Brand accents the background wash grades to as each review takes focus.
const ACCENTS = ['#3c6cff', '#59f3ff', '#c084fc'];

const SLIDES = HOME_REVIEW_IDS.map((id) => REVIEWS_BY_ID.get(id)).map(
  (review, i) => ({
    id: review.id,
    reviewer: review.reviewer,
    credit: (review.company || 'Verified client').toUpperCase(),
    rating: review.rating,
    date: review.date.toUpperCase(),
    accent: ACCENTS[i % ACCENTS.length],
    quote: review.body[0],
    reviewHref: `/reviews#${review.id}`,
  }),
);

export default function Stories() {
  return (
    <section className="section stories" id="stories" data-quiet>
      <div className="text-plate">
        <SectionHeader eyebrow="Client proof" title="Real clients. Real outcomes. No invented case studies." />
        <SectionReveal className="stories-intro" direction="up" delay={0.08}>
          <p>Unedited words from the people we have built for — before, during, and after launch.</p>
        </SectionReveal>
      </div>

      <SectionReveal delay={0.15} direction="up">
        <ReviewCarousel
          items={SLIDES}
          autoplay
          autoplayDelay={6000}
          ariaLabel="Client reviews"
        />
      </SectionReveal>

      <SectionReveal className="stories-cta" delay={0.1} direction="up">
        <a href="/reviews" className="link-underline" data-cursor="Read">
          Read every client review →
        </a>
      </SectionReveal>
    </section>
  );
}
