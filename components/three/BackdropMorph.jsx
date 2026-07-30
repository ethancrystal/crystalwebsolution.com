'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollState';

// A vast wireframe shell around everything whose hue drifts with progress —
// gives each depth of the journey its own atmosphere.
const COLOR_A = new THREE.Color('#0b2740');
const COLOR_B = new THREE.Color('#241040');
const tmpColor = new THREE.Color();

export default function BackdropMorph() {
  const mesh = useRef();

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    if (!mesh.current) return;
    mesh.current.rotation.y += dt * 0.015;
    mesh.current.rotation.x += dt * 0.006;
    tmpColor.copy(COLOR_A).lerp(COLOR_B, scrollState.progress);
    mesh.current.material.color.lerp(tmpColor, 1 - Math.exp(-dt * 3));
    // Journey now runs to CLUSTERS.contact = -128 (was -100); keep the shell
    // receding at the same proportion of total depth.
    mesh.current.position.z = -50 + scrollState.progress * -45;
  });

  return (
    <mesh ref={mesh} position={[0, 0, -50]}>
      <icosahedronGeometry args={[90, 2]} />
      {/* fog={false}: the shell sits at radius 90, past the fog far plane —
          it is the atmosphere itself, so scene fog must not swallow it. */}
      <meshBasicMaterial wireframe transparent opacity={0.08} color="#0b2740" side={THREE.BackSide} fog={false} />
    </mesh>
  );
}
