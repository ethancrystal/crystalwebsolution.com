'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { scrollState } from '../../lib/scrollState';
import { beatProgress, BEAT_IDS } from '../../lib/beatProgress';
import { beacon } from '../../lib/beacon';
import { motionScale } from '../../lib/motionScale';
import { isBeatProgressActive } from '../../lib/sceneActivity.mjs';
import { SERVICES } from '../../lib/services.mjs';
import { SERVICE_SIGNAL_META } from '../../lib/serviceSignals.mjs';

// The services beat: eight abstract emblems on a vertical rail, one per
// service row in components/sections/Services.jsx. They deliberately describe
// the craft without becoming a second CWS logo: screen, facet, motion knot,
// radar, connected AI nodes, and a pipeline.
// Top-to-bottom order exactly follows the DOM list:
//   01 Web Design          — framed responsive screen
//   02 Development         — layered application architecture
//   03 Branding            — faceted identity plane
//   04 Logo Design         — constructed mark and registration ring
//   05 Digital Marketing   — radar and directional needle
//   06 Animation           — torus-knot motion path
//   07 AI Automation       — connected decision nodes
//   08 Workflow Automation — linked process pipeline
// Sync is two house idioms at once: emblems ignite 01→08 as Services' own
// measured scroll span opens (ApproachCompass's windowing), and hovering a
// DOM row lifts its emblem via the lib/beacon.js singleton. Both feed one
// mass-spring-damper per emblem (ApproachCompass's constants) driving
// emissive + scale, so responses overshoot slightly and settle alive.
//
// Spotlight + performance pass: beyond ignition, exactly one emblem is "in
// focus" at a time — the hovered row's, or the scroll-active row's when
// nothing is hovered. A second spring per emblem pulls the focused form
// larger, brighter and toward the camera while the rest recede, and each
// emblem carries a small bright cyan ACTOR that demonstrates its service
// while focused: the radar pings, a comet rides the motion knot, a decision
// pulse branches through the AI nodes, a packet hops the workflow pipeline,
// a scanline sweeps the web viewport, data descends the development stack,
// a drafting point orbits the brand stone, and a registration tick traces
// the logo ring. Actors are one or four extra meshes per emblem, all
// pre-built geometry, phase state in refs — never React state — and every
// per-frame speed multiplies motionScale.value so reduced motion freezes
// the choreography without hiding the forms.
const COUNT = SERVICES.length;
const RAIL_X = -1.15;
const TOP_Y = 1.05;
const STEP_Y = 1;
// This shallow stagger gives pointer parallax depth without losing the
// top-to-bottom service mapping in CameraRig's framed services beat. Values
// live in lib/serviceSignals.mjs, keyed by signal (not index), so reordering
// SERVICES can't silently detach an emblem from its own motion/wireframe.
const RAIL_META = SERVICES.map(({ signal }) => {
  const meta = SERVICE_SIGNAL_META[signal];
  if (!meta) throw new Error(`Missing service signal metadata: ${signal}`);
  return meta;
});
const BASE_SCALE = 0.19;

// Spring levels: dark until the scroll window ignites a row, focused while
// its row is the current one, bright while its DOM row is hovered. The
// spring value IS the emissive intensity. LEVEL_LIT is deliberately dimmer
// than the old flat "everything on" value so the focused emblem owns the
// moment instead of joining a field of equally-bright shapes.
const LEVEL_UNLIT = 0.15;
const LEVEL_LIT = 0.4;
const LEVEL_ACTIVE = 1.05;
const LEVEL_HOVER = 1.5;
const STIFFNESS = 90;
const DAMPING = 9;

// Focus spring drives the spotlight: scale-up, camera pull and actor
// intensity. 0 = receded, 1 = focused; overshoot past 1 is the springiness.
const FOCUS_SCALE_GAIN = 0.95;
const FOCUS_Z_PULL = 0.45;

const EMISSIVE_BASE = new THREE.Color('#3c6cff');
const EMISSIVE_ACTIVE = new THREE.Color('#59f3ff');
// Actors are unlit MeshBasicMaterial pushed past 1.0 so the bloom pass
// reads them as signal light, same family as the hero-core cyan.
const ACTOR_COLOR = new THREE.Color('#59f3ff').multiplyScalar(1.7);

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

