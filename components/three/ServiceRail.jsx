'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scrollState } from '../../lib/scrollState';
import { beatProgress, BEAT_IDS } from '../../lib/beatProgress';
import { beacon } from '../../lib/beacon';
import { isBeatProgressActive } from '../../lib/sceneActivity.mjs';

// The services beat: eight abstract emblems on a vertical rail, one per
// service row in components/sections/Services.jsx. They deliberately describe
// the craft without becoming a second CWS logo: screen, lattice, facet,
// construction ring, radar, motion knot, connected AI nodes, and a pipeline.
// Top-to-bottom order exactly follows the DOM list:
//   01 Web Design           — framed responsive screen
//   02 Development          — code/system lattice
//   03 Branding             — faceted identity plane
//   04 Logo Design          — abstract construction ring
//   05 Digital Marketing    — radar and directional needle
//   06 Animation            — torus knot motion path
//   07 AI Automation        — connected decision nodes
//   08 Workflow Automation  — linked process pipeline
// Sync is two house idioms at once: emblems ignite 01→08 as Services' own
// measured scroll span opens (ApproachCompass's windowing), and hovering a
// DOM row lifts its emblem via the lib/beacon.js singleton. Both feed one
// mass-spring-damper per emblem (ApproachCompass's constants) driving
// emissive + scale, so responses overshoot slightly and settle alive.
const COUNT = 8;
const RAIL_X = -1.15;
const TOP_Y = 1.05;
const STEP_Y = 1.4;
// This shallow stagger gives pointer parallax depth without losing the
// top-to-bottom service mapping in CameraRig's framed services beat.
const Z_OFF = [0.35, -0.56, 0.1, -0.42, 0.54, -0.16, 0.62, -0.58];
const ROT_SPEED = [0.19, 0.28, 0.24, 0.17, 0.3, 0.9, 0.36, 0.22];
const BASE_SCALE = 0.19;

// Spring levels: dark until the scroll window ignites a row, bright while
// its DOM row is hovered. The spring value IS the emissive intensity.
const LEVEL_UNLIT = 0.15;
const LEVEL_LIT = 0.55;
const LEVEL_HOVER = 1.5;
const STIFFNESS = 90;
const DAMPING = 9;

const EMISSIVE_BASE = new THREE.Color('#3c6cff');
const EMISSIVE_ACTIVE = new THREE.Color('#59f3ff');

// The Blender design pass established a family of precise "signal
// instruments": open frames, calibrated rings, faceted cores and relay
// nodes. These builders recreate that vocabulary natively so there is no GLB
// download or decoder cost. Every instrument is merged into one geometry and
// rendered by one mesh/draw call.
function transformed(geometry, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
} = {}) {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotation[0], rotation[1], rotation[2])
  );
  matrix.compose(
    new THREE.Vector3(position[0], position[1], position[2]),
    quaternion,
    new THREE.Vector3(scale[0], scale[1], scale[2])
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}

function mergeSignalParts(parts) {
  // PolyhedronGeometry is non-indexed while boxes/rings are indexed. Normalize
  // once during construction so mixed forms merge reliably in the browser.
  const mergeable = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const geometry = mergeGeometries(mergeable, false);
  mergeable.forEach((part, index) => {
    if (part !== parts[index]) part.dispose();
  });
  parts.forEach((part) => part.dispose());

  if (!geometry) {
    throw new Error('Unable to merge service signal geometry');
  }

  geometry.computeBoundingSphere();
  return geometry;
}

function box(position, scale, rotation = [0, 0, 0]) {
  return transformed(new THREE.BoxGeometry(1, 1, 1), {
    position,
    rotation,
    scale,
  });
}

function torus(radius, tube, position = [0, 0, 0], rotation = [0, 0, 0], radial = 6, tubular = 24) {
  return transformed(new THREE.TorusGeometry(radius, tube, radial, tubular), {
    position,
    rotation,
  });
}

function sphere(radius, position, width = 8, height = 6) {
  return transformed(new THREE.SphereGeometry(radius, width, height), { position });
}

