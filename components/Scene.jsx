'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import CameraRig from './three/CameraRig';
import FocusDimmer from './three/FocusDimmer';
import Crystal from './three/Crystal';
import ServiceRail from './three/ServiceRail';
import ShowcaseBoxes from './three/ShowcaseBoxes';
import ApproachCompass from './three/ApproachCompass';
import RecognitionRing from './three/RecognitionRing';
import Particles from './three/Particles';
import Sparks from './three/Sparks';
import BackdropMorph from './three/BackdropMorph';
import Lights from './three/Lights';
import Effects from './three/Effects';
import FlyingCarousel from './three/FlyingCarousel';
import CanvasFeatureBoundary from './three/CanvasFeatureBoundary';
import { CLUSTERS } from '../lib/journey';
import {
  motionFlight,
  setMotionReady,
  subscribeMotionFlight,
} from '../lib/motionFlight.mjs';
import { useExperienceFeatures } from '../lib/useExperienceFeatures';
import { useRenderQuality } from '../lib/useRenderQuality';

function useCarouselMount(enabled) {
  const shouldMount = (state) => enabled && (state.prewarm || state.active);
  const [mounted, setMounted] = useState(() => shouldMount(motionFlight));

  useEffect(() => {
    const sync = (state) => setMounted((current) => {
      const next = shouldMount(state);
      return current === next ? current : next;
    });
    sync(motionFlight);
    return subscribeMotionFlight(sync);
  }, [enabled]);

  return mounted;
}

// One fixed, non-interactive canvas behind the whole page.
// The DOM scrolls over it; the camera flies through one continuous space.
export default function Scene() {
  const { flyingCarousel } = useExperienceFeatures();
  const mountCarousel = useCarouselMount(flyingCarousel);
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

        {/* Services beat — eight signal instruments, one per service row, hover-linked
            to the DOM list (see ServiceRail) */}
        <ServiceRail position={[0, 0, CLUSTERS.services]} animate={quality.animate} />

        {/* Approach beat — step-markers orbiting a small core */}
        <ApproachCompass position={[0, 0, CLUSTERS.approach]} animate={quality.animate} />

        {/* Showcase beat */}
        <ShowcaseBoxes position={[0, 0, CLUSTERS.showcase]} animate={quality.animate} />

        {/* Recognition beat — medal ring, brightens on DOM row hover */}
        <RecognitionRing position={[0, 0, CLUSTERS.recognition]} animate={quality.animate} />

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
