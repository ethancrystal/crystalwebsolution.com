'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionStageAt, seekSmilTimeline } from '../../lib/smilTimeline.mjs';
import { MOTION_STUDIES } from '../../lib/motionStudies.mjs';
import {
  motionFlight,
  subscribeMotionFlight,
  updateMotionFlight,
} from '../../lib/motionFlight.mjs';
import { pinnedRanges } from '../../lib/pinnedRanges';
import { useExperienceFeatures } from '../../lib/useExperienceFeatures';
import { COMPACT_QUERY } from '../../lib/experienceFeatures.mjs';

gsap.registerPlugin(ScrollTrigger);

const DURATION = 12;
const KEY_TIMES = '0;0.1;0.55;0.78;1';
const KEY_SPLINES = '0.22 1 0.36 1;0.22 1 0.36 1;0.65 0 0.35 1;0.22 1 0.36 1';

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
  const { flyingCarousel } = useExperienceFeatures();

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const compact = window.matchMedia(COMPACT_QUERY).matches;
    const staticLayout = reduced || compact;
    const useWebGL = flyingCarousel && !staticLayout;
    const applyRenderer = () => {
      const renderer = useWebGL && motionFlight.ready ? 'webgl' : 'legacy';
      root.dataset.motionRenderer = renderer;
      // Keep the fallback caught up only while it can actually be shown. If
      // WebGL/context readiness is lost, this subscriber seeks it immediately.
      if (renderer === 'legacy') {
        seekSmilTimeline(svg, staticLayout ? 1 : motionFlight.progress, DURATION);
      }
    };

    updateMotionFlight({ enabled: useWebGL, active: false, progress: 0 });
    applyRenderer();
    const unsubscribe = subscribeMotionFlight(applyRenderer);
    root.dataset.motionStage = staticLayout ? 'grid' : 'hold';
    if (staticLayout) {
      return () => {
        unsubscribe();
        updateMotionFlight({ enabled: false, active: false, progress: 0 });
      };
    }

    const range = { start: 0, end: 0 };
    const trigger = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: '+=400%',
      pin: true,
      scrub: 0.65,
      anticipatePin: 1,
      onRefresh: (self) => {
        range.start = self.start;
        range.end = self.end;
      },
      onToggle: ({ isActive }) => {
        updateMotionFlight({ active: useWebGL && isActive });
      },
      onUpdate: ({ progress }) => {
        motionFlight.progress = progress;
        if (!useWebGL || !motionFlight.ready) {
          seekSmilTimeline(svg, progress, DURATION);
        }
        const stage = motionStageAt(progress);
        if (root.dataset.motionStage !== stage) {
          root.dataset.motionStage = stage;
        }
      },
    });
    range.start = trigger.start;
    range.end = trigger.end;
    pinnedRanges.push(range);

    return () => {
      unsubscribe();
      trigger.kill();
      const index = pinnedRanges.indexOf(range);
      if (index !== -1) pinnedRanges.splice(index, 1);
      updateMotionFlight({ enabled: false, active: false, progress: 0 });
      root.dataset.motionRenderer = 'legacy';
    };
  }, [flyingCarousel]);

  return (
    <section className="section motion" id="motion" ref={rootRef} data-motion-stage="hold" data-motion-renderer="legacy">
      <div className="motion-copy" aria-hidden="true">
        <span>DESIGN IN</span>
        <span>MOTION</span>
      </div>
      <h2 className="sr-only">Design in motion</h2>
      <p className="motion-caption">Concepts, explorations, and interface experiments from our creative process.</p>
      <a href="/#contact" className="motion-link" data-cursor="Hello">View the lab <span aria-hidden="true">→</span></a>
      <svg ref={svgRef} className="motion-smil-stage" viewBox="0 0 1440 900" role="img" aria-label="Six Crystal Web Solution studies orbit into a project grid">
        {MOTION_STUDIES.map((study, index) => <StudyCard key={study.id} study={study} index={index} />)}
      </svg>
    </section>
  );
}
