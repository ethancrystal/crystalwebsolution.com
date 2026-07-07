'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollState';
import { beatProgress } from '../../lib/beatProgress';

// One object sheds its mass; the mass becomes the mark.
//
// A cyan seed core (same visual language as the hero crystal's heart) sits
// at the mark anchor. The 26 shards live inside it at scale 0 — invisible —
// until the mark section's own measured scroll span opens (beatProgress.mark
// -> beatProgress.about — see lib/beatProgress.js). Deriving the window from
// the actual DOM section, rather than a fixed progress range, keeps the burst
// locked to when the Mark section is on screen even if an earlier section
// (Showcase's project grid) changes length. Within that window the shards
// burst outward from the core (scaling up, cyan) through a scatter waypoint,
// then converge into the diamond ring (shifting to brand violet), fully
// resolving partway through the section so Mark's own decode text (which
// waits on purpose, see components/sections/Mark.jsx) never races them.
const COUNT = 26;

const SEED_COLOR = new THREE.Color('#59f3ff');
const MARK_COLOR = new THREE.Color('#c084fc');
const ORIGIN = new THREE.Vector3(0, 0, 0);
const tmpVec = new THREE.Vector3();

function smoothstep(k) {
  return k * k * (3 - 2 * k);
}

export default function MarkAssembly({ position = [0, 0, 0] }) {
  const group = useRef();
  const core = useRef();

  const shards = useMemo(() => {
    const rng = (seed) => {
      let s = seed;
      return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };
    const rand = rng(1337);
    const arr = [];
    for (let i = 0; i < COUNT; i++) {
      // Target: ring of shards forming a diamond silhouette.
      const a = (i / COUNT) * Math.PI * 2;
      const r = 1.6 + Math.sin(a * 2) * 0.5;
      const target = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 1.25, 0);
      const scatter = new THREE.Vector3(
        (rand() - 0.5) * 11,
        (rand() - 0.5) * 8,
        (rand() - 0.5) * 10
      );
      arr.push({
        target,
        scatter,
        rotSpeed: 0.3 + rand() * 0.8,
        scale: 0.12 + rand() * 0.2,
      });
    }
    return arr;
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    if (!group.current) return;
    // The mark section's own measured scroll span (see file header) —
    // read live every frame since beatProgress can be re-measured on resize.
    const a = beatProgress.mark;
    const b = beatProgress.about;
    const span = Math.max(b - a, 0.0001);
    const ease = smoothstep(THREE.MathUtils.clamp((scrollState.progress - a) / span, 0, 1));
    // Two overlapping sub-phases of the same window: burst (origin -> scatter,
    // scale 0 -> 1) finishes by ease 0.45; assemble (scatter -> target) runs
    // ease 0.35 -> 1. Both stay at zero until the window opens.
    const burst = smoothstep(THREE.MathUtils.clamp(ease / 0.45, 0, 1));
    const assemble = smoothstep(THREE.MathUtils.clamp((ease - 0.35) / 0.65, 0, 1));

    for (let i = 0; i < group.current.children.length; i++) {
      const m = group.current.children[i];
      const s = shards[i];
      tmpVec.lerpVectors(ORIGIN, s.scatter, burst);
      m.position.lerpVectors(tmpVec, s.target, assemble);
      m.scale.setScalar(Math.max(s.scale * burst, 0.0001));
      m.rotation.x += dt * s.rotSpeed * (1 - assemble * 0.85);
      m.rotation.y += dt * s.rotSpeed;
      m.material.color.lerpColors(SEED_COLOR, MARK_COLOR, ease);
      m.material.emissive.copy(m.material.color);
      m.material.emissiveIntensity = 0.3 + burst * 0.5 + assemble * 1.3;
    }
    group.current.rotation.z = (1 - assemble) * 0.6;

    if (core.current) {
      core.current.rotation.y -= dt * 0.5;
      // The core sheds its mass into the shards, then glows as their heart.
      const cs = 0.5 * (1 - burst * 0.45);
      core.current.scale.setScalar(cs);
      core.current.material.emissiveIntensity =
        0.8 + Math.sin(t * 2.0) * 0.2 + ease * 1.4;
    }
  });

  return (
    <group position={position}>
      <mesh ref={core} scale={0.5}>
        <octahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#59f3ff"
          emissive="#59f3ff"
          emissiveIntensity={0.8}
          metalness={0.1}
          roughness={0.2}
        />
      </mesh>
      <group ref={group}>
        {shards.map((s, i) => (
          <mesh key={i} scale={0.0001}>
            <tetrahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color="#59f3ff"
              emissive="#59f3ff"
              emissiveIntensity={0.3}
              metalness={0.4}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
