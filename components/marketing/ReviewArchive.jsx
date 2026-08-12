'use client';

import { useId, useMemo, useState } from 'react';

// Reviews-page instrument row: search + rating filter chips + sort, plus
// per-card expand/collapse for long bodies. REVIEWS is small (20 entries),
// so this filters/sorts in plain JS on every keystroke rather than reaching
// for a search library. The full unfiltered set still backs the page's
// AggregateRating/ItemList JSON-LD in app/reviews/page.jsx -- this component
// only changes what's visibly rendered, never what's reported to crawlers.
const RATING_FILTERS = [
  { key: 'all', label: 'All' },
  { key: '5', label: '5 stars' },
  { key: '4', label: '4 stars' },
  { key: 'critical', label: '3 & under' },
  { key: 'replied', label: 'Company replied' },
];

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'highest', label: 'Highest rated' },
  { key: 'lowest', label: 'Lowest rated' },
];

const LONG_BODY_CHARS = 420;

function Rating({ value }) {
  return (
    <span className="review-rating" aria-label={`${value} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
      <span>{value}/5</span>
    </span>
  );
}

function matchesQuery(review, query) {
  if (!query) return true;
  const haystack = [review.reviewer, review.company, review.headline, ...review.body]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

function matchesRatingFilter(review, filter) {
  if (filter === 'all') return true;
  if (filter === 'replied') return Boolean(review.reply);
  if (filter === 'critical') return review.rating <= 3;
  return review.rating === Number(filter);
}

function ReviewCard({ review }) {
  const bodyId = useId();
  const bodyChars = review.body.join(' ').length;
  const isLong = review.body.length > 1 || bodyChars > LONG_BODY_CHARS;
  const [expanded, setExpanded] = useState(!isLong);

  const visibleBody = expanded ? review.body : [`${review.body[0].slice(0, LONG_BODY_CHARS).trim()}…`];

  return (
    <article id={review.id} className={`review-card review-card-${review.rating}`}>
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
      <div className="review-body" id={bodyId}>
        {visibleBody.map((paragraph, index) => (
          <p key={`${review.id}-${index}`}>{paragraph}</p>
        ))}
      </div>
      {isLong && (
        <button
          type="button"
          className="review-body-toggle"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? 'Show less' : 'Read full review'}
        </button>
      )}
      {review.reply && (
        <aside className="review-reply">
          <strong>How we responded • {review.reply.date}</strong>
          <p>{review.reply.body}</p>
        </aside>
      )}
    </article>
  );
}

export default function ReviewArchive({ reviews }) {
  const [query, setQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const searchId = useId();

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const dated = reviews
      .filter((review) => matchesRatingFilter(review, ratingFilter) && matchesQuery(review, normalizedQuery))
      .map((review) => ({ review, time: Date.parse(review.date) || 0 }));

    dated.sort((a, b) => {
      if (sort === 'newest') return b.time - a.time;
      if (sort === 'oldest') return a.time - b.time;
      if (sort === 'highest') return b.review.rating - a.review.rating || b.time - a.time;
      return a.review.rating - b.review.rating || b.time - a.time;
    });

    return dated.map((entry) => entry.review);
  }, [reviews, ratingFilter, query, sort]);

  return (
    <>
      <div className="review-instrument">
        <div className="review-search">
          <label htmlFor={searchId} className="sr-only">Search reviews</label>
          <input
            id={searchId}
            type="search"
            placeholder="Search reviews…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="review-chips" role="group" aria-label="Filter by rating">
          {RATING_FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`review-chip${ratingFilter === option.key ? ' active' : ''}`}
              aria-pressed={ratingFilter === option.key}
              onClick={() => setRatingFilter(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="review-sort">
          <span className="sr-only">Sort reviews</span>
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            {SORT_OPTIONS.map((option) => (
              <option key={option.key} value={option.key}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="review-count" aria-live="polite">
        Showing {filtered.length} of {reviews.length} reviews
      </p>

      {filtered.length === 0 ? (
        <p className="review-empty">No reviews match your search. Try a different rating filter or search term.</p>
      ) : (
        <div className="review-list">
          {filtered.map((review) => <ReviewCard key={review.id} review={review} />)}
        </div>
      )}
    </>
  );
}
