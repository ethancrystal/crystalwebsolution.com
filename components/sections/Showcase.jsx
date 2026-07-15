'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS } from '../../lib/projects';
import { seekSmilTimeline, workStageAt } from '../../lib/smilTimeline.mjs';
import { pinnedRanges } from '../../lib/pinnedRanges';

gsap.registerPlugin(ScrollTrigger);

const DURATION = 14;
const CURTAIN = [
  { label: 'STRATEGY', fill: '#f25a36', color: '#151612' },
  { label: 'IDENTITY', fill: '#d8ff4a', color: '#151612' },
  { label: 'IMMERSIVE', fill: '#8e78ff', color: '#f4f3ef' },
  { label: 'BUILD', fill: '#11130f', color: '#f4f3ef' },
];

// Cards are sized so ~2 sit fully in frame at once (with a peek of the next),
// and the belt advances one full card-step at a time instead of one long
// continuous glide — see buildBeltKeyframes below.
const CARD_W = 484;
const CARD_H = 650;
const CARD_SCALE = CARD_W / 320;
const CARD_STEP = 600;
const CARD_START_X = 150;
const CARD_Y = 210;
const VISIBLE_CARDS = 2;

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

export default function Showcase() {
  const rootRef = useRef(null);
  const svgRef = useRef(null);
  const terra = PROJECTS.find((project) => project.slug === 'terra-verde');
  const featured = [terra, ...PROJECTS.filter((project) => project !== terra)].filter(Boolean).slice(0, 5);
  const belt = buildBeltKeyframes(Math.max(featured.length - VISIBLE_CARDS, 0), CARD_STEP);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia('(max-width: 767px)').matches;
    if (reduced || compact) {
      seekSmilTimeline(svg, 0.58, DURATION);
      root.dataset.workStage = 'rail';
      return;
    }

    seekSmilTimeline(svg, 0, DURATION);
    const range = { start: 0, end: 0 };
    const trigger = ScrollTrigger.create({
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
        root.dataset.workStage = workStageAt(progress);
      },
    });
    range.start = trigger.start;
    range.end = trigger.end;
    pinnedRanges.push(range);

    return () => {
      trigger.kill();
      const index = pinnedRanges.indexOf(range);
      if (index !== -1) pinnedRanges.splice(index, 1);
    };
  }, []);

  return (
    <section className="section showcase showcase-smil" id="work" ref={rootRef} data-work-stage="building">
      <div className="showcase-smil-heading">
        <p>Selected work &amp; explorations</p>
        <h2>Hi, I&apos;m Terra.</h2>
      </div>
      <svg ref={svgRef} className="showcase-smil-stage" viewBox="0 0 1600 900" role="img" aria-label="Selected projects move horizontally before service curtains close">
        <g>
          {featured.map((project, index) => {
            const x = CARD_START_X + index * CARD_STEP;
            const accent = ['#8bd2c4', '#ff8c73', '#b9ff4a', '#9b87ff', '#ffd45b'][index];
            return (
              <a key={project.slug} href={`/work/${project.slug}`} aria-label={`View ${project.title} case study`}>
                <g transform={`translate(${x} ${CARD_Y})`}>
                  <animateTransform attributeName="transform" additive="sum" type="translate" begin="0s" dur={`${DURATION}s`} fill="freeze" values={belt.values} keyTimes={belt.keyTimes} />
                  <rect width={CARD_W} height={CARD_H} rx="6" fill="#f4f3ef" />
                  <g transform={`scale(${CARD_SCALE})`}>
                    <ProjectArtwork index={index} accent={accent} />
                  </g>
                  <text x="30" y="481" className="showcase-smil-title">{project.title}</text>
                  <text x="30" y="532" className="showcase-smil-meta">{project.category} / {project.year}</text>
                  <text x="30" y="611" className="showcase-smil-open">OPEN CASE STUDY →</text>
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
      <a href="/work" className="showcase-smil-all">All projects <span aria-hidden="true">→</span></a>
    </section>
  );
}