// Node/way positions the demo actors travel. Shared with the geometry
// builders below — if a builder's layout moves, move these with it.
const DEV_STACK_PATH = [
  new THREE.Vector3(-0.5, 0.46, 0.04),
  new THREE.Vector3(-0.37, 0, 0.04),
  new THREE.Vector3(0, 0, 0.08),
  new THREE.Vector3(0.37, 0, 0.04),
  new THREE.Vector3(0.5, -0.46, 0.04),
];
const AI_NODES = [
  new THREE.Vector3(-0.56, 0.12, 0),
  new THREE.Vector3(-0.04, 0.48, 0.04),
  new THREE.Vector3(0.5, 0.24, -0.02),
  new THREE.Vector3(0.42, -0.42, 0.03),
  new THREE.Vector3(-0.22, -0.5, -0.03),
];
// Node index routes along real edges: one source resolving into outcomes.
const AI_ROUTES = [
  [0, 1, 2],
  [0, 1, 3],
  [0, 4, 3],
];
const WORKFLOW_STATIONS = [
  new THREE.Vector3(-0.65, 0.28, 0),
  new THREE.Vector3(-0.22, -0.2, 0.04),
  new THREE.Vector3(0.22, 0.22, -0.03),
  new THREE.Vector3(0.65, -0.25, 0.02),
];
const MARKETING_BLIPS = [
  new THREE.Vector3(-0.34, 0.33, 0.04),
  new THREE.Vector3(0.42, -0.34, 0.04),
  new THREE.Vector3(-0.14, -0.58, 0.04),
];
const MARKETING_BLIP_RADII = MARKETING_BLIPS.map((p) => Math.hypot(p.x, p.y));
// The brand orbit torus and motion knot are authored transformed; actors
// reuse the exact same transforms so they ride the visible geometry.
const BRAND_ORBIT_Q = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(Math.PI / 2, 0, Math.PI / 4)
);
const MOTION_TRANSFORM = new THREE.Matrix4().compose(
  new THREE.Vector3(0, 0, 0),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(0.22, -0.18, 0.12)),
  new THREE.Vector3(1.2, 1.2, 1.2)
);

// Loop lengths in seconds-ish at full focus (phase advances by
// dt * speed, scaled down while merely lit and by motionScale).
const ACTOR_SPEED = {
  web: 0.35,
  development: 0.4,
  brand: 1.4,
  logo: 1.6,
  marketing: 0.55,
  motion: 2.2,
  ai: 0.5,
  workflow: 0.45,
};

const TMP_V = new THREE.Vector3();

function fract(v) {
  return v - Math.floor(v);
}

function lerpAlong(points, u, out) {
  const segments = points.length - 1;
  const scaled = Math.min(u, 0.9999) * segments;
  const i0 = Math.floor(scaled);
  return out.lerpVectors(points[i0], points[i0 + 1], scaled - i0);
}

