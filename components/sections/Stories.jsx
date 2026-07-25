'use client';

import { useId, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';
import { REVIEWS } from '../../lib/reviews';
import { useCardMouseReveal } from '../CardHoverReveal';

const HOME_REVIEW_IDS = ['vaughn-hebron', 'porsha-patterson', 'style-loft'];
const REVIEWS_BY_ID = new Map(REVIEWS.map((review) => [review.id, review]));

const STORIES = HOME_REVIEW_IDS.map((id) => REVIEWS_BY_ID.get(id)).map((review) => {
  const initials = review.reviewer
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return {
    id: review.id,
    tab: review.company || review.reviewer,
    quote: review.body[0],
    reviewer: review.reviewer,
    company: review.company || null,
    rating: review.rating,
    date: review.date,
    initials: initials || review.reviewer.slice(0, 2).toUpperCase(),
  };
});

export default function Stories() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);
  const idPrefix = useId();
  const boardRef = useRef(null);

  const tabId = (index) => `${idPrefix}-story-tab-${index}`;
  const panelId = (index) => `${idPrefix}-story-panel-${index}`;

  const activateTab = (index) => {
    setActive(index);
    tabRefs.current[index]?.focus();
  };

  const onTabKeyDown = (event, index) => {
    let nextIndex = null;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (index + 1) % STORIES.length;
        break;
      case 'ArrowLeft':
        nextIndex = (index - 1 + STORIES.length) % STORIES.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = STORIES.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    activateTab(nextIndex);
  };

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
          <p>Feedback collected from Crystal Web Solution clients is presented as part of the studio&apos;s history.</p>
        </SectionReveal>
      </div>

      <SectionReveal delay={0.15} direction="up">
        <div className="stories-tabs" role="tablist" aria-label="Client stories" aria-orientation="horizontal">
          {STORIES.map((s, i) => (
            <button
              key={s.tab}
              ref={(element) => { tabRefs.current[i] = element; }}
              type="button"
              role="tab"
              id={tabId(i)}
              aria-selected={i === active}
              aria-controls={panelId(i)}
              tabIndex={i === active ? 0 : -1}
              className={`stories-tab${i === active ? ' active' : ''}`}
              onClick={() => activateTab(i)}
              onKeyDown={(event) => onTabKeyDown(event, i)}
            >
              {s.tab}
            </button>
          ))}
        </div>
      </SectionReveal>

      <div className="stories-grid" ref={boardRef}>
        {STORIES.map((story, i) => {
          const selected = i === active;
          const { cardRef: storyRef, onMouseMove: onStoryMouseMove } = useCardMouseReveal();

          return (
            <article
              key={`${story.id}-${selected ? active : 'hidden'}`}
              ref={storyRef}
              className={`story-card${selected ? ' is-active' : ''}`}
              aria-live="polite"
              onMouseMove={onStoryMouseMove}
            >
              <div className="story-card-header">
                <div className="story-card-avatar" aria-hidden="true">
                  {story.initials}
                </div>
                <div className="story-card-meta">
                  <h3>{story.reviewer}</h3>
                  <p>
                    {story.company}
                    {story.company ? ' • ' : ''}
                    {story.rating}/5 • {story.date}
                  </p>
                </div>
              </div>

              <p className="story-card-quote">&ldquo;{story.quote}&rdquo;</p>

              <div className="story-card-footer">
                <span>{REVIEWS_BY_ID.get(story.id)?.reviewCount ?? 1} review{((REVIEWS_BY_ID.get(story.id)?.reviewCount ?? 1) === 1 ? '' : 's')}</span>
                <a className="story-card-link" href={`/reviews#${story.id}`}>Open record →</a>
              </div>
            </article>
          );
        })}
      </div>

      <SectionReveal className="stories-cta" delay={0.1} direction="up">
        <a href="/reviews" className="link-underline" data-cursor="Read">Read all client reviews →</a>
      </SectionReveal>
    </section>
  );
}
