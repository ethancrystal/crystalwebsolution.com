'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import * as THREE from 'three';
import { CARD_HEIGHT, CARD_WIDTH, createFlyingCarouselLayout } from '../../lib/flyingCarouselLayout.mjs';
import { CLUSTERS, MOTION_WINDOW, STOPS } from '../../lib/journey';
import { createMotionStudyTiming, MOTION_STUDIES } from '../../lib/motionStudies.mjs';
import { motionStageAt, seekSmilTimeline } from '../../lib/smilTimeline.mjs';
import {
  motionFlight,
  subscribeMotionFlight,
  updateMotionFlight,
} from '../../lib/motionFlight.mjs';
import { DEFAULT_MOTION_LAYOUT, shouldUseStaticMotionLayout } from '../../lib/motionLayout.mjs';
import { PROJECTS } from '../../lib/projects';
import { scrollState } from '../../lib/scrollState';
import { useExperienceFeatures } from '../../lib/useExperienceFeatures';

const DURATION = 12;
const STATIC_QUERY = '(prefers-reduced-motion: reduce)';
const DEEP_LINK_PROGRESS = 0.32;
const KEY_SPLINES = '0.22 1 0.36 1;0.22 1 0.36 1;0.65 0 0.35 1;0.22 1 0.36 1;0.22 1 0.36 1';
const HANDOFF_START = 0.86;
const HANDOFF_INTERACTIVE = 0.92;
const HANDOFF_END = 0.94;
const MOTION_FOV = 42;
const MOTION_STOP = STOPS.find((stop) => stop.look[2] === CLUSTERS.motion) || STOPS[STOPS.length - 2];
const MOTION_DISTANCE = Math.hypot(
  MOTION_STOP.pos[0] - MOTION_STOP.look[0],
  MOTION_STOP.pos[1] - MOTION_STOP.look[1],
  MOTION_STOP.pos[2] - MOTION_STOP.look[2],
);

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function smoothstep01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function visibleWorldWidth(pixelWidth, pixelHeight) {
  const aspect = pixelWidth / Math.max(pixelHeight, 1);
  const height = 2 * Math.tan(THREE.MathUtils.degToRad(MOTION_FOV) / 2) * MOTION_DISTANCE;
  return height * aspect;
}

function FlightCard({ project, index }) {
  const timing = createMotionStudyTiming(index);
  const displayTitle = project.title.length > 23
    ? `${project.title.slice(0, 22).trimEnd()}…`
    : project.title;

  return (
    <g className="motion-study" data-project={project.slug}>
      <animateMotion dur={`${DURATION}s`} begin="0s" fill="freeze" path={MOTION_STUDIES[index].path} keyTimes={timing.motionKeyTimes} keyPoints="0;0;0.56;0.82;1;1" calcMode="linear" rotate="auto" />
      <animateTransform attributeName="transform" additive="sum" type="scale" dur={`${DURATION}s`} begin="0s" fill="freeze" values="0.5;0.5;1.08;0.94;1;1" keyTimes={timing.motionKeyTimes} calcMode="spline" keySplines={KEY_SPLINES} />
      <animate attributeName="opacity" dur={`${DURATION}s`} begin="0s" fill="freeze" values="0;0;1;1;1;1" keyTimes={timing.opacityKeyTimes} />
      <g transform="translate(-160 -105)">
        <rect width="320" height="210" rx="6" fill="#f4f3ef" stroke="#11130f" strokeWidth="1.5" />
        <rect x="12" y="12" width="296" height="132" rx="3" fill={project.palette[0]} />
        <path d={`M 28 ${122 - index * 4} C 92 ${35 + index * 8}, 190 ${150 - index * 7}, 292 ${34 + index * 5}`} fill="none" stroke="#0b0d0b" strokeWidth="5" />
        <circle cx={58 + index * 31} cy={55 + (index % 2) * 42} r={18 + index * 2} fill={project.palette[1]} fillOpacity="0.92" />
        <text x="18" y="169" className="motion-study-title">{displayTitle}</text>
        <text x="18" y="194" className="motion-study-sub">{project.category}</text>
        <text x="286" y="194" textAnchor="end" className="motion-study-index">0{index + 1}</text>
      </g>
    </g>
  );
}

