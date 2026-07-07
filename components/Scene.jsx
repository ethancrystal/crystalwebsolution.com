'use client';

import { Canvas } from '@react-three/fiber';
import CameraRig from './three/CameraRig';
import FocusDimmer from './three/FocusDimmer';
import Crystal from './three/Crystal';
import ShowcaseBoxes from './three/ShowcaseBoxes';
import MarkAssembly from './three/MarkAssembly';
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
        <fog attach="fog" args={['#04060c', 18, 120]} />
        <Lights />
        <CameraRig />
        <FocusDimmer />

        {/* Hero beat */}
        <Crystal position={[0, 0, CLUSTERS.crystal]} />
        <Sparks position={[0, 0, CLUSTERS.crystal]} />

        {/* Services beat — a loose orbit of small crystals */}
        <group position={[0, 0, CLUSTERS.services]}>
          <Crystal position={[0, 0, 0]} />
        </group>

        {/* Showcase beat */}
        <ShowcaseBoxes position={[0, 0, CLUSTERS.showcase]} />

        {/* Mark beat */}
        <MarkAssembly position={[0, 0, CLUSTERS.mark]} />

        {/* About + Facts + Contact share the ambient field */}
        <group position={[0, 0, CLUSTERS.contact]}>
          <Crystal position={[0, 0, -3]} />
        </group>

        <Particles count={900} />
        <BackdropMorph />
        <Effects />
      </Canvas>
    </div>
  );
}
