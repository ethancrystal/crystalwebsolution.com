'use client';

import Link from 'next/link';

// "Selected work" beat — a dark, scroll-snap card rail. No WebGL, no SMIL,
// no pinned ScrollTrigger: a self-contained DOM section that overlays the
// fixed canvas as the camera flies past the motion cluster. Every card is a
// real <a> (next/link) so deep links and keyboard focus work natively.
// Card copy/accents ported 1:1 from the Claude Design prototype
// (Selected Work.dc.html).
const MOTION_CARDS = [
  { num: '01', title: 'Tucker Trips', category: 'Web & App Development', accent: '#c084fc', href: '/work#tucker-trips' },
  { num: '02', title: 'Talk to My Lawyer', category: 'Web & App Development', accent: '#59f3ff', href: '/work#talk-to-my-lawyer' },
  { num: '03', title: 'Style', category: 'E-Commerce', accent: '#ff8dd1', href: '/work' },
  { num: '04', title: 'Zeus Towing', category: 'Web Design', accent: '#ffc64a', href: '/work#zues-towing' },
  { num: '05', title: 'Prestige One', category: 'Web & App Development', accent: '#63d9ff', href: '/work' },
  { num: '06', title: 'Crystal Web Solution', category: 'Immersive Web Experience', accent: '#9678ff', href: '/work' },
];

const DEEP_LINK_PROGRESS = 0.32;

export default function Motion() {
  return (
    <section
      className="section motion"
      id="motion"
      data-anchor-progress={DEEP_LINK_PROGRESS}
      data-nav-tone="dark"
    >
      <div className="motion-inner">
        <div className="motion-head">
          <div>
            <p className="eyebrow motion-eyebrow">Named client record</p>
            <h2>Real names. Real businesses. No invented case studies.</h2>
          </div>
          <Link href="/work" className="motion-link">
            View all work <span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="swrail motion-rail">
          {MOTION_CARDS.map((card) => (
            <Link
              key={card.num}
              href={card.href}
              className={`motion-card motion-card--${card.num}`}
              style={{ '--accent': card.accent }}
              aria-label={`${card.title} — view project`}
            >
              <span className="motion-card-ghost" aria-hidden="true">{card.num}</span>
              <span className="motion-card-cat">{card.category}</span>
              <div className="motion-card-body">
                <div className="motion-card-title">{card.title}</div>
                <div className="motion-card-cta">
                  View project <span aria-hidden="true">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
