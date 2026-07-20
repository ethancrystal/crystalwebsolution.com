import Link from 'next/link';
import { REVIEWS, REVIEW_STATS } from '../../lib/reviews';
import { SITE } from '../../lib/site';

const REVIEWS_TITLE = 'Client Reviews';
const REVIEWS_DESCRIPTION =
  'Read client feedback for Crystal Web Solution, including ratings, dates, company replies, and the complete supplied review archive.';

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
    <div className="subpage reviews-page">
      <header className="nav">
        <Link href="/" className="nav-logo" data-cursor="Home">
          <span className="nav-logo-monogram" aria-hidden="true">CWS</span>
          <span className="nav-logo-name">{SITE.name}</span>
        </Link>
        <Link href="/#contact" className="btn btn-ghost" data-cursor="Say hi">Start a project</Link>
      </header>

      <main className="reviews-index">
        <section className="reviews-hero" aria-labelledby="reviews-title">
          <p className="eyebrow">Client feedback</p>
          <h1 id="reviews-title" className="page-title">Real feedback, carried forward with the brand.</h1>
          <p className="reviews-lede">
            The reviews below are presented under the Crystal Web Solution name and reproduced from the supplied review record. Ratings, dates, reviewer names, and meaning are retained.
          </p>
          <dl className="reviews-summary" aria-label="Review archive summary">
            <div><dt>Reviews</dt><dd>{REVIEW_STATS.total}</dd></div>
            <div><dt>Average</dt><dd>{REVIEW_STATS.average}/5</dd></div>
            <div><dt>Four or five stars</dt><dd>{REVIEW_STATS.positive}</dd></div>
            <div><dt>Latest supplied</dt><dd>{REVIEW_STATS.latest}</dd></div>
          </dl>
          <aside className="reviews-transparency">
            <strong>Transparency</strong>
            <p>We publish the complete supplied archive, not only the positive reviews. Where the supplied record includes a company reply, it appears directly beneath the review.</p>
          </aside>
        </section>

        <section className="reviews-standard" aria-labelledby="response-standard-title">
          <p className="eyebrow">Response standard</p>
          <h2 id="response-standard-title">Concerns deserve a clear, documented response.</h2>
          <ul>
            <li>Acknowledge the concern without arguing with the reviewer.</li>
            <li>State what can be verified and what cannot be matched in the records.</li>
            <li>Avoid discussing confidential project details in public.</li>
            <li>Offer one current contact route and a specific next step.</li>
          </ul>
        </section>

        <section className="review-archive" aria-labelledby="archive-title">
          <div className="review-archive-heading">
            <p className="eyebrow">Review archive</p>
            <h2 id="archive-title">All supplied reviews</h2>
            <p>Review spelling and grammar are retained as supplied.</p>
          </div>

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
          <p className="eyebrow">From idea to outcome</p>
          <h2>Let&apos;s make something rare.</h2>
          <p>Send us your brief. We reply within two business days with a straight read on scope, timeline, cost, and the first move if it&apos;s a fit.</p>
          <a href={`mailto:${SITE.email}`} className="btn btn-solid">Start a project <span aria-hidden="true">→</span></a>
        </section>
      </main>
    </div>
  );
}
