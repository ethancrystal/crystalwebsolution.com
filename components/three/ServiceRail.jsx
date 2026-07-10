'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollState';
import { beatProgress } from '../../lib/beatProgress';
import { beacon } from '../../lib/beacon';

// The services beat: five emblems on a vertical rail, one per service row
// in components/sections/Services.jsx — replacing the copy-pasted hero
// Crystal, whose transmission material had nothing to refract at this depth
// but the #04060c void and so rendered as murky shards over the copy.
// Each emblem is a literal glyph for its service, top-to-bottom in row order:
//   01 Strategy & Direction — a compass: thin ring + double needle
//   02 Brand & Identity     — a flat faceted diamond (the Mark beat's silhouette)
//   03 Immersive Web & 3D   — a wireframe icosahedron (hero DNA, now labelled)
//   04 Design & Development — a 3×3 lattice of cubes (a design system)
//   05 Motion & Interaction — a torus knot, spinning fastest (a motion path)
// Sync is two house idioms at once: emblems ignite 01→05 as Services' own
// measured scroll span opens (ApproachCompass's windowing), and hovering a
// DOM row lifts its emblem via the lib/beacon.js singleton. Both feed one
// mass-spring-damper per emblem (ApproachCompass's constants) driving
// emissive + scale, so responses overshoot slightly and settle alive.
const COUNT = 5;
const RAIL_X = 2.0;
const TOP_Y = 1.4;
const STEP_Y = 0.7;
// z-stagger capped at ±0.6: enough depth for CameraRig's pointer parallax
// to bite, not enough to break the 1:1 top-to-bottom row mapping.
const Z_OFF = [0.35, -0.6, 0.1, -0.4, 0.6];
const ROT_SPEED = [0.25, 0.3, 0.4, 0.28, 0.9];
const BASE_SCALE = 0.3;

// Spring levels: dark until the scroll window ignites a row, bright while
// its DOM row is hovered. The spring value IS the emissive intensity.
const LEVEL_UNLIT = 0.15;
const LEVEL_LIT = 0.55;
const LEVEL_HOVER = 1.5;
const STIFFNESS = 90;
const DAMPING = 9;

const EMISSIVE_BASE = new THREE.Color('#3c6cff');
const EMISSIVE_ACTIVE = new THREE.Color('#59f3ff');

// 3×3 cube lattice offsets for the Design & Development emblem.
const LATTICE = [-0.55, 0, 0.55];

export default function ServiceRail({ position = [0, 0, 0] }) {
  const emblems = useRef([]);
  // { value, velocity } per emblem — tiny spring sims, never React state.
  const springs = useRef(
    Array.from({ length: COUNT }, () => ({ value: LEVEL_UNLIT, velocity: 0 }))
  );

  // One material per emblem, shared by all of that emblem's meshes, so the
  // frame loop mutates five materials instead of traversing children.
  const materials = useMemo(
    () =>
      Array.from(
        { length: COUNT },
        (_, i) =>
          new THREE.MeshStandardMaterial({
            color: '#3c6cff',
            emissive: '#3c6cff',
            emissiveIntensity: LEVEL_UNLIT,
            metalness: 0.3,
            roughness: 0.3,
            wireframe: i === 2,
          })
      ),
    []
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    const a = beatProgress.services;
    const b = beatProgress.approach;
    const span = Math.max(b - a, 0.0001);
    const ease = THREE.MathUtils.clamp((scrollState.progress - a) / span, 0, 1);
    const activeStep = Math.min(COUNT - 1, Math.floor(ease * COUNT));

    for (let i = 0; i < COUNT; i++) {
      const g = emblems.current[i];
      if (!g) continue;

      const target =
        beacon.index === i ? LEVEL_HOVER : i <= activeStep ? LEVEL_LIT : LEVEL_UNLIT;
      const s = springs.current[i];
      const force = (target - s.value) * STIFFNESS - s.velocity * DAMPING;
      s.velocity += force * dt;
      s.value += s.velocity * dt;

      const mat = materials[i];
      mat.emissiveIntensity = Math.max(0, s.value);
      // Shift toward the hero-core cyan as the spring rises past "lit".
      const heat = THREE.MathUtils.clamp(
        (s.value - LEVEL_LIT) / (LEVEL_HOVER - LEVEL_LIT),
        0,
        1
      );
      mat.emissive.lerpColors(EMISSIVE_BASE, EMISSIVE_ACTIVE, heat);

      g.rotation.y += dt * ROT_SPEED[i] * (1 + heat * 1.5);
      g.rotation.x = Math.sin(t * 0.4 + i * 1.3) * 0.18;
      g.scale.setScalar(BASE_SCALE * (1 + Math.max(0, s.value - LEVEL_LIT) * 0.2));
    }
  });

  return (
    <group position={position}>
      {/* 01 Strategy & Direction — compass */}
      <group
        ref={(el) => (emblems.current[0] = el)}
        position={[RAIL_X, TOP_Y, Z_OFF[0]]}
        scale={BASE_SCALE}
      >
        <mesh material={materials[0]}>
          <torusGeometry args={[1, 0.07, 10, 36]} />
        </mesh>
        <mesh material={materials[0]} position={[0, 0.33, 0]}>
          <coneGeometry args={[0.18, 0.66, 4]} />
        </mesh>
        <mesh material={materials[0]} position={[0, -0.33, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.18, 0.66, 4]} />
        </mesh>
      </group>

      {/* 02 Brand & Identity — flat faceted diamond, MarkAssembly's silhouette */}
      <group
        ref={(el) => (emblems.current[1] = el)}
        position={[RAIL_X, TOP_Y - STEP_Y, Z_OFF[1]]}
        scale={BASE_SCALE}
      >
        <mesh material={materials[1]} scale={[1, 1.25, 0.38]}>
          <octahedronGeometry args={[1, 0]} />
        </mesh>
      </group>

      {/* 03 Immersive Web & 3D — wireframe icosahedron */}
      <group
        ref={(el) => (emblems.current[2] = el)}
        position={[RAIL_X, TOP_Y - STEP_Y * 2, Z_OFF[2]]}
        scale={BASE_SCALE}
      >
        <mesh material={materials[2]}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      </group>

      {/* 04 Design & Development — 3×3 cube lattice */}
      <group
        ref={(el) => (emblems.current[3] = el)}
        position={[RAIL_X, TOP_Y - STEP_Y * 3, Z_OFF[3]]}
        scale={BASE_SCALE}
      >
        {LATTICE.map((x) =>
          LATTICE.map((y) => (
            <mesh key={`${x}:${y}`} material={materials[3]} position={[x, y, 0]}>
              <boxGeometry args={[0.34, 0.34, 0.34]} />
            </mesh>
          ))
        )}
      </group>

      {/* 05 Motion & Interaction — torus knot */}
      <group
        ref={(el) => (emblems.current[4] = el)}
        position={[RAIL_X, TOP_Y - STEP_Y * 4, Z_OFF[4]]}
        scale={BASE_SCALE}
      >
        <mesh material={materials[4]} scale={1.4}>
          <torusKnotGeometry args={[0.5, 0.12, 48, 8]} />
        </mesh>
      </group>
    </group>
  );
}