function cylinderBetween(start, end, radius = 0.035) {
  const from = new THREE.Vector3(start[0], start[1], start[2] || 0);
  const to = new THREE.Vector3(end[0], end[1], end[2] || 0);
  const delta = new THREE.Vector3().subVectors(to, from);
  const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const geometry = new THREE.CylinderGeometry(radius, radius, delta.length(), 6, 1);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize()
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(midpoint.x, midpoint.y, midpoint.z);
  return geometry;
}

function createSignalGeometries() {
  // 01 / Frame — an open viewport with a split horizon and signal cursor.
  const frame = mergeSignalParts([
    box([0, 0.61, 0], [1.42, 0.1, 0.14]),
    box([0, -0.61, 0], [1.42, 0.1, 0.14]),
    box([-0.71, 0, 0], [0.1, 1.32, 0.14]),
    box([0.71, 0, 0], [0.1, 1.32, 0.14]),
    box([-0.3, 0.15, 0.04], [0.58, 0.055, 0.08], [0, 0, -0.18]),
    box([0.25, -0.08, 0.04], [0.68, 0.055, 0.08], [0, 0, 0.2]),
    transformed(new THREE.ConeGeometry(0.11, 0.28, 4), {
      position: [0.48, 0.31, 0.05],
      rotation: [0, 0, -0.62],
    }),
  ]);

  // 02 / Lattice — a nine-cell computational field crossed by two buses.
  const latticeParts = [];
  for (const x of [-0.46, 0, 0.46]) {
    for (const y of [-0.46, 0, 0.46]) {
      const depth = x === 0 || y === 0 ? 0.24 : 0.16;
      latticeParts.push(box([x, y, 0], [0.24, 0.24, depth]));
    }
  }
  latticeParts.push(
    box([0, 0, -0.13], [1.18, 0.045, 0.045], [0, 0, 0.72]),
    box([0, 0, -0.13], [1.18, 0.045, 0.045], [0, 0, -0.72])
  );
  const lattice = mergeSignalParts(latticeParts);

  // 03 / Facet — a cut identity stone held inside a drafting orbit.
  const facet = mergeSignalParts([
    transformed(new THREE.OctahedronGeometry(0.72, 0), {
      rotation: [0.18, 0.28, Math.PI / 4],
      scale: [0.95, 1.12, 0.5],
    }),
    torus(0.88, 0.035, [0, 0, -0.04], [Math.PI / 2, 0, Math.PI / 4], 5, 28),
  ]);

  // 04 / Construction orbit — three orthogonal measuring rings and a datum.
  const orbit = mergeSignalParts([
    torus(0.72, 0.045, [0, 0, 0], [0, 0, 0], 6, 28),
    torus(0.72, 0.045, [0, 0, 0], [Math.PI / 2, 0, 0], 6, 28),
    torus(0.72, 0.045, [0, 0, 0], [0, Math.PI / 2, 0], 6, 28),
    sphere(0.15, [0, 0, 0], 8, 6),
  ]);

  // 05 / Radar — calibrated rings, sweep arm and three acquired points.
  const radar = mergeSignalParts([
    torus(0.76, 0.035, [0, 0, 0], [0, 0, 0], 5, 28),
    torus(0.5, 0.025, [0, 0, 0], [0, 0, 0], 5, 24),
    torus(0.24, 0.02, [0, 0, 0], [0, 0, 0], 5, 18),
    box([0.26, 0.18, 0.04], [0.68, 0.045, 0.07], [0, 0, 0.61]),
    transformed(new THREE.ConeGeometry(0.09, 0.24, 4), {
      position: [0.57, 0.4, 0.04],
      rotation: [0, 0, -0.96],
    }),
    sphere(0.065, [-0.34, 0.33, 0.04], 7, 5),
    sphere(0.055, [0.42, -0.34, 0.04], 7, 5),
    sphere(0.045, [-0.14, -0.58, 0.04], 7, 5),
  ]);

  // 06 / Motion knot — a continuous path with enough facets to catch light.
  const motion = transformed(new THREE.TorusKnotGeometry(0.5, 0.11, 52, 7), {
    rotation: [0.22, -0.18, 0.12],
    scale: [1.2, 1.2, 1.2],
  });
  motion.computeBoundingSphere();

  // 07 / Decision nodes — one source branching into three resolved outcomes.
  const decisionPoints = [
    [-0.56, 0.12, 0],
    [-0.04, 0.48, 0.04],
    [0.5, 0.24, -0.02],
    [0.42, -0.42, 0.03],
    [-0.22, -0.5, -0.03],
  ];
  const decisions = mergeSignalParts([
    ...decisionPoints.map((point, index) => sphere(index === 0 ? 0.17 : 0.13, point, 8, 6)),
    cylinderBetween(decisionPoints[0], decisionPoints[1]),
    cylinderBetween(decisionPoints[1], decisionPoints[2]),
    cylinderBetween(decisionPoints[1], decisionPoints[3]),
    cylinderBetween(decisionPoints[0], decisionPoints[4]),
    cylinderBetween(decisionPoints[4], decisionPoints[3]),
  ]);

  // 08 / Relay pipeline — alternating stations with directional hand-offs.
  const relayPoints = [
    [-0.65, 0.28, 0],
    [-0.22, -0.2, 0.04],
    [0.22, 0.22, -0.03],
    [0.65, -0.25, 0.02],
  ];
  const relay = mergeSignalParts([
    ...relayPoints.map((point, index) =>
      index % 2 === 0
        ? box(point, [0.23, 0.23, 0.23], [0, 0, Math.PI / 4])
        : transformed(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 6), {
            position: point,
            rotation: [Math.PI / 2, 0, 0],
          })
    ),
    cylinderBetween(relayPoints[0], relayPoints[1], 0.032),
    cylinderBetween(relayPoints[1], relayPoints[2], 0.032),
    cylinderBetween(relayPoints[2], relayPoints[3], 0.032),
    transformed(new THREE.ConeGeometry(0.095, 0.24, 4), {
      position: [0.76, -0.37, 0.02],
      rotation: [0, 0, -0.75],
    }),
  ]);

  return [frame, lattice, facet, orbit, radar, motion, decisions, relay];
}

