'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Crystal from '../three/Crystal';
import Particles from '../three/Particles';
import Lights from '../three/Lights';
import { CLUSTERS } from '../../lib/journey';
import { useRenderQuality } from '../../lib/useRenderQuality';

export default function IdleScene() {
  const quality = useRenderQuality();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onVisibilityChange = () => {
      setVisible(document.visibilityState !== 'hidden');
    };
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  if (!quality.animate) {
    return <div className="subpage-scene-fallback" aria-hidden="true" />;
  }

  const particleCount = Math.max(120, Math.floor(quality.particleCount * 0.5));

  return (
    <div className="subpage-scene-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, quality.maxDpr]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: 42, near: 0.1, far: 120, position: [0, 0.25, 7.5] }}
      >
        <color attach="background" args={['#04060c']} />
        <fog attach="fog" args={['#04060c', 10, 42]} />
        <Lights />
        <Crystal position={[0, 0, CLUSTERS.crystal]} />
        <Particles count={particleCount} />
      </Canvas>
    </div>
  );
}
