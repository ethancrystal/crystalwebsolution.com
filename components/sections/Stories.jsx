'use client';

import { useState } from 'react';
import DecodeText from '../DecodeText';
import Reveal from '../Reveal';

// Original placeholder testimonials from our own case-study clients
// (lib/projects.js) — no borrowed names or quotes.
const STORIES = [
  {
    tab: 'Aurora Finance',
    quote:
      'They treated our dashboard like an instrument, not a spreadsheet. Task time dropped by a third — traders noticed before the case study did.',
    author: 'Head of Product, Aurora Finance',
  },
  {
    tab: 'Northwind Labs',
    quote:
      'Our research had always been rigorous and invisible. Crystal Web Solution made it legible without making it smaller.',
    author: 'Communications Lead, Northwind Labs',
  },
  {
    tab: 'Halcyon Audio',
    quote:
      'Every visitor hears a different room. We asked for a launch site and got an instrument that sells the product by itself.',
    author: 'Founder, Halcyon Audio',
  },
];

// Client stories: testimonial tabs switch the big quote. Quiet section (see
// FocusVeil) — it's a passage to read, like About/Facts.
export default function Stories() {
  const [active, setActive] = useState(0);
  const story = STORIES[active];

  return (
    <section className="section stories" id="stories" data-quiet>
      <div className="text-plate">
        <p className="eyebrow"><Reveal as="span">Client stories</Reveal></p>
        <DecodeText as="h2" text="Great work is built through partnership." className="section-title" />
      </div>
      <Reveal delay={0.15}>
        <div className="stories-tabs" role="tablist" aria-label="Client stories">
          {STORIES.map((s, i) => (
            <button
              key={s.tab}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={`stories-tab${i === active ? ' active' : ''}`}
              onClick={() => setActive(i)}
            >
              {s.tab}
            </button>
          ))}
        </div>
      </Reveal>
      {/* key remounts the quote so the CSS fade replays per tab switch */}
      <blockquote className="stories-quote" key={active}>
        <p>&ldquo;{story.quote}&rdquo;</p>
        <footer className="stories-author">— {story.author}</footer>
      </blockquote>
      <Reveal className="stories-cta" delay={0.1}>
        <a href="/#contact" className="link-underline" data-cursor="Hello">become a client →</a>
      </Reveal>
    </section>
  );
}