function ProjectCard({ project, index, register }) {
  return (
    <Link
      ref={register}
      href={`/work/${project.slug}`}
      className="motion-project-card"
      style={{ '--project-a': project.palette[0], '--project-b': project.palette[1] }}
      aria-label={`${project.title} — view case study`}
      data-cursor="View case"
      data-motion-project-card
    >
      <span className="motion-project-art" aria-hidden="true">
        <span className="motion-project-orb" />
        <span className="motion-project-index">0{index + 1}</span>
      </span>
      <span className="motion-project-meta">
        <strong>{project.title}</strong>
        <span>{project.category}</span>
      </span>
    </Link>
  );
}

export default function Motion() {
  const rootRef = useRef(null);
  const stickyRef = useRef(null);
  const svgRef = useRef(null);
  const cardRefs = useRef([]);
  const { flyingCarousel } = useExperienceFeatures();

  useEffect(() => {
    const root = rootRef.current;
    const sticky = stickyRef.current;
    const svg = svgRef.current;
    if (!root || !sticky || !svg) return undefined;

    const media = window.matchMedia(STATIC_QUERY);
    const camera = new THREE.PerspectiveCamera(MOTION_FOV, 1, 0.1, 260);
    const corners = [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ];
    let staticLayout = true;
    let useWebGL = false;
    let prewarmObserver = null;
    let resizeObserver = null;
    let tickerAttached = false;

    camera.position.set(...MOTION_STOP.pos);
    camera.lookAt(...MOTION_STOP.look);
    camera.updateMatrixWorld(true);

    const clearProjectedLayout = () => {
      for (let index = 0; index < cardRefs.current.length; index++) {
        const card = cardRefs.current[index];
        if (!card) continue;
        card.style.removeProperty('left');
        card.style.removeProperty('top');
        card.style.removeProperty('width');
        card.style.removeProperty('height');
      }
    };

    const setCardHandoff = (progress) => {
      const handoff = staticLayout
        ? 1
        : smoothstep01((progress - HANDOFF_START) / (HANDOFF_END - HANDOFF_START));
      const interactive = staticLayout || progress >= HANDOFF_INTERACTIVE;

      for (let index = 0; index < cardRefs.current.length; index++) {
        const card = cardRefs.current[index];
        if (!card) continue;
        card.style.opacity = String(handoff);
        card.style.pointerEvents = interactive ? 'auto' : 'none';
        card.tabIndex = interactive ? 0 : -1;
      }
    };

    const writeProjectedLayout = () => {
      if (staticLayout) {
        clearProjectedLayout();
        return;
      }

      const width = sticky.clientWidth;
      const height = sticky.clientHeight;
      if (!width || !height) return;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);

      const layout = createFlyingCarouselLayout({
        viewportWidth: visibleWorldWidth(width, height),
        viewportPixelWidth: width,
      });

      for (let index = 0; index < layout.length; index++) {
        const element = cardRefs.current[index];
        if (!element) continue;
        const target = layout[index].target;
        const halfWidth = CARD_WIDTH * target.scale * 0.5;
        const halfHeight = CARD_HEIGHT * target.scale * 0.5;
        let minX = 1;
        let maxX = -1;
        let minY = 1;
        let maxY = -1;

        corners[0].set(target.position[0] - halfWidth, target.position[1] - halfHeight, CLUSTERS.motion + target.position[2]);
        corners[1].set(target.position[0] + halfWidth, target.position[1] - halfHeight, CLUSTERS.motion + target.position[2]);
        corners[2].set(target.position[0] + halfWidth, target.position[1] + halfHeight, CLUSTERS.motion + target.position[2]);
        corners[3].set(target.position[0] - halfWidth, target.position[1] + halfHeight, CLUSTERS.motion + target.position[2]);

        for (let cornerIndex = 0; cornerIndex < corners.length; cornerIndex++) {
          corners[cornerIndex].project(camera);
          minX = Math.min(minX, corners[cornerIndex].x);
          maxX = Math.max(maxX, corners[cornerIndex].x);
          minY = Math.min(minY, corners[cornerIndex].y);
          maxY = Math.max(maxY, corners[cornerIndex].y);
        }

        const left = (minX * 0.5 + 0.5) * width;
        const top = (-maxY * 0.5 + 0.5) * height;
        element.style.left = `${left}px`;
        element.style.top = `${top}px`;
        element.style.width = `${Math.max(1, (maxX - minX) * 0.5 * width)}px`;
        element.style.height = `${Math.max(1, (maxY - minY) * 0.5 * height)}px`;
      }
    };

    const applyRenderer = () => {
      const renderer = useWebGL && motionFlight.ready ? 'webgl' : 'legacy';
      root.dataset.motionRenderer = renderer;
      if (renderer === 'legacy' && !staticLayout) {
        seekSmilTimeline(svg, motionFlight.progress, DURATION);
      }
    };

    const syncProgress = () => {
      const span = Math.max(MOTION_WINDOW.end - MOTION_WINDOW.start, 0.0001);
      const progress = clamp01((scrollState.progress - MOTION_WINDOW.start) / span);
      const active = useWebGL
        && scrollState.progress >= MOTION_WINDOW.start
        && scrollState.progress < MOTION_WINDOW.end;

      motionFlight.progress = progress;
      if (motionFlight.active !== active) updateMotionFlight({ active });
      if (!useWebGL || !motionFlight.ready) seekSmilTimeline(svg, progress, DURATION);

      const stage = motionStageAt(progress);
      if (root.dataset.motionStage !== stage) root.dataset.motionStage = stage;
      setCardHandoff(progress);
    };

    const stopAnimatedLayout = () => {
      prewarmObserver?.disconnect();
      prewarmObserver = null;
      resizeObserver?.disconnect();
      resizeObserver = null;
      window.removeEventListener('resize', writeProjectedLayout);
      if (tickerAttached) {
        gsap.ticker.remove(syncProgress);
        tickerAttached = false;
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
      staticLayout = shouldUseStaticMotionLayout({
        reducedMotion: media.matches,
        flyingCarousel,
      });
      useWebGL = flyingCarousel && !staticLayout;
      root.dataset.motionLayout = staticLayout ? 'static' : 'animated';
      root.dataset.motionStage = staticLayout ? 'grid' : 'hold';

      if (staticLayout) {
        clearProjectedLayout();
        seekSmilTimeline(svg, 1, DURATION);
        setCardHandoff(1);
        applyRenderer();
        return;
      }

      updateMotionFlight({
        enabled: true,
        active: false,
        prewarm: false,
        progress: 0,
        ready: false,
      });
      seekSmilTimeline(svg, 0, DURATION);
      writeProjectedLayout();
      setCardHandoff(0);

      if ('IntersectionObserver' in window) {
        prewarmObserver = new IntersectionObserver(
          ([entry]) => updateMotionFlight({ prewarm: entry.isIntersecting }),
          { rootMargin: '150% 0px' },
        );
        prewarmObserver.observe(root);
      } else {
        updateMotionFlight({ prewarm: true });
      }

      resizeObserver = typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(writeProjectedLayout);
      resizeObserver?.observe(sticky);
      window.addEventListener('resize', writeProjectedLayout, { passive: true });
      gsap.ticker.add(syncProgress);
      tickerAttached = true;
      syncProgress();
      applyRenderer();
    };

    const unsubscribe = subscribeMotionFlight(applyRenderer);
    configure();
    media.addEventListener('change', configure);

    return () => {
      media.removeEventListener('change', configure);
      unsubscribe();
      stopAnimatedLayout();
      clearProjectedLayout();
      root.dataset.motionRenderer = 'legacy';
    };
  }, [flyingCarousel]);

  return (
    <section
      className="section motion"
      id="motion"
      ref={rootRef}
      data-anchor-progress={DEEP_LINK_PROGRESS}
      data-nav-tone="light"
      data-motion-layout={DEFAULT_MOTION_LAYOUT}
      data-motion-stage="hold"
      data-motion-renderer="legacy"
    >
      <div className="motion-sticky" ref={stickyRef}>
        <header className="motion-heading">
          <p className="eyebrow">Selected work</p>
          <h2>Selected work in motion</h2>
          <p>Six different briefs, each shaped around the real problem.</p>
        </header>
        <Link href="/work" className="motion-link" data-cursor="All projects">
          All projects <span aria-hidden="true">→</span>
        </Link>
        <svg ref={svgRef} className="motion-smil-stage" viewBox="0 0 1440 900" aria-hidden="true">
          {PROJECTS.map((project, index) => (
            <FlightCard key={project.slug} project={project} index={index} />
          ))}
        </svg>
        <div className="motion-project-grid" data-motion-project-grid>
          {PROJECTS.map((project, index) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={index}
              register={(element) => { cardRefs.current[index] = element; }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
