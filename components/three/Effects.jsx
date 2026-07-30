'use client';

import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';

export default function Effects() {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.85} luminanceThreshold={0.35} luminanceSmoothing={0.6} mipmapBlur />
      <Vignette eskil={false} offset={0.18} darkness={0.85} />
    </EffectComposer>
  );
}