// One updater per signal: mutate the actor meshes for this frame. `rate` is
// the pre-scaled phase advance (dt * focus ramp * motionScale); `op` is the
// resolved actor opacity for this emblem.
const ACTOR_UPDATERS = {
  // A scanline sweeping the viewport top to bottom — the frame being drawn.
  web(store, ph, rate, op) {
    if (!store.scan) return;
    ph.t += rate * ACTOR_SPEED.web;
    store.scan.position.y = 0.45 - fract(ph.t) * 0.9;
    store.scan.material.opacity = op;
  },
  // A data packet descending the stack: top node, through the core, out the
  // bottom — the runtime actually running.
  development(store, ph, rate, op) {
    if (!store.dot) return;
    ph.t += rate * ACTOR_SPEED.development;
    lerpAlong(DEV_STACK_PATH, fract(ph.t), TMP_V);
    store.dot.position.copy(TMP_V);
    store.dot.material.opacity = op;
  },
  // A drafting point circling the identity stone on its authored orbit.
  brand(store, ph, rate, op) {
    if (!store.dot) return;
    ph.t += rate * ACTOR_SPEED.brand;
    TMP_V.set(Math.cos(ph.t) * 0.88, Math.sin(ph.t) * 0.88, 0).applyQuaternion(
      BRAND_ORBIT_Q
    );
    store.dot.position.set(TMP_V.x, TMP_V.y, TMP_V.z - 0.04);
    store.dot.material.opacity = op;
  },
  // A registration tick tracing the construction circle around the mark.
  logo(store, ph, rate, op) {
    if (!store.dot) return;
    ph.t += rate * ACTOR_SPEED.logo;
    store.dot.position.set(Math.cos(ph.t) * 0.78, Math.sin(ph.t) * 0.78, -0.04);
    store.dot.material.opacity = op;
  },
  // A sonar ping expanding through the calibrated rings; each acquired
  // point flashes as the wavefront passes its radius.
  marketing(store, ph, rate, op, dt) {
    if (!store.ring) return;
    ph.t += rate * ACTOR_SPEED.marketing;
    const u = fract(ph.t);
    const radius = 0.06 + u * 0.74;
    store.ring.scale.set(radius, radius, 1);
    store.ring.material.opacity = op * (1 - u) * (1 - u);
    const decay = Math.exp(-dt * 6);
    for (let j = 0; j < MARKETING_BLIP_RADII.length; j++) {
      const blip = store[`blip${j}`];
      if (!blip) continue;
      if (Math.abs(radius - MARKETING_BLIP_RADII[j]) < 0.07) ph.blips[j] = 1;
      else ph.blips[j] *= decay;
      blip.scale.setScalar(0.05 + ph.blips[j] * 0.075);
      blip.material.opacity = op;
    }
  },
  // A comet riding the exact torus-knot path (p=2, q=3, r=0.5, then the
  // knot's authored rotation + 1.2 scale) — motion made literal.
  motion(store, ph, rate, op) {
    if (!store.dot) return;
    ph.t += rate * ACTOR_SPEED.motion;
    const u = ph.t % (Math.PI * 4);
    const cs = Math.cos(1.5 * u);
    TMP_V.set(
      0.25 * (2 + cs) * Math.cos(u),
      0.25 * (2 + cs) * Math.sin(u),
      0.25 * Math.sin(1.5 * u)
    ).applyMatrix4(MOTION_TRANSFORM);
    store.dot.position.copy(TMP_V);
    store.dot.material.opacity = op;
  },
  // A decision pulse leaving the source node and resolving along a
  // different branch each journey.
  ai(store, ph, rate, op) {
    if (!store.dot) return;
    ph.t += rate * ACTOR_SPEED.ai;
    const route = AI_ROUTES[Math.floor(ph.t) % AI_ROUTES.length];
    const scaled = Math.min(fract(ph.t), 0.9999) * 2;
    const i0 = Math.floor(scaled);
    TMP_V.lerpVectors(AI_NODES[route[i0]], AI_NODES[route[i0 + 1]], scaled - i0);
    store.dot.position.copy(TMP_V);
    store.dot.material.opacity = op;
  },
  // A work item hopping station to station down the pipeline.
  workflow(store, ph, rate, op) {
    if (!store.dot) return;
    ph.t += rate * ACTOR_SPEED.workflow;
    const u = fract(ph.t);
    const scaled = Math.min(u, 0.9999) * 3;
    const i0 = Math.floor(scaled);
    const segT = scaled - i0;
    TMP_V.lerpVectors(WORKFLOW_STATIONS[i0], WORKFLOW_STATIONS[i0 + 1], segT);
    store.dot.position.set(TMP_V.x, TMP_V.y, TMP_V.z + Math.sin(segT * Math.PI) * 0.1);
    store.dot.material.opacity = op;
  },
};

