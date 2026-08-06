// Shared service-signal geometry — the SINGLE SOURCE OF TRUTH for the eight
// "signal instruments" used both by the homepage 3D rail (components/three/
// ServiceRail.jsx) AND the inner marketing-page emblems (components/three/
// ServiceEmblem3D.jsx). Extracted from ServiceRail so the inner pages render
// the EXACT same 3D forms as the homepage card — the visual tie the brief
// asks for — without copying geometry code or shipping a second GLB.
//
// Pure (no React, no WebGL context) so it is unit-testable in Node and safe to
// import from both the homepage Scene and the isolated inner-page canvases.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SERVICES } from './services.mjs';
import { SERVICE_SIGNAL_META } from './serviceSignals.mjs';

export const EMISSIVE_BASE = '#3c6cff';
export const EMISSIVE_ACTIVE = '#59f3ff';

const COUNT = SERVICES.length;

function transformed(geometry, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
} = {}) {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(rotation[0], rotation[1], rotation[2]),
  );
  matrix.compose(
    new THREE.Vector3(position[0], position[1], position[2]),
    quaternion,
    new THREE.Vector3(scale[0], scale[1], scale[2]),
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}

function mergeSignalParts(parts) {
  const mergeable = parts.map((part) => (part.index ? part.toNonIndexed() : part));
  const geometry = mergeGeometries(mergeable, false);
  mergeable.forEach((part, index) => {
    if (part !== parts[index]) part.dispose();
  });
  parts.forEach((part) => part.dispose());
  if (!geometry) throw new Error('Unable to merge service signal geometry');
  geometry.computeBoundingSphere();
  return geometry;
}

function box(position, scale, rotation = [0, 0, 0]) {
  return transformed(new THREE.BoxGeometry(1, 1, 1), { position, rotation, scale });
}

function torus(radius, tube, position = [0, 0, 0], rotation = [0, 0, 0], radial = 6, tubular = 24) {
  return transformed(new THREE.TorusGeometry(radius, tube, radial, tubular), { position, rotation });
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
    delta.normalize(),
  );
  geometry.applyQuaternion(quaternion);
  geometry.translate(midpoint.x, midpoint.y, midpoint.z);
  return geometry;
}

// Builders mirror components/three/ServiceRail.jsx exactly.
function buildSignalGeometries() {
  // 01 / Web — open viewport with split horizon and signal cursor.
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

  // 02 / Development — layered application stack with runtime nodes.
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

  // 03 / Brand — cut identity stone inside a drafting orbit.
  const facet = mergeSignalParts([
    transformed(new THREE.OctahedronGeometry(0.72, 0), {
      rotation: [0.18, 0.28, Math.PI / 4],
      scale: [0.95, 1.12, 0.5],
    }),
    torus(0.88, 0.035, [0, 0, -0.04], [Math.PI / 2, 0, Math.PI / 4], 5, 28),
  ]);

  // 04 / Logo — constructed diamond mark inside a registration ring.
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

  // 06 / Animation — continuous torus-knot path.
  const motion = transformed(new THREE.TorusKnotGeometry(0.5, 0.11, 52, 7), {
    rotation: [0.22, -0.18, 0.12],
    scale: [1.2, 1.2, 1.2],
  });
  motion.computeBoundingSphere();

  // 07 / AI — one source branching into resolved outcomes.
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
          }),
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

// Ordered array (matches SERVICES), used by the homepage rail.
let _ordered = null;
export function createSignalGeometries() {
  if (!_ordered) _ordered = buildSignalGeometries();
  return _ordered;
}

// Map keyed by signal, used by the inner-page emblem (look up by signal, not index).
let _bySignal = null;
export function getSignalGeometry(signal) {
  if (!_bySignal) {
    const ordered = createSignalGeometries();
    _bySignal = {};
    SERVICES.forEach(({ signal: s }, i) => { _bySignal[s] = ordered[i]; });
  }
  const geometry = _bySignal[signal];
  if (!geometry) throw new Error(`Missing service signal geometry: ${signal}`);
  return geometry;
}

export { COUNT };
