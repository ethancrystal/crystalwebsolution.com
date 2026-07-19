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

function EffectPasses() {
  const motionMode = useMotionEffectMode();

  return (
    <>
      {!motionMode && (
        <Bloom
          intensity={0.85}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.6}
          mipmapBlur
        />
      )}
      {motionMode && (
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

export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <EffectPasses />
    </EffectComposer>
  );
}