function createSignalGeometries() {
  // 01 / Web — an open viewport with a split horizon and signal cursor.
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

  // 02 / Development — a layered application stack with connected runtime
  // nodes. The shallow depth offsets keep it architectural rather than logo-like.
  const development = mergeSignalParts([
    box([0, 0.46, -0.03], [1.18, 0.11, 0.18]),
    box([0, 0, 0.03], [0.92, 0.11, 0.18]),
    box([0, -0.46, -0.03], [1.18, 0.11, 0.18]),
    cylinderBetween([-0.5, 0.46, 0], [-0.37, 0, 0.04], 0.028),
    cylinderBetween([0.5, 0.46, 0], [0.37, 0, 0.04], 0.028),
    cylinderBetween([-0.37, 0, 0.04], [-0.5, -0.46, 0], 0.028),
    cylinderBetween([0.37, 0, 0.04], [0.5, -0.46, 0], 0.028),
    sphere(0.09, [-0.5, 0.46, 0.04], 7, 5),
    sphere(0.09, [0.5, 0.46, 0.04], 7, 5),
    sphere(0.1, [0, 0, 0.08], 7, 5),
    sphere(0.09, [-0.5, -0.46, 0.04], 7, 5),
    sphere(0.09, [0.5, -0.46, 0.04], 7, 5),
  ]);

  // 03 / Brand — a cut identity stone held inside a drafting orbit.
  const facet = mergeSignalParts([
    transformed(new THREE.OctahedronGeometry(0.72, 0), {
      rotation: [0.18, 0.28, Math.PI / 4],
      scale: [0.95, 1.12, 0.5],
    }),
    torus(0.88, 0.035, [0, 0, -0.04], [Math.PI / 2, 0, Math.PI / 4], 5, 28),
  ]);

  // 04 / Logo — a constructed diamond mark inside a registration ring.
  const logo = mergeSignalParts([
    torus(0.78, 0.035, [0, 0, -0.04], [0, 0, 0], 5, 28),
    box([-0.31, 0.31, 0.03], [0.62, 0.08, 0.13], [0, 0, -Math.PI / 4]),
    box([0.31, 0.31, 0.03], [0.62, 0.08, 0.13], [0, 0, Math.PI / 4]),
    box([0.31, -0.31, 0.03], [0.62, 0.08, 0.13], [0, 0, -Math.PI / 4]),
    box([-0.31, -0.31, 0.03], [0.62, 0.08, 0.13], [0, 0, Math.PI / 4]),
    torus(0.19, 0.055, [0, 0, 0.08], [0, 0, 0], 6, 20),
  ]);

  // 05 / Marketing — calibrated rings, sweep arm and acquired points.
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

  // 06 / Animation — a continuous path with enough facets to catch light.
  const motion = transformed(new THREE.TorusKnotGeometry(0.5, 0.11, 52, 7), {
    rotation: [0.22, -0.18, 0.12],
    scale: [1.2, 1.2, 1.2],
  });
  motion.computeBoundingSphere();

  // 07 / AI — one source branching into three resolved outcomes.
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

  // 08 / Workflow — alternating stations with directional hand-offs.
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

  const geometryBySignal = {
    web: frame,
    development,
    brand: facet,
    logo,
    marketing: radar,
    motion,
    ai: decisions,
    workflow: relay,
  };

  return SERVICES.map(({ signal }) => {
    const geometry = geometryBySignal[signal];
    if (!geometry) throw new Error(`Missing service signal geometry: ${signal}`);
    return geometry;
  });
}

// Declarative actor meshes per signal. Refs land in the per-emblem store
// object read by ACTOR_UPDATERS; geometry/materials come from the shared
// actor asset pool so each emblem costs at most one extra material.
function actorMeshes(signal, assets, store, material) {
  switch (signal) {
    case 'web':
      return (
        <mesh
          ref={(el) => (store.scan = el)}
          geometry={assets.scan}
          material={material}
          position={[0, 0.45, 0.1]}
        />
      );
    case 'marketing':
      return (
        <>
          <mesh
            ref={(el) => (store.ring = el)}
            geometry={assets.ping}
            material={assets.ringMat}
            position={[0, 0, 0.02]}
            scale={[0.06, 0.06, 1]}
          />
          {MARKETING_BLIPS.map((p, j) => (
            <mesh
              key={j}
              ref={(el) => (store[`blip${j}`] = el)}
              geometry={assets.dot}
              material={material}
              position={[p.x, p.y, p.z]}
              scale={0.05}
            />
          ))}
        </>
      );
    default:
      // Every travelling actor (dev packet, brand point, logo tick, motion
      // comet, ai pulse, workflow item) is one small bright dot.
      return (
        <mesh
          ref={(el) => (store.dot = el)}
          geometry={assets.dot}
          material={material}
          scale={signal === 'ai' ? 0.085 : 0.07}
        />
      );
  }
}

