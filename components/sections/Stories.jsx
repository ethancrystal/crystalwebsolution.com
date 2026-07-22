'use client';

import { useId, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import { REVIEWS, REVIEW_STATS } from '../../lib/reviews';
import { SITE } from '../../lib/site';

const HOME_REVIEW_IDS = ['vaughn-hebron', 'porsha-patterson', 'style-loft'];
const REVIEWS_BY_ID = new Map(REVIEWS.map((review) => [review.id, review]));

const STORIES = HOME_REVIEW_IDS.map((id) => REVIEWS_BY_ID.get(id)).map((review) => ({
  tab: review.company || review.reviewer,
  quote: review.body[0],
  author: review.reviewer,
  company: review.company,
  meta: `${review.rating}/5 • ${review.date}`,
}));

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
        <p className="eyebrow"><SectionReveal as="span" direction="left">Client voices</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Work people remember. Partnerships they recommend.
        </SectionReveal>
        <SectionReveal className="stories-intro" direction="up" delay={0.08}>
          <p>Clients describe the care, service, and follow-through behind the work in their own words.</p>
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
            <footer className="stories-author">
              — {story.author}{story.company ? ` · ${story.company}` : ''} · {story.meta}
            </footer>
          </blockquote>
        );
      })}
      <SectionReveal as="dl" className="reviews-summary stories-summary" delay={0.1} direction="up" aria-label="Studio highlights">
        <div><dt>Established</dt><dd>Est. {SITE.founded} · {SITE.experience}</dd></div>
        <div><dt>Delivery</dt><dd>{SITE.projectsShipped}</dd></div>
        <div><dt>Studios</dt><dd>{SITE.cityCompact}</dd></div>
        <div><dt>Reviews</dt><dd><a href="/reviews" className="link-underline">{REVIEW_STATS.total} published reviews →</a></dd></div>
      </SectionReveal>
      <Marquee text={`${SITE.name} · ${SITE.tagline}`} className="stories-marquee" baseSpeed={38} />
    </section>
  );
}
