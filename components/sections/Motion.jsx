'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motionStageAt, seekSmilTimeline } from '../../lib/smilTimeline.mjs';
import {
  createMotionStudyTiming,
  MOTION_STUDIES,
} from '../../lib/motionStudies.mjs';
import {
  motionFlight,
  subscribeMotionFlight,
  updateMotionFlight,
} from '../../lib/motionFlight.mjs';
import { pinnedRanges } from '../../lib/pinnedRanges';
import { useExperienceFeatures } from '../../lib/useExperienceFeatures';
import {
  DEFAULT_MOTION_LAYOUT,
  shouldUseStaticMotionLayout,
} from '../../lib/motionLayout.mjs';

gsap.registerPlugin(ScrollTrigger);

const DURATION = 12;
const STATIC_QUERY = '(prefers-reduced-motion: reduce)';
const DEEP_LINK_PROGRESS = 0.32;
const KEY_SPLINES = '0.22 1 0.36 1;0.22 1 0.36 1;0.65 0 0.35 1;0.22 1 0.36 1;0.22 1 0.36 1';

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
    <article className="motion-static-card">
      <svg className="motion-static-art" viewBox="0 0 320 132" aria-hidden="true">
        <rect width="320" height="132" fill={study.color} />
        <path d={`M 28 ${122 - index * 4} C 92 ${35 + index * 8}, 190 ${150 - index * 7}, 292 ${34 + index * 5}`} fill="none" stroke="#0b0d0b" strokeWidth="5" />
        <circle cx={58 + index * 31} cy={55 + (index % 2) * 42} r={18 + index * 2} fill="#0b0d0b" fillOpacity="0.9" />
      </svg>
      <div className="motion-static-meta">
        <strong>{study.title}</strong>
        <span>{study.subtitle}</span>
        <span>0{index + 1}</span>
      </div>
    </article>
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

    const media = window.matchMedia(STATIC_QUERY);
    const staticGrid = root.querySelector('[data-motion-static-grid]');
    let staticLayout = shouldUseStaticMotionLayout({
      reducedMotion: media.matches,
      flyingCarousel,
    });
    let useWebGL = flyingCarousel && !staticLayout;
    let trigger = null;
    let range = null;
    let prewarmObserver = null;

    const applyRenderer = () => {
      const renderer = useWebGL && motionFlight.ready ? 'webgl' : 'legacy';
      root.dataset.motionRenderer = renderer;
      // Keep the fallback caught up only while it can actually be shown. If
      // WebGL/context readiness is lost, this subscriber seeks it immediately.
      if (renderer === 'legacy') {
        seekSmilTimeline(svg, staticLayout ? 1 : motionFlight.progress, DURATION);
      }
    };

    const unsubscribe = subscribeMotionFlight(applyRenderer);

    const stopAnimatedLayout = () => {
      prewarmObserver?.disconnect();
      prewarmObserver = null;
      trigger?.kill();
      trigger = null;
      if (range) {
        const index = pinnedRanges.indexOf(range);
        if (index !== -1) pinnedRanges.splice(index, 1);
        range = null;
      }
      updateMotionFlight({
        enabled: false,
        active: false,
        prewarm: false,
        progress: 0,
        ready: false,
      });
    };

    const configure = () => {
      stopAnimatedLayout();
      // `?motion=full` deliberately sets flyingCarousel even when the OS asks
      // for reduced motion, giving QA an explicit full-flight preview. Normal
      // reduced-motion visits still resolve to the static grid.
      staticLayout = shouldUseStaticMotionLayout({
        reducedMotion: media.matches,
        flyingCarousel,
      });
      useWebGL = flyingCarousel && !staticLayout;
      root.dataset.motionLayout = staticLayout ? 'static' : 'animated';
      root.dataset.motionStage = staticLayout ? 'grid' : 'hold';
      svg.setAttribute('aria-hidden', staticLayout ? 'true' : 'false');
      staticGrid?.setAttribute('aria-hidden', staticLayout ? 'false' : 'true');

      updateMotionFlight({
        enabled: useWebGL,
        active: false,
        prewarm: false,
        progress: 0,
        ready: false,
      });
      seekSmilTimeline(svg, staticLayout ? 1 : 0, DURATION);
      applyRenderer();
      if (staticLayout) return;

      if (useWebGL && 'IntersectionObserver' in window) {
        prewarmObserver = new IntersectionObserver(
          ([entry]) => updateMotionFlight({ prewarm: entry.isIntersecting }),
          { rootMargin: '150% 0px' },
        );
        prewarmObserver.observe(root);
      } else if (useWebGL) {
        // Older browsers retain the eager path rather than losing the upgrade.
        updateMotionFlight({ prewarm: true });
      }

      range = { start: 0, end: 0 };
      trigger = ScrollTrigger.create({
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
        onUpdate: ({ progress, isActive }) => {
          const active = useWebGL && isActive;
          if (motionFlight.active !== active) {
            updateMotionFlight({ active });
          }
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
    };

    configure();
    media.addEventListener('change', configure);

    return () => {
      media.removeEventListener('change', configure);
      unsubscribe();
      stopAnimatedLayout();
      root.dataset.motionRenderer = 'legacy';
    };
  }, [flyingCarousel]);

  return (
    <section className="section motion" id="motion" ref={rootRef} data-anchor-progress={DEEP_LINK_PROGRESS} data-nav-tone="light" data-motion-layout={DEFAULT_MOTION_LAYOUT} data-motion-stage="hold" data-motion-renderer="legacy">
      <div className="motion-copy" aria-hidden="true">
        <span>CWS IN</span>
        <span>MOTION</span>
      </div>
      <h2 className="sr-only">Crystal Web Solution in motion</h2>
      <p className="motion-caption">This site is the proof: one continuous 3D scene, scroll-linked motion, responsive fallbacks, and accessible content—built by Crystal Web Solution.</p>
      <a href="/#approach" className="motion-link" data-cursor="Process">See our process <span aria-hidden="true">→</span></a>
      <svg ref={svgRef} className="motion-smil-stage" viewBox="0 0 1440 900" role="img" aria-label="Six Crystal Web Solution capabilities orbit into a grid">
        {MOTION_STUDIES.map((study, index) => <StudyCard key={study.id} study={study} index={index} />)}
      </svg>
      <div className="motion-static-grid" data-motion-static-grid aria-hidden="false">
        {MOTION_STUDIES.map((study, index) => (
          <StaticStudyCard key={study.id} study={study} index={index} />
        ))}
      </div>
    </section>
  );
}
