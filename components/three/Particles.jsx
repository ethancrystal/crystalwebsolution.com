'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollState';
import { VOLUME } from '../../lib/journey';

// Ambient dust drifting through the whole camera volume.
export default function Particles({ count = 900 }) {
  const points = useRef();

  const { positions, seeds } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sd = new Float32Array(count);
    let s = 42;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 24;
      pos[i * 3 + 1] = (rand() - 0.5) * 14;
      pos[i * 3 + 2] = VOLUME.near + rand() * (VOLUME.far - VOLUME.near);
      sd[i] = rand() * Math.PI * 2;
    }
    return { positions: pos, seeds: sd };
  }, [count]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!points.current) return;
    const t = state.clock.elapsedTime;
    const arr = points.current.geometry.attributes.position.array;
    const drift = 0.12 + Math.abs(scrollState.velocity) * 0.0006;
    for (let i = 0; i < count; i++) {
      arr[i * 3] += Math.sin(t * 0.3 + seeds[i]) * dt * drift;
      arr[i * 3 + 1] += Math.cos(t * 0.24 + seeds[i] * 1.3) * dt * drift;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.material.opacity = 0.55 + Math.min(Math.abs(scrollState.velocity) * 0.0004, 0.35);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#8fd8ff"
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
