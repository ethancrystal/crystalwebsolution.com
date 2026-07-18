'use client';

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
import { CLUSTERS } from '../lib/journey';

// One fixed, non-interactive canvas behind the whole page.
// The DOM scrolls over it; the camera flies through one continuous space.
export default function Scene() {
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

        {/* Services beat — five emblems, one per service row, hover-linked
            to the DOM list (see ServiceRail) */}
        <ServiceRail position={[0, 0, CLUSTERS.services]} />

        {/* Approach beat — step-markers orbiting a small core */}
        <ApproachCompass position={[0, 0, CLUSTERS.approach]} />

        {/* Showcase beat */}
        <ShowcaseBoxes position={[0, 0, CLUSTERS.showcase]} />

        {/* Recognition beat — medal ring, brightens on DOM row hover */}
        <RecognitionRing position={[0, 0, CLUSTERS.recognition]} />

        {/* About + Facts + Contact share the ambient field. The Sparks
            instance here is the "closing roar" payoff for Contact.jsx's
            onRoar handler — same component as the hero's, just re-instanced
            at the contact crystal's own position (see docs/PIXEL-POLISH-PLAN.md
            Phase 2); without it the hero's Sparks would fire uselessly back
            at z=0, nowhere near the camera by the time contact is on screen. */}
        <group position={[0, 0, CLUSTERS.contact]}>
          <Crystal position={[0, 0, -3]} />
          <Sparks position={[0, 0, -3]} />
        </group>

        <Particles count={900} />
        <BackdropMorph />
        <Effects />
      </Canvas>
    </div>
  );
}
