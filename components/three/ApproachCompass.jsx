'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollState';
import { beatProgress, BEAT_IDS } from '../../lib/beatProgress';
import { isBeatProgressActive } from '../../lib/sceneActivity.mjs';

// The approach beat: four step-markers ("Discover / Design / Build /
// Launch") orbit a small core, dark until Approach's own measured scroll
// span opens (beatProgress.approach -> beatProgress.stories). Four equal
// sub-ranges of one ease value light up in turn.
//
// Each marker's glow is a tiny mass-spring-damper (critically-underdamped,
// so it overshoots slightly and settles) rather than a flat exponential
// lerp — physics reads as alive, math reads as a progress bar. Springs are
// per-marker state in a plain array ref, never React state, never allocated
// inside useFrame.
const COUNT = 4;
const ANGLES = Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2);
const RADIUS = 1.9;
const STIFFNESS = 90;
const DAMPING = 9;

export default function ApproachCompass({ position = [0, 0, 0], animate = true }) {
  const group = useRef();
  const core = useRef();
  // { value, velocity } per marker — a tiny spring simulation, no React state.
  const springs = useRef(Array.from({ length: COUNT }, () => ({ value: 0.18, velocity: 0 })));

  useFrame((state, delta) => {
    if (!animate) return;
    if (!isBeatProgressActive(
      scrollState.progress,
      'approach',
      BEAT_IDS,
      beatProgress,
    )) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (!group.current) return;

    const a = beatProgress.approach;
    const b = beatProgress.stories;
    const span = Math.max(b - a, 0.0001);
    const ease = THREE.MathUtils.clamp((scrollState.progress - a) / span, 0, 1);
    const activeStep = Math.min(COUNT - 1, Math.floor(ease * COUNT));

    group.current.rotation.y += dt * 0.12;

    for (let i = 0; i < group.current.children.length; i++) {
      const m = group.current.children[i];
      const target = i <= activeStep ? 1 : 0.18;
      const s = springs.current[i];
      const force = (target - s.value) * STIFFNESS - s.velocity * DAMPING;
      s.velocity += force * dt;
      s.value += s.velocity * dt;
      m.material.emissiveIntensity = Math.max(0, s.value);
      m.rotation.x += dt * 0.4;
      m.rotation.y += dt * 0.6;
    }

    if (core.current) {
      core.current.rotation.y -= dt * 0.3;
      core.current.material.emissiveIntensity = 0.6 + Math.sin(t * 1.6) * 0.2;
    }
  });

  return (
    <group position={position}>
      <mesh ref={core} scale={0.4}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#59f3ff"
          emissive="#59f3ff"
          emissiveIntensity={0.6}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
      <group ref={group}>
        {ANGLES.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * RADIUS, Math.sin(a) * RADIUS * 0.6, 0]} scale={0.26}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#3c6cff"
              emissive="#3c6cff"
              emissiveIntensity={0.18}
              metalness={0.3}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
