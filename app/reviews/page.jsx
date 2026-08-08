import SubpageShell from '../../components/SubpageShell';
import ReviewsClient, { ReviewStat } from '../../components/reviews/ReviewsClient';
import { REVIEWS, REVIEW_STATS } from '../../lib/reviews';
import { SITE } from '../../lib/site';

const REVIEWS_TITLE = 'Client Reviews';
const REVIEWS_DESCRIPTION =
  `Read all ${REVIEW_STATS.total} published client reviews for Crystal Web Solution, with ratings, dates, feedback, and company replies.`;

export const metadata = {
  title: REVIEWS_TITLE,
  description: REVIEWS_DESCRIPTION,
  alternates: { canonical: '/reviews' },
  openGraph: {
    type: 'website',
    title: `${REVIEWS_TITLE} | ${SITE.name}`,
    description: REVIEWS_DESCRIPTION,
  },
  twitter: {
    card: 'summary_large_image',
    title: `${REVIEWS_TITLE} | ${SITE.name}`,
    description: REVIEWS_DESCRIPTION,
  },
};

export default function ReviewsPage() {
  return (
    <SubpageShell>
      <div className="reviews-index reviews-page">
        <section className="reviews-hero" aria-labelledby="reviews-title">
          <p className="eyebrow">Client feedback</p>
          <h1 id="reviews-title" className="page-title">What clients said, in their own words.</h1>
          <p className="reviews-lede">
            {REVIEW_STATS.total} client reviews, published in full. Read the praise, the criticism, and the company replies in one place.
          </p>
          <dl className="reviews-summary" aria-label="Review summary">
            <ReviewStat label="Reviews" value={REVIEW_STATS.total} />
            <ReviewStat label="Average" value={REVIEW_STATS.average} suffix="/5" />
            <ReviewStat label="Four or five stars" value={REVIEW_STATS.positive} />
            <div><dt>Latest review</dt><dd>{REVIEW_STATS.latest}</dd></div>
          </dl>
          <aside className="reviews-transparency">
            <strong>Transparency</strong>
            <p>Every published review appears here, including critical feedback. Company replies appear beneath the relevant review.</p>
          </aside>
        </section>

        <section className="reviews-standard" aria-labelledby="response-standard-title">
          <p className="eyebrow">Response standard</p>
          <h2 id="response-standard-title">Concerns deserve a clear, documented response.</h2>
          <ul>
            <li>Acknowledge the concern without arguing with the reviewer.</li>
            <li>State what can be confirmed and what still needs clarification.</li>
            <li>Avoid discussing confidential project details in public.</li>
            <li>Offer one current contact route and a specific next step.</li>
          </ul>
        </section>

        <section className="review-archive" aria-labelledby="archive-title">
          <div className="review-archive-heading">
            <p className="eyebrow">Published reviews</p>
            <h2 id="archive-title">All client reviews</h2>
          </div>

          <ReviewsClient reviews={REVIEWS} />
        </section>

        <section id="reviews-close" className="reviews-close">
          <p className="eyebrow">From idea to outcome</p>
          <h2>Let&apos;s make something rare.</h2>
          <p>Send us your brief, or read how we work first — either way, we&apos;ll give you a straight answer.</p>
          <div className="reviews-close-actions">
            <a href="/#contact" className="btn btn-solid">Start a project <span aria-hidden="true">→</span></a>
            <a href="/#approach" className="btn btn-ghost">Read our process <span aria-hidden="true">→</span></a>
          </div>
        </section>
      </div>
    </SubpageShell>
  );
}
