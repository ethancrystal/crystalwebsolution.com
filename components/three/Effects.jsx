'use client';

import { useEffect, useState } from 'react';
import {
  EffectComposer,
  Bloom,
  DepthOfField,
  Vignette,
} from '@react-three/postprocessing';
import {
  motionFlight,
  subscribeMotionFlight,
} from '../../lib/motionFlight.mjs';
import CanvasFeatureBoundary from './CanvasFeatureBoundary';

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

// mode comes from lib/renderQuality.mjs's `postprocessing` field:
// 'full' — mipmapped Bloom + DepthOfField (when in motion mode) + Vignette.
// 'light' — same passes, minus the DepthOfField/mipmap cost (eco/balanced
//           tiers still get the bloom glow the brand relies on, just cheaper).
// 'off' — skip the EffectComposer entirely; low-end/eco devices render the
//         raw scene, which is what actually moves Lighthouse's mobile TBT.
export default function Effects({ mode = 'full' }) {
  if (mode === 'off') return null;

  return (
    <EffectComposer multisampling={0}>
      <EffectPasses mode={mode} />
    </EffectComposer>
  );
}
