'use client';

import { useId, useRef, useState } from 'react';
import SectionReveal from '../SectionReveal';

// Original client stories from our own case-study work (lib/projects.js) —
// illustrative client names, written in-house. No borrowed testimonials.
const STORIES = [
  {
    tab: 'Aurora Finance',
    quote:
      'Our trading dashboard was technically complete and emotionally exhausting. Crystal rebuilt it as a calm instrument — task time dropped by a third before the case study went out. The traders felt it before we measured it.',
    author: 'Head of Product, Aurora Finance',
  },
  {
    tab: 'Northwind Labs',
    quote:
      'Our research was rigorous and invisible. Crystal gave it a public face without dumbing it down — decoding type, live charts off our own data. Media citations tripled within six months.',
    author: 'Communications Lead, Northwind Labs',
  },
  {
    tab: 'Halcyon Audio',
    quote:
      'We asked for a launch site. We got an instrument: the headphones’ own frequency response sculpts the whole 3D scene in real time. Pre-orders sold out in eleven days, and the page now sells the product by itself.',
    author: 'Founder, Halcyon Audio',
  },
  {
    tab: 'Vesper Logistics',
    quote:
      'Our ops team lived in spreadsheets, hand-triaging the same tickets every morning. Crystal wired an AI layer that routes and drafts the routine eighty percent. My leads got three hours a day back, and nothing slips through now.',
    author: 'COO, Vesper Logistics',
  },
];

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
        <p className="eyebrow"><SectionReveal as="span" direction="left">Client stories</SectionReveal></p>
        <SectionReveal as="h2" direction="left" className="section-title">
          Great work is built through partnership.
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
        <a href="/#contact" className="link-underline" data-cursor="Hello">become a client →</a>
      </SectionReveal>
    </section>
  );
}
