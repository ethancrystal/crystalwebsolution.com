import Link from 'next/link';
import { REVIEWS, REVIEW_STATS } from '../../lib/reviews';
import { SITE } from '../../lib/site';
import { absoluteUrl, SOCIAL_IMAGE_PATH } from '../../lib/seo.mjs';
import MarketingShell from '../../components/marketing/MarketingShell';
import SectionReveal from '../../components/SectionReveal';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';
import FaqSchema from '../../components/marketing/FaqSchema';

const REVIEWS_FAQ = [
  {
    q: 'Are all of your reviews shown on this page?',
    a: `Yes. Every one of the ${REVIEW_STATS.total} published reviews appears here in full, including the critical ones — nothing gets filtered out before it reaches this page.`,
  },
  {
    q: 'Why publish a negative review instead of removing it?',
    a: 'Because a page that only shows five-star reviews is not evidence of anything. The response standard below applies to every review equally, good or bad — removing the hard ones would mean it only applied when it was easy.',
  },
  {
    q: 'How do you decide what to say in a public reply?',
    a: 'The same standard every time: acknowledge the concern, state what can be confirmed, keep project specifics out of a public thread, and offer one real way to reach us next.',
  },
  {
    q: 'Can I leave a review of a project we worked on together?',
    a: 'Yes — reach out through Contact or email us directly and we’ll point you to the right place to leave it.',
  },
];

// schema.org datePublished must be ISO 8601; lib/reviews.js stores
// human-readable strings like "June 15, 2026". Returns undefined rather than
// an invalid date so a malformed entry omits the field instead of emitting
// "Invalid Date" into the markup.
function isoDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString().slice(0, 10);
}

const REVIEWS_TITLE = 'Client Reviews';
const REVIEWS_DESCRIPTION =
  `Read all ${REVIEW_STATS.total} published client reviews for CD Sportswear USA, with ratings, dates, feedback, and company replies.`;

export const metadata = {
  title: REVIEWS_TITLE,
  description: REVIEWS_DESCRIPTION,
  alternates: { canonical: '/reviews' },
  openGraph: {
    type: 'website',
    url: absoluteUrl('/reviews'),
    title: `${REVIEWS_TITLE} | ${SITE.name}`,
    description: REVIEWS_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${REVIEWS_TITLE} | ${SITE.name}`,
    description: REVIEWS_DESCRIPTION,
    images: [{ url: SOCIAL_IMAGE_PATH }],
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
          <p className="eyebrow"><SectionReveal as="span" direction="left">Client feedback</SectionReveal></p>
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
          <p className="eyebrow"><SectionReveal as="span" direction="left">Response standard</SectionReveal></p>
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
            {REVIEWS.map((review, reviewIndex) => (
              <SectionReveal
                as="article"
                key={review.id}
                id={review.id}
                className={`review-card review-card-${review.rating}`}
                direction="up"
                delay={Math.min(reviewIndex * 0.05, 0.3)}
              >
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
              </SectionReveal>
            ))}
          </div>
        </section>

        <section className="reviews-faq" aria-labelledby="reviews-faq-title">
          <SectionReveal as="div" className="reviews-faq-heading" direction="up">
            <p className="eyebrow">FAQ</p>
            <h2 id="reviews-faq-title">Common questions</h2>
          </SectionReveal>
          <SectionReveal as="dl" className="mkt-faq" direction="up" delay={0.1}>
            {REVIEWS_FAQ.map((item) => (
              <div className="mkt-faq-item" key={item.q}>
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </SectionReveal>
        </section>

        <section className="reviews-related" aria-label="More about the studio">
          <SectionReveal as="ul" className="mkt-related" direction="up">
            <li>
              <Link href="/work" className="mkt-related-link">
                <span className="mkt-related-title">Selected work — the projects behind these reviews.</span>
                <span className="mkt-related-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link href="/services" className="mkt-related-link">
                <span className="mkt-related-title">Services — the eight offers these clients hired us for.</span>
                <span className="mkt-related-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
            <li>
              <Link href="/about" className="mkt-related-link">
                <span className="mkt-related-title">About — meet the studio behind the work.</span>
                <span className="mkt-related-arrow" aria-hidden="true">→</span>
              </Link>
            </li>
          </SectionReveal>
        </section>

        <section className="reviews-close">
          <p className="eyebrow"><SectionReveal as="span" direction="left">From idea to outcome</SectionReveal></p>
          <SectionReveal as="h2" direction="left" delay={0.05}>Let&apos;s make something rare.</SectionReveal>
          <SectionReveal as="p" direction="up" delay={0.1}>
            Send us your brief. We&apos;ll give you a straight read on scope, timeline, cost, and the first move if it&apos;s a fit.
          </SectionReveal>
          <SectionReveal direction="up" delay={0.15}>
            <a href={`mailto:${SITE.email}`} className="btn btn-solid">Start a project <span aria-hidden="true">→</span></a>
          </SectionReveal>
        </section>
      </main>
      <BreadcrumbSchema trail={[{ name: REVIEWS_TITLE, path: '/reviews' }]} />
      <FaqSchema faq={REVIEWS_FAQ} />
      {/* Google requires AggregateRating to be backed by actual Review nodes
          with named authors. These are real, attributable client reviews —
          never synthesise entries here, and keep parseDate in sync with the
          human-readable `date` strings in lib/reviews.js. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: `${REVIEWS_TITLE} — ${SITE.name}`,
            numberOfItems: REVIEWS.length,
            itemListElement: REVIEWS.map((review, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              item: {
                '@type': 'Review',
                '@id': absoluteUrl(`/reviews#${review.id}`),
                name: review.headline,
                reviewBody: review.body.join(' '),
                datePublished: isoDate(review.date),
                author: { '@type': 'Person', name: review.reviewer },
                reviewRating: {
                  '@type': 'Rating',
                  ratingValue: review.rating,
                  bestRating: 5,
                  worstRating: 1,
                },
                itemReviewed: { '@id': `${absoluteUrl('/')}#organization` },
              },
            })),
          }),
        }}
      />
    </MarketingShell>
  );
}