export default function ServiceRail({ position = [0, 0, 0], animate = true }) {
  const rail = useRef();
  const emblems = useRef([]);
  // { value, velocity } per emblem — tiny spring sims, never React state.
  const springs = useRef(
    Array.from({ length: COUNT }, () => ({ value: LEVEL_UNLIT, velocity: 0 }))
  );
  const geometries = useMemo(() => createSignalGeometries(), []);

  // One material per emblem, shared by all of that emblem's meshes, so the
  // frame loop mutates eight materials instead of traversing children.
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

  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
    },
    [geometries, materials]
  );

  useFrame((state, delta) => {
    // The rail is an atmospheric desktop instrument, not mobile content.
    // Keep the compact and reduced-motion layouts typographically clean,
    // then restore it automatically if the viewport grows again.
    const canShow = animate && state.size.width > 900;
    if (rail.current) rail.current.visible = canShow;
    if (!canShow) return;
    if (!isBeatProgressActive(
      scrollState.progress,
      'services',
      BEAT_IDS,
      beatProgress,
    )) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;

    const a = beatProgress.services;
    const b = beatProgress.approach;
    const span = Math.max(b - a, 0.0001);
    const ease = THREE.MathUtils.clamp((scrollState.progress - a) / span, 0, 1);
    const activeStep = Math.min(COUNT - 1, Math.floor(ease * COUNT));

    // The DOM list is much taller than the viewport. Advance the authored
    // instrument rail by the same local progress so the current forms occupy
    // the quiet gutter beside the row being read instead of stacking over all
    // eight pieces of copy at once.
    if (rail.current) {
      rail.current.position.y = position[1] + ease * STEP_Y * (COUNT - 1);
    }

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
    <group ref={rail} position={position} visible={animate} dispose={null}>
      {geometries.map((geometry, index) => (
        <group
          key={index}
          ref={(el) => (emblems.current[index] = el)}
          position={[RAIL_X, TOP_Y - STEP_Y * index, Z_OFF[index]]}
          scale={BASE_SCALE}
        >
          <mesh geometry={geometry} material={materials[index]} />
        </group>
      ))}
    </group>
  );
}
