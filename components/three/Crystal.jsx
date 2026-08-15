'use client';

import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial, Float } from '@react-three/drei';
import * as THREE from 'three';
import { pulse } from '../../lib/pulse';
import { scrollState } from '../../lib/scrollState';
import { motionScale } from '../../lib/motionScale';

// The hero mascot: a refracting crystal that spins slowly and "roars"
// (pulse of scale + spin + emissive core) when the hero is clicked.
const baseScale = new THREE.Vector3(1, 1, 1);
const tmpScale = new THREE.Vector3();

export default function Crystal({ position = [0, 0, 0] }) {
  const outer = useRef();
  const core = useRef();
  const lastPulse = useRef(0);
  const energy = useRef(0);
  // motionScale gates this component's own useFrame transforms, but <Float>
  // runs its own internal loop against the PARENT group -- a child mesh whose
  // local transform is frozen still moves in world space while its parent is
  // animated, so the crystal kept bobbing under reduced motion. Float takes
  // plain numeric props with no media-query awareness, so the gate has to
  // happen here. Zeroing the props (rather than reimplementing Float's math
  // in the gated useFrame) keeps the full-motion look byte-identical.
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

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
      const spin = (0.25 + e * 4.0 + Math.abs(scrollState.velocity) * 0.0008) * motionScale.value;
      outer.current.rotation.y += dt * spin;
      outer.current.rotation.x = (Math.sin(t * 0.3) * 0.15 + e * 0.4) * motionScale.value;
      const s = 1 + (Math.sin(t * 1.2) * 0.02 + e * 0.22) * motionScale.value;
      tmpScale.copy(baseScale).multiplyScalar(s);
      outer.current.scale.copy(tmpScale);
    }
    if (core.current) {
      core.current.rotation.y -= dt * 0.6 * motionScale.value;
      core.current.material.emissiveIntensity = 0.8 + (Math.sin(t * 2.0) * 0.25 + e * 6.0) * motionScale.value;
      const cs = 0.42 * (1 + e * 0.5 * motionScale.value);
      core.current.scale.setScalar(cs);
    }
  });

  return (
    <Float
      speed={reducedMotion ? 0 : 1.4}
      rotationIntensity={reducedMotion ? 0 : 0.2}
      floatIntensity={reducedMotion ? 0 : 0.6}
      position={position}
    >
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
