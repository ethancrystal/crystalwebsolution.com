'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollState';
import { VOLUME } from '../../lib/journey';

const VERTEX_SHADER = `
  attribute float aSeed;
  uniform float uTime;
  uniform float uVelocity;
  uniform float uSize;

  void main() {
    vec3 drifted = position;
    float energy = 0.16 + min(abs(uVelocity) * 0.00035, 0.32);
    drifted.x += sin(uTime * 0.3 + aSeed) * energy;
    drifted.y += cos(uTime * 0.24 + aSeed * 1.3) * energy;
    vec4 viewPosition = modelViewMatrix * vec4(drifted, 1.0);
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = uSize * (280.0 / max(1.0, -viewPosition.z));
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uOpacity;

  void main() {
    float radius = distance(gl_PointCoord, vec2(0.5));
    float alpha = (1.0 - smoothstep(0.08, 0.5, radius)) * uOpacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

// Ambient dust drifting through the whole camera volume.
export default function Particles({ count = 900, animate = true }) {
  const points = useRef();

  const { positions, seeds, uniforms } = useMemo(() => {
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
    return {
      positions: pos,
      seeds: sd,
      uniforms: {
        uTime: { value: 0 },
        uVelocity: { value: 0 },
        uSize: { value: 0.05 },
        uColor: { value: new THREE.Color('#8fd8ff') },
        uOpacity: { value: 0.55 },
      },
    };
  }, [count]);

  useFrame((state) => {
    if (!points.current || !animate) return;
    uniforms.uTime.value = state.clock.elapsedTime;
    uniforms.uVelocity.value = scrollState.velocity;
    uniforms.uOpacity.value = 0.55 + Math.min(Math.abs(scrollState.velocity) * 0.0004, 0.3);
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSeed" count={count} array={seeds} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
