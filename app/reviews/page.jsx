import Link from 'next/link';
import { REVIEWS, REVIEW_STATS } from '../../lib/reviews';
import { SITE } from '../../lib/site';
import { absoluteUrl } from '../../lib/seo.mjs';
import MarketingShell from '../../components/marketing/MarketingShell';
import SectionReveal from '../../components/SectionReveal';
import BreadcrumbSchema from '../../components/marketing/BreadcrumbSchema';
import ReviewArchive from '../../components/marketing/ReviewArchive';

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

          <ReviewArchive reviews={REVIEWS} />
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
