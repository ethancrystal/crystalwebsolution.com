'use client';

import { useEffect, useState } from 'react';
import { Vector2 } from 'three';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  DepthOfField,
  Vignette,
} from '@react-three/postprocessing';
import {
  motionFlight,
  subscribeMotionFlight,
} from '../../lib/motionFlight.mjs';
import CanvasFeatureBoundary from './CanvasFeatureBoundary';

// Prismatic edge dispersion — the crystal splits light toward the frame edges
// instead of the whole image sitting mis-registered. Module-level so the pass
// never reallocates the uniform across re-renders.
const ABERRATION_OFFSET = new Vector2(0.0016, 0.002);
// The shader ramps aberration by `distance(uv, centre) * 2 - modulationOffset`
// (0 at centre, ~1.41 at the corners). 0.35 holds the middle of the frame
// perfectly clean so hero copy over the canvas stays crisp.
const ABERRATION_CLEAR_CENTRE = 0.35;

function useMotionEffectMode() {
  const [enabled, setEnabled] = useState(
    () => motionFlight.enabled && motionFlight.ready && motionFlight.active,
  );

  useEffect(() => subscribeMotionFlight((state) => {
    setEnabled(state.enabled && state.ready && state.active);
  }), []);

  return enabled;
}

function EffectPasses({ mode }) {
  const motionMode = useMotionEffectMode();

  return (
    <>
      {!motionMode && (
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.6}
          mipmapBlur={mode === 'full'}
        />
      )}
      {!motionMode && mode === 'full' && (
        <CanvasFeatureBoundary>
          <ChromaticAberration
            offset={ABERRATION_OFFSET}
            radialModulation
            modulationOffset={ABERRATION_CLEAR_CENTRE}
          />
        </CanvasFeatureBoundary>
      )}
      {motionMode && mode === 'full' && (
        <CanvasFeatureBoundary>
          <DepthOfField
            worldFocusDistance={8}
            worldFocusRange={5.5}
            bokehScale={0.45}
            resolutionScale={0.5}
          />
        </CanvasFeatureBoundary>
      )}
      {!motionMode && (
        <Vignette eskil={false} offset={0.18} darkness={0.85} />
      )}
    </>
  );
}

export default function Effects({ mode = 'full' }) {
  return (
    <EffectComposer multisampling={0}>
      <EffectPasses mode={mode} />
    </EffectComposer>
  );
}
