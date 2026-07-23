'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VERIFIED_CLIENTS } from '../../lib/clients';
import { focusBeacon } from '../../lib/focusBeacon';
import { scrollState } from '../../lib/scrollState';
import { beatProgress, BEAT_IDS } from '../../lib/beatProgress';
import { isBeatProgressActive } from '../../lib/sceneActivity.mjs';

// Glass slabs drift around the client-record section depth. Hovering (or
// keyboard-focusing) a client card in the DOM
// (components/sections/Showcase.jsx) writes lib/focusBeacon.js; the
// matching slab brightens toward its palette glow while the rest recede —
// emissive only, so the drift/rotation system stays untouched. Showcase
// features four cards; the fifth slab has no card and simply recedes with
// the other siblings while any card is focused.
const LAYOUT = [
  [-2.6, 0.9, -1.2],
  [2.4, -0.5, 0.6],
  [-1.2, -1.3, 1.4],
  [1.6, 1.4, -0.8],
  [0.2, 0.1, -2.2],
];

export default function ShowcaseBoxes({ position = [0, 0, 0], animate = true }) {
  const group = useRef();

  const colors = useMemo(
    () => VERIFIED_CLIENTS.map((client) => new THREE.Color(client.palette[0])),
    []
  );

  useFrame((state, delta) => {
    if (!animate) return;
    if (!isBeatProgressActive(
      scrollState.progress,
      'work',
      BEAT_IDS,
      beatProgress,
    )) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (!group.current) return;
    group.current.rotation.y += dt * 0.05;
    const idx = focusBeacon.index;
    const damp = 1 - Math.exp(-dt * 6);
    for (let i = 0; i < group.current.children.length; i++) {
      const m = group.current.children[i];
      m.position.y = LAYOUT[i][1] + Math.sin(t * 0.6 + i * 1.7) * 0.25;
      m.rotation.x += dt * 0.1 * ((i % 2) ? 1 : -1);
      m.rotation.y += dt * 0.14;
      const glow = idx === i ? 0.7 : idx >= 0 ? 0.05 : 0.12;
      m.material.emissiveIntensity += (glow - m.material.emissiveIntensity) * damp;
    }
  });

  return (
    <group ref={group} position={position}>
      {LAYOUT.map((pos, i) => (
        <mesh key={i} position={pos}>
          <boxGeometry args={[1.5, 1.0, 0.12]} />
          <meshPhysicalMaterial
            transmission={0.85}
            thickness={0.4}
            roughness={0.15}
            ior={1.4}
            color={colors[i % colors.length]}
            emissive={colors[i % colors.length]}
            emissiveIntensity={0.12}
            transparent
          />
        </mesh>
      ))}
    </group>
  );
}
