'use client';

import { useId, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';
import { REVIEWS } from '../../lib/reviews';

const HOME_REVIEW_IDS = ['vaughn-hebron', 'porsha-patterson', 'style-loft'];
const REVIEWS_BY_ID = new Map(REVIEWS.map((review) => [review.id, review]));

const STORIES = HOME_REVIEW_IDS.map((id) => REVIEWS_BY_ID.get(id)).map((review) => ({
  tab: review.company || review.reviewer,
  quote: review.body[0],
  author: `${review.company ? `${review.company} • ` : ''}${review.rating}/5 • ${review.date}`,
}));

// Client stories: testimonial tabs switch the big quote. Quiet section (see
// FocusVeil) — it's a passage to read, like About/Facts.
export default function Stories() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef([]);
  const idPrefix = useId();

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
        <p className="eyebrow"><SectionReveal as="span" direction="left">Client reviews</SectionReveal></p>
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
      {STORIES.map((story, i) => {
        const selected = i === active;
        // The selected panel remounts on each switch so the existing CSS
        // quote fade replays, while every tab retains a real controlled panel.
        return (
          <blockquote
            key={`${story.tab}-${selected ? active : 'hidden'}`}
            className="stories-quote"
            id={panelId(i)}
            role="tabpanel"
            aria-labelledby={tabId(i)}
            tabIndex={selected ? 0 : -1}
            hidden={!selected}
          >
            <p>&ldquo;{story.quote}&rdquo;</p>
            <footer className="stories-author">— {story.author}</footer>
          </blockquote>
        );
      })}
      <SectionReveal className="stories-cta" delay={0.1} direction="up">
        <a href="/reviews" className="link-underline" data-cursor="Read">Read all client reviews →</a>
      </SectionReveal>
    </section>
  );
}
