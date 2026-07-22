'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { createMotionStudyTiming, MOTION_STUDIES } from '../../lib/motionStudies.mjs';
import { motionStageAt, seekSmilTimeline } from '../../lib/smilTimeline.mjs';
import {
  labFlight,
  subscribeLabFlight,
  updateLabFlight,
} from '../../lib/labFlight.mjs';
import { DEFAULT_MOTION_LAYOUT, shouldUseStaticMotionLayout } from '../../lib/motionLayout.mjs';
import { LAB_WINDOW } from '../../lib/journey';
import { scrollState } from '../../lib/scrollState';
import { useExperienceFeatures } from '../../lib/useExperienceFeatures';

// The design lab: concept studies fly a full orbital lap over the giant
// DESIGN IN MOTION statement, then settle. Shares the Selected Work beat's
// architecture — a WebGL carousel (LabCarousel) upgrades the scroll-seeked
// SMIL stage only after proving a rendered frame; reduced-motion and compact
// visitors get the settled study grid directly.
const DURATION = 12;
const STATIC_QUERY = '(prefers-reduced-motion: reduce)';
const KEY_SPLINES = '0.22 1 0.36 1;0.22 1 0.36 1;0.65 0 0.35 1;0.22 1 0.36 1;0.22 1 0.36 1';

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function StudyCard({ study, index }) {
  const timing = createMotionStudyTiming(index);

  return (
    <g className="motion-study" data-study={study.id}>
      <animateMotion dur={`${DURATION}s`} begin="0s" fill="freeze" path={study.path} keyTimes={timing.motionKeyTimes} keyPoints="0;0;0.56;0.82;1;1" calcMode="linear" rotate="auto" />
      <animateTransform attributeName="transform" additive="sum" type="scale" dur={`${DURATION}s`} begin="0s" fill="freeze" values="0.5;0.5;1.08;0.94;1;1" keyTimes={timing.motionKeyTimes} calcMode="spline" keySplines={KEY_SPLINES} />
      <animate attributeName="opacity" dur={`${DURATION}s`} begin="0s" fill="freeze" values="0;0;1;1;1;1" keyTimes={timing.opacityKeyTimes} />
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

function StaticStudyCard({ study, index }) {
  return (
    <article className="lab-static-card">
      <svg className="lab-static-art" viewBox="0 0 320 132" aria-hidden="true">
        <rect width="320" height="132" fill={study.color} />
        <path d={`M 28 ${122 - index * 4} C 92 ${35 + index * 8}, 190 ${150 - index * 7}, 292 ${34 + index * 5}`} fill="none" stroke="#0b0d0b" strokeWidth="5" />
        <circle cx={58 + index * 31} cy={55 + (index % 2) * 42} r={18 + index * 2} fill="#0b0d0b" fillOpacity="0.9" />
      </svg>
      <div className="lab-static-meta">
        <strong>{study.title}</strong>
        <span>{study.subtitle}</span>
        <span>0{index + 1}</span>
      </div>
    </article>
  );
}

export default function Lab() {
  const rootRef = useRef(null);
  const svgRef = useRef(null);
  const { flyingCarousel } = useExperienceFeatures();

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return undefined;

    const media = window.matchMedia(STATIC_QUERY);
    let staticLayout = true;
    let useWebGL = false;
    let prewarmObserver = null;
    let tickerAttached = false;

    const applyRenderer = () => {
      const renderer = useWebGL && labFlight.ready ? 'webgl' : 'legacy';
      root.dataset.labRenderer = renderer;
      if (renderer === 'legacy' && !staticLayout) {
        seekSmilTimeline(svg, labFlight.progress, DURATION);
      }
    };

    const syncProgress = () => {
      const span = Math.max(LAB_WINDOW.end - LAB_WINDOW.start, 0.0001);
      const progress = clamp01((scrollState.progress - LAB_WINDOW.start) / span);
      const active = useWebGL
        && scrollState.progress >= LAB_WINDOW.start
        && scrollState.progress < LAB_WINDOW.end;

      labFlight.progress = progress;
      if (labFlight.active !== active) updateLabFlight({ active });
      if (!useWebGL || !labFlight.ready) seekSmilTimeline(svg, progress, DURATION);

      const stage = motionStageAt(progress);
      if (root.dataset.labStage !== stage) root.dataset.labStage = stage;
    };

    const stopAnimatedLayout = () => {
      prewarmObserver?.disconnect();
      prewarmObserver = null;
      if (tickerAttached) {
        gsap.ticker.remove(syncProgress);
        tickerAttached = false;
      }
      updateLabFlight({
        enabled: false,
        active: false,
        prewarm: false,
        progress: 0,
        ready: false,
      });
    };

    const configure = () => {
      stopAnimatedLayout();
      staticLayout = shouldUseStaticMotionLayout({
        reducedMotion: media.matches,
        flyingCarousel,
      });
      useWebGL = flyingCarousel && !staticLayout;
      root.dataset.labLayout = staticLayout ? 'static' : 'animated';
      root.dataset.labStage = staticLayout ? 'grid' : 'hold';

      if (staticLayout) {
        seekSmilTimeline(svg, 1, DURATION);
        applyRenderer();
        return;
      }

      updateLabFlight({
        enabled: true,
        active: false,
        prewarm: false,
        progress: 0,
        ready: false,
      });
      seekSmilTimeline(svg, 0, DURATION);

      if ('IntersectionObserver' in window) {
        prewarmObserver = new IntersectionObserver(
          ([entry]) => updateLabFlight({ prewarm: entry.isIntersecting }),
          { rootMargin: '150% 0px' },
        );
        prewarmObserver.observe(root);
      } else {
        updateLabFlight({ prewarm: true });
      }

      gsap.ticker.add(syncProgress);
      tickerAttached = true;
      syncProgress();
      applyRenderer();
    };

    const unsubscribe = subscribeLabFlight(applyRenderer);
    configure();
    media.addEventListener('change', configure);

    return () => {
      media.removeEventListener('change', configure);
      unsubscribe();
      stopAnimatedLayout();
      root.dataset.labRenderer = 'legacy';
    };
  }, [flyingCarousel]);

  return (
    <section
      className="section lab"
      id="lab"
      ref={rootRef}
      data-nav-tone="light"
      data-lab-layout={DEFAULT_MOTION_LAYOUT}
      data-lab-stage="hold"
      data-lab-renderer="legacy"
    >
      <div className="lab-sticky">
        <div className="lab-copy" aria-hidden="true">
          <span>DESIGN IN</span>
          <span>MOTION</span>
        </div>
        <h2 className="sr-only">Design in motion</h2>
        <p className="lab-caption">Concepts, explorations, and interface experiments from our creative process.</p>
        <Link href="/work" className="lab-link">View the lab <span aria-hidden="true">→</span></Link>
        <svg ref={svgRef} className="lab-smil-stage" viewBox="0 0 1440 900" aria-hidden="true">
          {MOTION_STUDIES.map((study, index) => (
            <StudyCard key={study.id} study={study} index={index} />
          ))}
        </svg>
        <div className="lab-static-grid">
          {MOTION_STUDIES.map((study, index) => (
            <StaticStudyCard key={study.id} study={study} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
