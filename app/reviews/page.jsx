import Link from 'next/link';
import { REVIEWS, REVIEW_STATS } from '../../lib/reviews';
import { SITE } from '../../lib/site';
import MarketingShell from '../../components/marketing/MarketingShell';
import SectionReveal from '../../components/SectionReveal';

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

function Rating({ value }) {
  return (
    <span className="review-rating" aria-label={`${value} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
      <span>{value}/5</span>
    </span>
  );
}

export default function ReviewsPage() {
  return (
    <MarketingShell>
      <main className="reviews-index mkt-inner">
        <section className="reviews-hero" aria-labelledby="reviews-title">
          <SectionReveal as="p" className="eyebrow" direction="left">Client feedback</SectionReveal>
          <SectionReveal as="h1" id="reviews-title" className="page-title" direction="left" delay={0.05}>
            What clients said, in their own words.
          </SectionReveal>
          <SectionReveal as="p" className="reviews-lede" direction="up" delay={0.1}>
            {REVIEW_STATS.total} client reviews, published in full. Read the praise, the criticism, and the company replies in one place.
          </SectionReveal>
          <SectionReveal as="dl" className="reviews-summary" aria-label="Review summary" direction="up" delay={0.15}>
            <div><dt>Reviews</dt><dd>{REVIEW_STATS.total}</dd></div>
            <div><dt>Average</dt><dd>{REVIEW_STATS.average}/5</dd></div>
            <div><dt>Four or five stars</dt><dd>{REVIEW_STATS.positive}</dd></div>
            <div><dt>Latest review</dt><dd>{REVIEW_STATS.latest}</dd></div>
          </SectionReveal>
          <SectionReveal as="aside" className="reviews-transparency" direction="up" delay={0.15}>
            <strong>Transparency</strong>
            <p>Every published review appears here, including critical feedback. Company replies appear beneath the relevant review.</p>
          </SectionReveal>
        </section>

        <section className="reviews-standard" aria-labelledby="response-standard-title">
          <SectionReveal as="p" className="eyebrow" direction="left">Response standard</SectionReveal>
          <SectionReveal as="h2" id="response-standard-title" direction="left" delay={0.05}>
            Concerns deserve a clear, documented response.
          </SectionReveal>
          <SectionReveal as="ul" direction="up" delay={0.1}>
            <li>Acknowledge the concern without arguing with the reviewer.</li>
            <li>State what can be confirmed and what still needs clarification.</li>
            <li>Avoid discussing confidential project details in public.</li>
            <li>Offer one current contact route and a specific next step.</li>
          </SectionReveal>
        </section>

        <section className="review-archive" aria-labelledby="archive-title">
          <SectionReveal as="div" className="review-archive-heading" direction="up">
            <p className="eyebrow">Published reviews</p>
            <h2 id="archive-title">All client reviews</h2>
          </SectionReveal>

          <div className="review-list">
            {REVIEWS.map((review) => (
              <article key={review.id} id={review.id} className={`review-card review-card-${review.rating}`}>
                <header className="review-card-header">
                  <div>
                    <h3>{review.reviewer}</h3>
                    {review.company && <p className="review-client">{review.company}</p>}
                    <p className="review-headline">{review.headline}</p>
                  </div>
                  <Rating value={review.rating} />
                </header>
                <p className="review-meta">
                  {review.country} • {review.reviewCount} {review.reviewCount === 1 ? 'review' : 'reviews'} • {review.date}
                </p>
                <div className="review-body">
                  {review.body.map((paragraph, index) => <p key={`${review.id}-${index}`}>{paragraph}</p>)}
                </div>
                {review.reply && (
                  <aside className="review-reply">
                    <strong>Company reply • {review.reply.date}</strong>
                    <p>{review.reply.body}</p>
                  </aside>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="reviews-close">
          <SectionReveal as="p" className="eyebrow" direction="left">From idea to outcome</SectionReveal>
          <SectionReveal as="h2" direction="left" delay={0.05}>Let&apos;s make something rare.</SectionReveal>
          <SectionReveal as="p" direction="up" delay={0.1}>
            Send us your brief. We&apos;ll give you a straight read on scope, timeline, cost, and the first move if it&apos;s a fit.
          </SectionReveal>
          <SectionReveal direction="up" delay={0.15}>
            <a href={`mailto:${SITE.email}`} className="btn btn-solid">Start a project <span aria-hidden="true">→</span></a>
          </SectionReveal>
        </section>
      </main>
    </MarketingShell>
  );
}
