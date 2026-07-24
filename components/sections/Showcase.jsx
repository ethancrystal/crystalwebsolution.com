'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { VERIFIED_CLIENTS } from '../../lib/clients';
import { seekSmilTimeline, workStageAt } from '../../lib/smilTimeline.mjs';
import { pinnedRanges } from '../../lib/pinnedRanges';
import { blurSlab, focusSlab } from '../../lib/focusBeacon';

gsap.registerPlugin(ScrollTrigger);

const DURATION = 14;
const STATIC_QUERY = '(max-width: 900px), (prefers-reduced-motion: reduce)';
const CURTAIN = [
  { label: 'STRATEGY', fill: '#f25a36', color: '#151612' },
  { label: 'IDENTITY', fill: '#d8ff4a', color: '#151612' },
  { label: 'IMMERSIVE', fill: '#8e78ff', color: '#f4f3ef' },
  { label: 'BUILD', fill: '#11130f', color: '#f4f3ef' },
];

// Keep the rail below the intro copy on short desktop viewports. Three cards
// can sit in frame without clipping their case-study details, while the belt
// still advances one full card-step at a time.
const CARD_W = 400;
const CARD_H = 480;
const CARD_SCALE = CARD_W / 320;
const CARD_STEP = 468;
const CARD_START_X = 64;
const CARD_Y = 405;
const VISIBLE_CARDS = 3;
const CARD_ACCENTS = ['#8bd2c4', '#ff8c73', '#b9ff4a', '#9b87ff', '#ffd45b'];

function buildBeltKeyframes(steps, distance, start = 0.18, end = 0.82) {
  if (steps <= 0) return { values: '0 0;0 0', keyTimes: '0;1' };
  const span = end - start;
  const cycle = span / steps;
  const moveFrac = cycle * 0.45;
  const holdFrac = cycle - moveFrac;
  const keyTimes = [0, start];
  const values = ['0 0', '0 0'];
  let t = start;
  let x = 0;
  for (let i = 0; i < steps; i += 1) {
    x -= distance;
    t += moveFrac;
    keyTimes.push(Number(t.toFixed(4)));
    values.push(`${x} 0`);
    t += holdFrac;
    keyTimes.push(Number(t.toFixed(4)));
    values.push(`${x} 0`);
  }
  keyTimes.push(1);
  values.push(`${x} 0`);
  return { keyTimes: keyTimes.join(';'), values: values.join(';') };
}

function beltOffsetAt(progress, steps, distance, start = 0.18, end = 0.82) {
  if (steps <= 0 || progress <= start) return 0;
  if (progress >= end) return -steps * distance;

  const cycle = (end - start) / steps;
  const moveDuration = cycle * 0.45;
  const elapsed = progress - start;
  const completed = Math.min(Math.floor(elapsed / cycle), steps - 1);
  const phase = elapsed - completed * cycle;
  const moving = Math.min(phase / moveDuration, 1);
  return -(completed + moving) * distance;
}

function ProjectArtwork({ index, accent }) {
  return (
    <g>
      <rect width="320" height="270" fill={accent} />
      {Array.from({ length: 7 }, (_, column) => (
        <rect key={column} x={24 + column * 42} y={38 + (column % 3) * 18} width="24" height={190 - (column % 3) * 30} fill="#11130f" fillOpacity={0.18 + index * 0.06} />
      ))}
      <path d="M22 225 C90 125 155 250 298 70" fill="none" stroke="#f6f4ee" strokeWidth="5" />
    </g>
  );
}

function StaticClientCard({ client, index }) {
  const accent = CARD_ACCENTS[index];

  return (
    <a
      href={`/work#${client.id}`}
      className="showcase-static-card"
      aria-label={`View the client record for ${client.company}`}
      data-showcase-static-card
      tabIndex={-1}
    >
      <svg className="showcase-static-art" viewBox="0 0 320 270" aria-hidden="true">
        <ProjectArtwork index={index} accent={accent} />
      </svg>
      <span className="showcase-static-body">
        <strong>{client.company}</strong>
        <span>{client.person}{client.role ? ` / ${client.role}` : ''}</span>
        <span>OPEN CLIENT RECORD →</span>
      </span>
    </a>
  );
}

