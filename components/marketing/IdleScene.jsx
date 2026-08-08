'use client';

import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import Crystal from '../three/Crystal';
import Particles from '../three/Particles';
import Lights from '../three/Lights';
import { CLUSTERS } from '../../lib/journey';
import { useRenderQuality } from '../../lib/useRenderQuality';

const VARIANTS = {
  about:    { fov: 46, camPos: [-0.6, 0.3, 7.1],  crystalPos: [-0.5, 0.1, CLUSTERS.crystal],       particleColor: '#c084fc', particleMult: 0.9, fogNear: 9,  fogFar: 40 },
  services: { fov: 40, camPos: [0.5, 0.15, 8.2],  crystalPos: [0.4, -0.1, CLUSTERS.crystal - 1],   particleColor: '#8fd8ff', particleMult: 0.7, fogNear: 11, fogFar: 44 },
  contact:  { fov: 36, camPos: [0, 0.1, 6.2],     crystalPos: [0, 0, CLUSTERS.crystal + 0.8],      particleColor: '#5c8dff', particleMult: 0.8, fogNear: 8,  fogFar: 36 },
  process:  { fov: 44, camPos: [0.2, 0.4, 7.8],   crystalPos: [0.2, 0.05, CLUSTERS.crystal],       particleColor: '#8fd8ff', particleMult: 1.1, fogNear: 10, fogFar: 42 },
};

const DEFAULT_CONFIG = { fov: 42, camPos: [0, 0.25, 7.5], crystalPos: [0, 0, CLUSTERS.crystal], particleColor: '#8fd8ff', particleMult: 1, fogNear: 10, fogFar: 42 };

export default function IdleScene({ variant } = {}) {
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

  const config = VARIANTS[variant] || DEFAULT_CONFIG;
  const particleCount = Math.max(120, Math.floor(quality.particleCount * 0.5 * config.particleMult));

  return (
    <div className="subpage-scene-canvas" aria-hidden="true">
      <Canvas
        dpr={[1, quality.maxDpr]}
        frameloop={visible ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ fov: config.fov, near: 0.1, far: 120, position: config.camPos }}
      >
        <color attach="background" args={['#04060c']} />
        <fog attach="fog" args={['#04060c', config.fogNear, config.fogFar]} />
        <Lights />
        <Crystal position={config.crystalPos} />
        <Particles count={particleCount} color={config.particleColor} />
      </Canvas>
    </div>
  );
}
