'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { pulse } from '../../lib/pulse';
import { scrollState } from '../../lib/scrollState';

// The hero mascot: a refracting crystal that spins slowly and "roars"
// (pulse of scale + spin + emissive core) when the hero is clicked.
const baseScale = new THREE.Vector3(1, 1, 1);
const tmpScale = new THREE.Vector3();

export default function Crystal({ position = [0, 0, 0] }) {
  const outer = useRef();
  const core = useRef();
  const lastPulse = useRef(0);
  const energy = useRef(0);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    // Detect a new blast by timestamp comparison — no subscriptions.
    if (pulse.t !== lastPulse.current) {
      lastPulse.current = pulse.t;
      energy.current = 1;
    }
    energy.current *= Math.exp(-dt * 2.2);
    const e = energy.current;

    if (outer.current) {
      outer.current.rotation.y += dt * (0.25 + e * 4.0 + Math.abs(scrollState.velocity) * 0.0008);
      outer.current.rotation.x = Math.sin(t * 0.3) * 0.15 + e * 0.4;
      const s = 1 + Math.sin(t * 1.2) * 0.02 + e * 0.22;
      tmpScale.copy(baseScale).multiplyScalar(s);
      outer.current.scale.copy(tmpScale);
    }
    if (core.current) {
      core.current.rotation.y -= dt * 0.6;
      core.current.material.emissiveIntensity = 0.8 + Math.sin(t * 2.0) * 0.25 + e * 6.0;
      const cs = 0.42 * (1 + e * 0.5);
      core.current.scale.setScalar(cs);
    }
  });

  return (
    <Float speed={1.4} rotationIntensity={0.2} floatIntensity={0.6} position={position}>
      <mesh ref={outer}>
        <icosahedronGeometry args={[1.35, 0]} />
        <MeshTransmissionMaterial
          samples={6}
          resolution={512}
          thickness={0.9}
          roughness={0.08}
          chromaticAberration={0.35}
          anisotropy={0.25}
          ior={1.6}
          distortion={0.25}
          distortionScale={0.4}
          temporalDistortion={0.1}
          color="#bfeaff"
          attenuationColor="#59f3ff"
          attenuationDistance={2.2}
        />
      </mesh>
      <mesh ref={core} scale={0.42}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#59f3ff"
          emissive="#59f3ff"
          emissiveIntensity={0.8}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
    </Float>
  );
}
