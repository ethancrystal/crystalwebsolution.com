'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import CountUp from '../CountUp';
import { scrollState } from '../../lib/scrollState';
import { EASE_SETTLE } from '../../lib/easing';

const SORTS = ['Newest', 'Oldest', 'Highest', 'Lowest'];
const JUMP_TARGETS = [
  { id: 'reviews-title', label: 'Summary' },
  { id: 'response-standard-title', label: 'Our standard' },
  { id: 'archive-title', label: 'Reviews' },
  { id: 'reviews-close', label: 'Get in touch' },
];

function Rating({ value }) {
  return (
    <span className="review-rating" aria-label={`${value} out of 5 stars`}>
      <span aria-hidden="true">{'★'.repeat(value)}{'☆'.repeat(5 - value)}</span>
      <span>{value}/5</span>
    </span>
  );
}

function ReviewCard({ review }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = review.body.length > 3;
  const visibleBody = expanded ? review.body : review.body.slice(0, 3);

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
      <div className={`review-body ${expanded ? 'is-expanded' : ''}`}>
        {visibleBody.map((paragraph, index) => <p key={`${review.id}-${index}`}>{paragraph}</p>)}
      </div>
      {isLong && (
        <button type="button" className="work-row-more" onClick={() => setExpanded((v) => !v)}>
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

export default function ReviewsClient({ reviews }) {
  const [ratingFilter, setRatingFilter] = useState('All');
  const [sort, setSort] = useState('Newest');
  const [search, setSearch] = useState('');
  const [activeJump, setActiveJump] = useState(JUMP_TARGETS[0].id);
  const [showJumpBar, setShowJumpBar] = useState(false);
  const listRef = useRef(null);

  const filtered = useMemo(() => {
    let next = reviews;
    if (ratingFilter !== 'All') {
      next = next.filter((r) => r.rating === Number(ratingFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      next = next.filter((r) => (
        r.reviewer.toLowerCase().includes(q)
        || r.headline.toLowerCase().includes(q)
        || r.body.some((p) => p.toLowerCase().includes(q))
      ));
    }
    next = [...next];
    if (sort === 'Oldest') next.reverse();
    else if (sort === 'Highest') next.sort((a, b) => b.rating - a.rating);
    else if (sort === 'Lowest') next.sort((a, b) => a.rating - b.rating);
    return next;
  }, [reviews, ratingFilter, search, sort]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    gsap.fromTo(el, { opacity: 0.4, y: 6 }, { opacity: 1, y: 0, duration: 0.25, ease: EASE_SETTLE });
  }, [filtered]);

  useEffect(() => {
    const tick = () => {
      setShowJumpBar((current) => {
        const next = scrollState.progress > 0.08;
        return current === next ? current : next;
      });
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  useEffect(() => {
    const sections = JUMP_TARGETS
      .map((t) => document.getElementById(t.id))
      .filter(Boolean);
    if (!sections.length) return undefined;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setActiveJump(entry.target.id);
      });
    }, { rootMargin: '-20% 0px -70% 0px' });
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div className="reviews-instrument-row">
        <div className="reviews-instrument-chips" role="group" aria-label="Filter by rating">
          {['All', '5', '4', '3', '2', '1'].map((r) => (
            <button
              key={r}
              type="button"
              className={`work-filter-chip ${ratingFilter === r ? 'is-active' : ''}`}
              onClick={() => setRatingFilter(r)}
            >
              {r === 'All' ? 'All' : `${r}★`}
            </button>
          ))}
        </div>
        <select
          className="reviews-sort-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort reviews"
        >
          {SORTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="search"
          className="reviews-search-input"
          placeholder="Search reviews…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search reviews"
        />
      </div>

      <div className="review-list" ref={listRef}>
        {filtered.map((review) => <ReviewCard key={review.id} review={review} />)}
        {filtered.length === 0 && <p className="reviews-empty">No reviews match those filters.</p>}
      </div>

      <nav className={`reviews-jump-bar ${showJumpBar ? 'is-visible' : ''}`} aria-label="Jump to section">
        {JUMP_TARGETS.map((t) => (
          <a
            key={t.id}
            href={`#${t.id}`}
            className={activeJump === t.id ? 'is-active' : ''}
          >
            {t.label}
          </a>
        ))}
      </nav>
    </>
  );
}

export function ReviewStat({ label, value, suffix = '' }) {
  const numeric = Number(value);
  const isNumeric = Number.isFinite(numeric);
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {isNumeric
          ? <CountUp value={numeric} suffix={suffix} decimals={Number.isInteger(numeric) ? 0 : 1} />
          : value}
      </dd>
    </div>
  );
}
