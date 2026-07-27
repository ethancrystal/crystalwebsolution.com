'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import SectionReveal from '../SectionReveal';
import Marquee from '../Marquee';
import MagnifiedBento from '../MagnifiedBento';
import { light, dim } from '../../lib/beacon';
import { STAGGER_ROW, DURATION_FAST, DURATION_NORMAL, EASE_SETTLE } from '../../lib/easing';

// Copy follows the website-app-copy skill: PAS (Problem–Agitation–Solution)
// compressed into one line per card. Visitors arrive in pain; we name it,
// twist it, then present Crystal as the inevitable answer.
const SERVICES = [
  {
    n: '01',
    title: 'Web Design',
    desc: 'Your site looks like everyone else and quietly loses the deal before a word is read — so we design with intent, clarity and craft that earns the click and the close.',
  },
  {
    n: '02',
    title: 'Development',
    desc: 'That internal tool or product idea keeps stalling in hand-off limbo while technical debt piles up — we architect and ship web apps your team can own and extend.',
  },
  {
    n: '03',
    title: 'Branding',
    desc: 'If prospects cannot tell you apart from the next vendor, every ad dollar works twice as hard for half the return — we build brand systems grounded in strategy and craft, not trends.',
  },
  {
    n: '04',
    title: 'Logo Design',
    desc: 'A templated mark signals "not serious" in every deck and profile you send — we design logos with restraint and meaning that hold up at any size and age well.',
  },
  {
    n: '05',
    title: 'Digital Marketing',
    desc: 'You pour budget into channels with no clear line to revenue while sharper competitors take the pipeline — we run campaigns tied to outcomes, measured and sharpened, not vanity metrics.',
  },
  {
    n: '06',
    title: 'Animation',
    desc: 'When your product needs a paragraph to explain, the room has already tuned out — we craft motion, explainers and 3D that make the complex obvious and stick.',
  },
  {
    n: '07',
    title: 'AI Automation',
    desc: 'Your team burns hours on work software should own, handing velocity to whoever automates first — we build AI automations that take the repetitive load off your plate.',
  },
  {
    n: '08',
    title: 'Workflow Automation',
    desc: 'When your tools do not talk, every hand-off drops a deadline and a customer nobody owns — we wire your stack together and automate the workflows that leak.',
  },
];

export default function Services() {
  const listRef = useRef(null);
  const markerRef = useRef(null);
  const markerNumRef = useRef(null);
  const moveMarker = useRef(null);
  const fadeMarker = useRef(null);
  const markerPlaced = useRef(false);

  // Ghost numeral: a shared, absolutely-positioned marker in the intro/list
  // gutter that glides to track whichever row is hovered — a single tracked
  // element migrating across the list, distinct from the per-card primitives
  // (BorderGlow/GlyphMask/CardHoverReveal) used elsewhere. Desktop-only, same
  // pointer/reduced-motion bail as GlyphMask.jsx.
  useEffect(() => {
    if (
      window.matchMedia('(pointer: coarse)').matches
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) return undefined;

    const marker = markerRef.current;
    if (!marker) return undefined;

    gsap.set(marker, { yPercent: -50 });
    moveMarker.current = gsap.quickTo(marker, 'y', { duration: DURATION_NORMAL, ease: EASE_SETTLE });
    fadeMarker.current = gsap.quickTo(marker, 'opacity', { duration: DURATION_FAST, ease: 'none' });

    return () => {
      gsap.killTweensOf(marker);
      moveMarker.current = null;
      fadeMarker.current = null;
      markerPlaced.current = false;
    };
  }, []);

  function focusRow(i, e) {
    light(i);
    const list = listRef.current;
    if (!list || !markerRef.current) return;
    const rowRect = e.currentTarget.getBoundingClientRect();
    const listRect = list.getBoundingClientRect();
    const centerY = rowRect.top - listRect.top + rowRect.height / 2;
    if (markerNumRef.current) markerNumRef.current.textContent = SERVICES[i].n;
    if (!markerPlaced.current) {
      gsap.set(markerRef.current, { y: centerY });
      markerPlaced.current = true;
    } else {
      moveMarker.current?.(centerY);
    }
    fadeMarker.current?.(1);
  }

  return (
    <section className="section services" id="services" data-quiet>
      <div className="services-catalogue">
        <div className="text-plate services-intro">
          <p className="eyebrow"><SectionReveal as="span" direction="left">What we do</SectionReveal></p>
          <SectionReveal as="h2" direction="left" className="section-title">
            Focused vision. Measured execution.
          </SectionReveal>
        </div>
        <div className="services-list" ref={listRef} onPointerLeave={() => fadeMarker.current?.(0)}>
          <div className="service-marker" ref={markerRef} aria-hidden="true">
            <span className="service-marker-num" ref={markerNumRef} />
          </div>
          {SERVICES.map((s, i) => (
            <SectionReveal
              key={s.n}
              className="service-row"
              delay={i * STAGGER_ROW}
              direction="left"
              as="div"
              onPointerEnter={(e) => focusRow(i, e)}
              onPointerLeave={dim}
            >
              <span className="service-num">{s.n}</span>
              <h3 className="service-title" data-hover data-cursor="✦">
                <span className="service-title-inner">{s.title}</span>
              </h3>
              <p className="service-desc">{s.desc}</p>
            </SectionReveal>
          ))}
        </div>
      </div>
      <Marquee text="Strategy · Brand · Immersive 3D · Development · Motion" className="services-marquee" />
      <SectionReveal className="services-bento" direction="up" delay={0.1}>
        <MagnifiedBento />
      </SectionReveal>
    </section>
  );
}
