'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { chime } from '../../lib/chime';

// The recognition beat: four medal-toruses drift in a loose ring. Hovering
// an award row in the DOM (components/sections/Recognition.jsx) writes
// lib/chime.js; this reads it every frame, brightens the matching medal,
// and ejects a small particle spark-burst from it — the same additive-blend
// particle language as the hero's click-blast (components/three/Sparks.jsx),
// reused here for a DOM-hover -> 3D-spark idiom instead of click -> 3D.
// Sparks live as children of the same slowly-rotating group as the medals,
// so a burst stays visually anchored to the medal it came from.
const COUNT = 4;
const ANGLES = Array.from({ length: COUNT }, (_, i) => (i / COUNT) * Math.PI * 2);
const RADIUS = 2.1;
const SPARK_COUNT = 18;

function buildSparkVelocities(seed) {
  const vel = new Float32Array(SPARK_COUNT * 3);
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < SPARK_COUNT; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const speed = 0.6 + rand() * 1.4;
    vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
    vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
    vel[i * 3 + 2] = Math.cos(phi) * speed;
  }
  return vel;
}

export default function RecognitionRing({ position = [0, 0, 0] }) {
  const group = useRef();
  const lastChime = useRef(0);
  const energy = useRef(new Array(COUNT).fill(0));
  const sparkLife = useRef(new Array(COUNT).fill(0));
  const sparkRefs = useRef([]);

  const sparkVelocities = useMemo(() => ANGLES.map((_, i) => buildSparkVelocities(11 + i * 7)), []);
  const sparkPositions = useMemo(() => ANGLES.map(() => new Float32Array(SPARK_COUNT * 3)), []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (!group.current) return;

    if (chime.t !== lastChime.current) {
      lastChime.current = chime.t;
      if (chime.index >= 0 && chime.index < COUNT) {
        energy.current[chime.index] = 1;
        sparkLife.current[chime.index] = 1;
        const arr = sparkPositions[chime.index];
        for (let k = 0; k < arr.length; k++) arr[k] = 0;
      }
    }

    group.current.rotation.y += dt * 0.08;

    for (let i = 0; i < COUNT; i++) {
      const m = group.current.children[i];
      energy.current[i] *= Math.exp(-dt * 2.4);
      const e = energy.current[i];
      m.material.emissiveIntensity = 0.25 + Math.sin(t * 1.2 + i) * 0.08 + e * 1.6;
      m.scale.setScalar(0.24 * (1 + e * 0.35));
      m.rotation.x += dt * 0.3;

      const sp = sparkRefs.current[i];
      if (sp) {
        if (sparkLife.current[i] > 0.001) {
          sparkLife.current[i] *= Math.exp(-dt * 1.6);
          const arr = sparkPositions[i];
          const vel = sparkVelocities[i];
          for (let k = 0; k < SPARK_COUNT; k++) {
            arr[k * 3] += vel[k * 3] * dt;
            arr[k * 3 + 1] += vel[k * 3 + 1] * dt;
            arr[k * 3 + 2] += vel[k * 3 + 2] * dt;
          }
          sp.geometry.attributes.position.needsUpdate = true;
        }
        sp.material.opacity = sparkLife.current[i];
      }
    }
  });

  return (
    <group ref={group} position={position}>
      {ANGLES.map((a, i) => (
        <mesh key={i} position={[Math.cos(a) * RADIUS, Math.sin(a) * RADIUS * 0.5, Math.sin(a) * 1.2]} scale={0.24}>
          <torusGeometry args={[1, 0.32, 12, 24]} />
          <meshStandardMaterial
            color="#c084fc"
            emissive="#c084fc"
            emissiveIntensity={0.25}
            metalness={0.4}
            roughness={0.25}
          />
        </mesh>
      ))}
      {ANGLES.map((a, i) => (
        <points
          key={`spark-${i}`}
          ref={(el) => (sparkRefs.current[i] = el)}
          position={[Math.cos(a) * RADIUS, Math.sin(a) * RADIUS * 0.5, Math.sin(a) * 1.2]}
        >
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" count={SPARK_COUNT} array={sparkPositions[i]} itemSize={3} />
          </bufferGeometry>
          <pointsMaterial
            size={0.05}
            color="#c084fc"
            transparent
            opacity={0}
            sizeAttenuation
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </points>
      ))}
    </group>
  );
}