export default function Showcase() {
  const rootRef = useRef(null);
  const svgRef = useRef(null);
  const featured = VERIFIED_CLIENTS;
  const belt = buildBeltKeyframes(Math.max(featured.length - VISIBLE_CARDS, 0), CARD_STEP);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const media = window.matchMedia(STATIC_QUERY);
    const svgCards = [...svg.querySelectorAll('[data-showcase-card]')];
    const staticGrid = root.querySelector('[data-showcase-static-grid]');
    const staticCards = [...root.querySelectorAll('[data-showcase-static-card]')];
    let trigger = null;
    let range = null;
    let interactiveSignature = '';

    const removePinnedRange = () => {
      trigger?.kill();
      trigger = null;
      if (range) {
        const index = pinnedRanges.indexOf(range);
        if (index !== -1) pinnedRanges.splice(index, 1);
        range = null;
      }
    };

    const setSvgCardsInteractive = (enabled, firstVisible = 0) => {
      const signature = enabled ? `visible-${firstVisible}` : 'hidden';
      if (signature === interactiveSignature) return;
      interactiveSignature = signature;

      svgCards.forEach((card, index) => {
        const reachable = enabled && index >= firstVisible && index < firstVisible + VISIBLE_CARDS;
        if (reachable) {
          card.removeAttribute('tabindex');
          card.removeAttribute('aria-hidden');
        } else {
          card.setAttribute('tabindex', '-1');
          card.setAttribute('aria-hidden', 'true');
          if (document.activeElement === card) card.blur?.();
        }
      });
      if (!enabled) blurSlab();
    };

    const setStaticCardsInteractive = (enabled) => {
      staticCards.forEach((card) => {
        if (enabled) card.removeAttribute('tabindex');
        else card.setAttribute('tabindex', '-1');
      });
      staticGrid?.setAttribute('aria-hidden', enabled ? 'false' : 'true');
      svg.setAttribute('aria-hidden', enabled ? 'true' : 'false');
    };

    const configure = () => {
      removePinnedRange();
      interactiveSignature = '';

      if (media.matches) {
        root.dataset.showcaseLayout = 'static';
        root.dataset.workStage = 'rail';
        seekSmilTimeline(svg, 1, DURATION);
        setSvgCardsInteractive(false);
        setStaticCardsInteractive(true);
        return;
      }

      root.dataset.showcaseLayout = 'animated';
      setStaticCardsInteractive(false);
      seekSmilTimeline(svg, 0, DURATION);
      setSvgCardsInteractive(true, 0);
      range = { start: 0, end: 0 };
      trigger = ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: '+=450%',
        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        onRefresh: (self) => {
          range.start = self.start;
          range.end = self.end;
        },
        onUpdate: ({ progress }) => {
          seekSmilTimeline(svg, progress, DURATION);
          const stage = workStageAt(progress);
          root.dataset.workStage = stage;
          const cardsVisible = stage === 'building' || stage === 'rail';
          const offset = beltOffsetAt(progress, featured.length - VISIBLE_CARDS, CARD_STEP);
          const firstVisible = Math.max(0, Math.min(
            featured.length - VISIBLE_CARDS,
            Math.round(-offset / CARD_STEP),
          ));
          setSvgCardsInteractive(cardsVisible, firstVisible);
        },
      });
      range.start = trigger.start;
      range.end = trigger.end;
      pinnedRanges.push(range);
    };

    configure();
    media.addEventListener('change', configure);

    return () => {
      media.removeEventListener('change', configure);
      removePinnedRange();
    };
  }, [featured.length]);

  return (
    <section className="section showcase showcase-smil" id="work" ref={rootRef} data-nav-tone="light" data-work-stage="building">
      <div className="showcase-smil-heading">
        <p>Named client record</p>
        <h2>Real names. Real businesses. No invented case studies.</h2>
        <p className="showcase-smil-sub">These three original client relationships were supplied directly to Crystal Web Solution. Where a review exists, it is linked in full and left in the client&apos;s own words.</p>
      </div>
      <svg ref={svgRef} className="showcase-smil-stage" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Verified Crystal Web Solution client records move horizontally before service curtains close">
        <g>
          {featured.map((client, index) => {
            const x = CARD_START_X + index * CARD_STEP;
            const accent = CARD_ACCENTS[index];
            return (
              <a
                key={client.id}
                href={`/work#${client.id}`}
                aria-label={`View the client record for ${client.company}`}
                data-showcase-card
                onPointerEnter={() => focusSlab(index)}
                onPointerLeave={blurSlab}
                onFocus={() => focusSlab(index)}
                onBlur={blurSlab}
              >
                <g transform={`translate(${x} ${CARD_Y})`}>
                  <animateTransform attributeName="transform" additive="sum" type="translate" begin="0s" dur={`${DURATION}s`} fill="freeze" values={belt.values} keyTimes={belt.keyTimes} />
                  <rect width={CARD_W} height={CARD_H} rx="6" fill="#f4f3ef" />
                  <g transform={`scale(${CARD_SCALE})`}>
                    <ProjectArtwork index={index} accent={accent} />
                  </g>
                  <text x="28" y="400" className="showcase-smil-title">{client.company}</text>
                  <text x="28" y="438" className="showcase-smil-meta">{client.person}{client.role ? ` / ${client.role}` : ''}</text>
                  <text x="28" y="464" className="showcase-smil-open">OPEN CLIENT RECORD →</text>
                </g>
              </a>
            );
          })}
        </g>
        {CURTAIN.map((band, index) => (
          <g key={band.label} transform={`translate(0 ${900 + index * 225})`}>
            <animateTransform attributeName="transform" additive="sum" type="translate" begin="0s" dur={`${DURATION}s`} fill="freeze" values="0 0;0 0;0 -900;0 -900" keyTimes="0;0.82;0.94;1" />
            <rect width="1600" height="226" fill={band.fill} />
            <text x="65" y="167" className="showcase-curtain-label" fill={band.color}>{band.label}</text>
          </g>
        ))}
      </svg>
      <div className="showcase-static-grid" data-showcase-static-grid aria-hidden="true">
        {featured.map((client, index) => (
          <StaticClientCard key={client.id} client={client} index={index} />
        ))}
      </div>
      <a href="/work" className="showcase-smil-all">View all work <span aria-hidden="true">→</span></a>
    </section>
  );
}
