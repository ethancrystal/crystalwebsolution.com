'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pulse } from '../../lib/pulse';

// Burst particles ejected from the crystal on each hero blast.
const COUNT = 120;

export default function Sparks({ position = [0, 0, 0] }) {
  const points = useRef();
  const lastPulse = useRef(0);
  const life = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    let s = 7;
    const rand = () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
    for (let i = 0; i < COUNT; i++) {
      const theta = rand() * Math.PI * 2;
      const phi = Math.acos(2 * rand() - 1);
      const speed = 1.5 + rand() * 3.5;
      vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
      vel[i * 3 + 2] = Math.cos(phi) * speed;
    }
    return { positions: pos, velocities: vel };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!points.current) return;

    if (pulse.t !== lastPulse.current) {
      lastPulse.current = pulse.t;
      life.current = 1;
      const arr = points.current.geometry.attributes.position.array;
      for (let i = 0; i < COUNT * 3; i++) arr[i] = 0;
    }

    if (life.current > 0.001) {
      life.current *= Math.exp(-dt * 1.4);
      const arr = points.current.geometry.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3] += velocities[i * 3] * dt;
        arr[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        arr[i * 3 + 2] += velocities[i * 3 + 2] * dt;
      }
      points.current.geometry.attributes.position.needsUpdate = true;
    }
    points.current.material.opacity = life.current;
  });

  return (
    <points ref={points} position={position}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#59f3ff"
        transparent
        opacity={0}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