export default function ServiceRail({ position = [0, 0, 0], animate = true }) {
  const rail = useRef();
  const emblems = useRef([]);
  // { value, velocity } per emblem — tiny spring sims, never React state.
  const springs = useRef(
    Array.from({ length: COUNT }, () => ({ value: LEVEL_UNLIT, velocity: 0 }))
  );
  // Second spring per emblem for the spotlight (0 = receded, 1 = focused).
  const focusSprings = useRef(
    Array.from({ length: COUNT }, () => ({ value: 0, velocity: 0 }))
  );
  // Actor mesh refs + phase clocks, staggered so neighbours never sync up.
  const actorStores = useRef(Array.from({ length: COUNT }, () => ({})));
  const actorPhases = useRef(
    Array.from({ length: COUNT }, (_, i) => ({ t: i * 0.37, blips: [0, 0, 0] }))
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
            wireframe: RAIL_META[i].wireframe === true,
          })
      ),
    []
  );

  // Shared actor pool: unit primitives scaled per mesh, one unlit material
  // per emblem (plus the ping ring's own, since its opacity fades per ping).
  const actorAssets = useMemo(() => {
    const dot = new THREE.SphereGeometry(1, 8, 6);
    const scan = new THREE.BoxGeometry(1.18, 0.035, 0.05);
    const ping = new THREE.TorusGeometry(1, 0.022, 5, 40);
    const makeMat = () =>
      new THREE.MeshBasicMaterial({
        color: ACTOR_COLOR,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
    return {
      dot,
      scan,
      ping,
      ringMat: makeMat(),
      mats: Array.from({ length: COUNT }, makeMat),
    };
  }, []);

  useEffect(
    () => () => {
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      actorAssets.dot.dispose();
      actorAssets.scan.dispose();
      actorAssets.ping.dispose();
      actorAssets.ringMat.dispose();
      actorAssets.mats.forEach((material) => material.dispose());
    },
    [geometries, materials, actorAssets]
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
    // The spotlight index: hover always wins; otherwise the scroll-active
    // row (mirrors Services.jsx's auto-advance, so DOM marker, row shine and
    // this emblem all agree on which service is "now").
    const focusIndex = beacon.index !== -1 ? beacon.index : activeStep;

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
        beacon.index === i
          ? LEVEL_HOVER
          : focusIndex === i
            ? LEVEL_ACTIVE
            : i <= activeStep
              ? LEVEL_LIT
              : LEVEL_UNLIT;
      const s = springs.current[i];
      const force = (target - s.value) * STIFFNESS - s.velocity * DAMPING;
      s.velocity += force * dt;
      s.value += s.velocity * dt;

      const f = focusSprings.current[i];
      const focusForce =
        ((focusIndex === i ? 1 : 0) - f.value) * STIFFNESS - f.velocity * DAMPING;
      f.velocity += focusForce * dt;
      f.value += f.velocity * dt;
      const fv = THREE.MathUtils.clamp(f.value, 0, 1.15);

      const mat = materials[i];
      mat.emissiveIntensity = Math.max(0, s.value);
      // Shift toward the hero-core cyan as the spring rises past "lit".
      const heat = THREE.MathUtils.clamp(
        (s.value - LEVEL_LIT) / (LEVEL_HOVER - LEVEL_LIT),
        0,
        1
      );
      mat.emissive.lerpColors(EMISSIVE_BASE, EMISSIVE_ACTIVE, heat);

      // The focused emblem steadies its tumble so its performance reads;
      // receded emblems keep the ambient drift.
      const steady = 1 - 0.55 * Math.min(fv, 1);
      g.rotation.y += dt * RAIL_META[i].rotSpeed * (1 + heat * 1.5) * steady * motionScale.value;
      g.rotation.x = Math.sin(t * 0.4 + i * 1.3) * 0.18 * steady * motionScale.value;

      // Spotlight: ignition still nudges scale, but focus is what makes one
      // emblem grow toward the camera while the rest recede.
      const litMix = THREE.MathUtils.clamp(
        (s.value - LEVEL_UNLIT) / (LEVEL_LIT - LEVEL_UNLIT),
        0,
        1
      );
      g.scale.setScalar(BASE_SCALE * (0.88 + 0.12 * litMix + FOCUS_SCALE_GAIN * fv));
      g.position.z = RAIL_META[i].zOffset + FOCUS_Z_PULL * fv;

      // Demo actor: idles faintly while merely lit, performs at full
      // brightness and speed while focused. Reduced motion freezes the
      // phase (rate → 0) without hiding the composed form.
      const store = actorStores.current[i];
      if (store) {
        const op = litMix * (0.16 + 0.74 * Math.min(fv, 1));
        const groupVisible = op > 0.02;
        if (store.group) store.group.visible = groupVisible;
        if (groupVisible) {
          const rate = dt * (0.3 + 0.7 * Math.min(fv, 1)) * motionScale.value;
          ACTOR_UPDATERS[SERVICES[i].signal]?.(store, actorPhases.current[i], rate, op, dt);
        }
      }
    }
  });

  return (
    <group ref={rail} position={position} visible={animate} dispose={null}>
      {geometries.map((geometry, index) => (
        <group
          key={index}
          ref={(el) => (emblems.current[index] = el)}
          position={[RAIL_X, TOP_Y - STEP_Y * index, RAIL_META[index].zOffset]}
          scale={BASE_SCALE}
        >
          <mesh geometry={geometry} material={materials[index]} />
          <group
            ref={(el) => (actorStores.current[index].group = el)}
            visible={false}
          >
            {actorMeshes(
              SERVICES[index].signal,
              actorAssets,
              actorStores.current[index],
              actorAssets.mats[index]
            )}
          </group>
        </group>
      ))}
    </group>
  );
}
