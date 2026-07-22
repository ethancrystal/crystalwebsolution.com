'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import CameraRig from './three/CameraRig';
import FocusDimmer from './three/FocusDimmer';
import Crystal from './three/Crystal';
import ServiceRail from './three/ServiceRail';
import ApproachCompass from './three/ApproachCompass';
import Particles from './three/Particles';
import Sparks from './three/Sparks';
import BackdropMorph from './three/BackdropMorph';
import Lights from './three/Lights';
import Effects from './three/Effects';
import FlyingCarousel from './three/FlyingCarousel';
import LabCarousel from './three/LabCarousel';
import CanvasFeatureBoundary from './three/CanvasFeatureBoundary';
import { CLUSTERS } from '../lib/journey';
import {
  motionFlight,
  setMotionReady,
  subscribeMotionFlight,
} from '../lib/motionFlight.mjs';
import {
  labFlight,
  setLabReady,
  subscribeLabFlight,
} from '../lib/labFlight.mjs';
import { useExperienceFeatures } from '../lib/useExperienceFeatures';
import { useRenderQuality } from '../lib/useRenderQuality';

// Both flying beats mount lazily off the same lifecycle: visible-soon
// (prewarm) or on-beat (active). `flight`/`subscribe` are module singletons,
// so the effect only re-arms when the feature gate flips.
function useFlightMount(enabled, flight, subscribe) {
  const shouldMount = (state) => enabled && (state.prewarm || state.active);
  const [mounted, setMounted] = useState(() => shouldMount(flight));

  useEffect(() => {
    const sync = (state) => setMounted((current) => {
      const next = shouldMount(state);
      return current === next ? current : next;
    });
    sync(flight);
    return subscribe(sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return mounted;
}

// One fixed, non-interactive canvas behind the whole page.
// The DOM scrolls over it; the camera flies through one continuous space.
export default function Scene() {
  const { flyingCarousel } = useExperienceFeatures();
  const mountCarousel = useFlightMount(flyingCarousel, motionFlight, subscribeMotionFlight);
  const mountLab = useFlightMount(flyingCarousel, labFlight, subscribeLabFlight);
  const quality = useRenderQuality();

  return (
    <div className="scene-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 42, near: 0.1, far: 260, position: [0, 0.25, 7.5] }}
      >
        <color attach="background" args={['#04060c']} />
        {/* Beats sit 9-18 apart and the camera trails ~8-9 units behind each
            stop, so the current mascot is ~10 away (barely fogged) and the
            next ~17-26. near=10/far=48 actually delivers what the old
            14/64 range only promised: the next beat reads as a dim preview
            instead of loose dark slabs floating over the current copy. */}
        <fog attach="fog" args={['#04060c', 10, 48]} />
        <Lights />
        <CameraRig />
        <FocusDimmer />

        {/* Hero beat */}
        <Crystal position={[0, 0, CLUSTERS.crystal]} />
        <Sparks position={[0, 0, CLUSTERS.crystal]} />

        {/* Services beat — six signal instruments, one per service row, hover-linked
            to the DOM list (see ServiceRail) */}
        <ServiceRail position={[0, 0, CLUSTERS.services]} animate={quality.animate} />

        {/* Approach beat — step-markers orbiting a small core */}
        <ApproachCompass position={[0, 0, CLUSTERS.approach]} animate={quality.animate} />

        {/* Lab beat — the design-lab concept flight. Lab.jsx keeps its SMIL
            stage visible until this feature reports a successful frame. */}
        {mountLab && (
          <CanvasFeatureBoundary
            resetKey={mountLab}
            onError={() => setLabReady(false)}
          >
            <LabCarousel
              position={[0, 0, CLUSTERS.lab]}
              textureWidth={quality.carouselTextureWidth}
              backdropWidth={quality.carouselBackdropWidth}
            />
          </CanvasFeatureBoundary>
        )}

        {/* Motion beat — additive only. Motion.jsx keeps its complete SVG
            path visible until this feature reports a successful frame. */}
        {mountCarousel && (
          <CanvasFeatureBoundary
            resetKey={mountCarousel}
            onError={() => setMotionReady(false)}
          >
            <FlyingCarousel
              position={[0, 0, CLUSTERS.motion]}
              textureWidth={quality.carouselTextureWidth}
              backdropWidth={quality.carouselBackdropWidth}
            />
          </CanvasFeatureBoundary>
        )}

        <Particles count={900} />
        <BackdropMorph />
        <Effects />
      </Canvas>
    </div>
  );
}
