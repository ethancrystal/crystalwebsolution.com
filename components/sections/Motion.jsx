'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionStageAt, seekSmilTimeline } from '../../lib/smilTimeline.mjs';

gsap.registerPlugin(ScrollTrigger);

const DURATION = 12;
const KEY_TIMES = '0;0.1;0.55;0.78;1';
const KEY_SPLINES = '0.22 1 0.36 1;0.22 1 0.36 1;0.65 0 0.35 1;0.22 1 0.36 1';

const STUDIES = [
  { id: 'signal', title: 'SIGNAL / 01', subtitle: 'Brand systems', color: '#ff5b35', path: 'M -240 690 C 80 650 180 150 520 235 S 980 120 1180 245 C 920 360 610 260 330 275' },
  { id: 'field', title: 'FIELD / 02', subtitle: 'Spatial web', color: '#b9ff42', path: 'M -180 760 C 150 720 290 230 610 310 S 1050 180 1260 315 C 980 420 790 300 720 275' },
  { id: 'type', title: 'TYPE / 03', subtitle: 'Digital identity', color: '#ff8dd1', path: 'M -100 820 C 240 770 380 300 720 390 S 1140 240 1340 375 C 1190 430 1130 330 1110 275' },
  { id: 'commerce', title: 'COMMERCE / 04', subtitle: 'Product clarity', color: '#63d9ff', path: 'M -300 880 C 90 810 260 380 620 470 S 1020 300 1260 455 C 940 540 580 500 330 590' },
  { id: 'layers', title: 'LAYERS / 05', subtitle: 'Realtime 3D', color: '#9678ff', path: 'M -210 940 C 170 860 360 430 730 520 S 1120 360 1370 525 C 1080 620 830 530 720 590' },
  { id: 'motion', title: 'MOTION / 06', subtitle: 'Interaction study', color: '#ffc64a', path: 'M -100 990 C 260 900 430 500 820 595 S 1220 420 1450 610 C 1310 690 1180 600 1110 590' },
];

function StudyCard({ study, index }) {
  return (
    <g className="motion-study" data-study={study.id}>
      <animateMotion dur={`${DURATION}s`} begin="0s" fill="freeze" path={study.path} keyTimes={KEY_TIMES} keyPoints="0;0;0.56;0.82;1" calcMode="linear" rotate="auto" />
      <animateTransform attributeName="transform" additive="sum" type="scale" dur={`${DURATION}s`} begin="0s" fill="freeze" values="0.5;0.5;1.08;0.94;1" keyTimes={KEY_TIMES} calcMode="spline" keySplines={KEY_SPLINES} />
      <animate attributeName="opacity" dur={`${DURATION}s`} begin="0s" fill="freeze" values="0;0;1;1;1" keyTimes={KEY_TIMES} />
      <g transform="translate(-160 -105)">
        <rect width="320" height="210" rx="6" fill="#f4f3ef" stroke="#11130f" strokeWidth="1.5" />
        <rect x="12" y="12" width="296" height="132" rx="3" fill={study.color} />
        <path d={`M 28 ${122 - index * 4} C 92 ${35 + index * 8}, 190 ${150 - index * 7}, 292 ${34 + index * 5}`} fill="none" stroke="#0b0d0b" strokeWidth="5" />
        <circle cx={58 + index * 31} cy={55 + (index % 2) * 42} r={18 + index * 2} fill="#0b0d0b" fillOpacity="0.9" />
        <text x="18" y="169" className="motion-study-title">{study.title}</text>
        <text x="18" y="194" className="motion-study-sub">{study.subtitle}</text>
        <text x="286" y="194" textAnchor="end" className="motion-study-index">0{index + 1}</text>
      </g>
    </g>
  );
}

export default function Motion() {
  const rootRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia('(max-width: 767px)').matches;
    const staticLayout = reduced || compact;
    seekSmilTimeline(svg, staticLayout ? 1 : 0, DURATION);
    root.dataset.motionStage = staticLayout ? 'grid' : 'hold';
    if (staticLayout) return;

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: '+=400%',
      pin: true,
      scrub: 0.65,
      anticipatePin: 1,
      onUpdate: ({ progress }) => {
        seekSmilTimeline(svg, progress, DURATION);
        root.dataset.motionStage = motionStageAt(progress);
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section className="section motion" id="motion" ref={rootRef} data-motion-stage="hold">
      <div className="motion-copy" aria-hidden="true">
        <span>DESIGN IN</span>
        <span>MOTION</span>
      </div>
      <h2 className="sr-only">Design in motion</h2>
      <p className="motion-caption">Concepts, explorations, and interface experiments from our creative process.</p>
      <a href="/#contact" className="motion-link" data-cursor="Hello">View the lab <span aria-hidden="true">→</span></a>
      <svg ref={svgRef} className="motion-smil-stage" viewBox="0 0 1440 900" role="img" aria-label="Six Crystal Web Solution studies orbit into a project grid">
        {STUDIES.map((study, index) => <StudyCard key={study.id} study={study} index={index} />)}
      </svg>
    </section>
  );
}
