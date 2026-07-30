'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PROJECTS } from '../../lib/projects';
import { seekSmilTimeline, workStageAt } from '../../lib/smilTimeline.mjs';

gsap.registerPlugin(ScrollTrigger);

const DURATION = 14;
const CURTAIN = [
  { label: 'STRATEGY', fill: '#f25a36', color: '#151612' },
  { label: 'IDENTITY', fill: '#d8ff4a', color: '#151612' },
  { label: 'IMMERSIVE', fill: '#8e78ff', color: '#f4f3ef' },
  { label: 'BUILD', fill: '#11130f', color: '#f4f3ef' },
];

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
    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: '+=450%',
      pin: true,
      scrub: 0.65,
      anticipatePin: 1,
      onUpdate: ({ progress }) => {
        seekSmilTimeline(svg, progress, DURATION);
        root.dataset.workStage = workStageAt(progress);
      },
    });

    return () => trigger.kill();
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
            const x = 150 + index * 365;
            const accent = ['#8bd2c4', '#ff8c73', '#b9ff4a', '#9b87ff', '#ffd45b'][index];
            return (
              <a key={project.slug} href={`/work/${project.slug}`} aria-label={`View ${project.title} case study`}>
                <g transform={`translate(${x} 210)`}>
                  <animateTransform attributeName="transform" additive="sum" type="translate" begin="0s" dur={`${DURATION}s`} fill="freeze" values="0 0;0 0;-1320 0;-1320 0" keyTimes="0;0.18;0.82;1" />
                  <rect width="320" height="430" rx="6" fill="#f4f3ef" />
                  <ProjectArtwork index={index} accent={accent} />
                  <text x="20" y="318" className="showcase-smil-title">{project.title}</text>
                  <text x="20" y="352" className="showcase-smil-meta">{project.category} / {project.year}</text>
                  <text x="20" y="404" className="showcase-smil-open">OPEN CASE STUDY →</text>
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
