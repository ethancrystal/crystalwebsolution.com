'use client';

import SectionReveal from '../SectionReveal';
import HeroCarousel from '../ui/hero-carousel';
import { REVIEWS } from '../../lib/reviews';
import { paletteArt } from '../../lib/proceduralArt';

// Same curated set as before the carousel redesign: real, named, five-star
// reviews. The full record (including every other review) stays on /reviews.
const HOME_REVIEW_IDS = ['vaughn-hebron', 'porsha-patterson', 'style-loft'];
const REVIEWS_BY_ID = new Map(REVIEWS.map((review) => [review.id, review]));

// Brand accents the backdrop grades to as each review takes focus.
const ACCENTS = ['#3c6cff', '#59f3ff', '#c084fc'];

const SLIDES = HOME_REVIEW_IDS.map((id) => REVIEWS_BY_ID.get(id)).map(
  (review, i) => ({
    id: review.id,
    // Reviewer name broken across lines so each word gets its own wipe.
    title: review.reviewer.split(' ').join('\n'),
    credit: (review.company || 'Verified client').toUpperCase(),
    meta: [`${review.rating}/5`, review.date.toUpperCase()],
    accent: ACCENTS[i % ACCENTS.length],
    image: paletteArt([ACCENTS[i % ACCENTS.length], '#04060c'], review.id),
    quote: review.body[0],
    reviewCount: review.reviewCount ?? 1,
  }),
);

export default function Stories() {
  return (
    <section className="section stories" id="stories" data-quiet>
      <div className="text-plate">
        <p className="eyebrow">
          <SectionReveal as="span" direction="left">Client reviews</SectionReveal>
        </p>
        <SectionReveal as="h2" direction="left" className="section-title">
          The work matters. So does what happens after launch.
        </SectionReveal>
        <SectionReveal className="stories-intro" direction="up" delay={0.08}>
          <p>Every review here is from a real client, unedited, after the work shipped.</p>
        </SectionReveal>
      </div>

      <SectionReveal delay={0.15} direction="up">
        <div className="stories-carousel">
          <HeroCarousel
            items={SLIDES}
            autoplay
            autoplayDelay={6000}
            ariaLabel="Client reviews"
            renderDetail={(slide) => (
              <div className="stories-carousel-detail">
                <p className="stories-carousel-quote">&ldquo;{slide.quote}&rdquo;</p>
                <a
                  className="story-card-link"
                  href={`/reviews#${slide.id}`}
                  data-cursor="Open"
                >
                  {slide.reviewCount} review{slide.reviewCount === 1 ? '' : 's'} — open
                  record →
                </a>
              </div>
            )}
          />
        </div>
      </SectionReveal>

      <SectionReveal className="stories-cta" delay={0.1} direction="up">
        <a href="/reviews" className="link-underline" data-cursor="Read">
          Read all client reviews →
        </a>
      </SectionReveal>
    </section>
  );
}
