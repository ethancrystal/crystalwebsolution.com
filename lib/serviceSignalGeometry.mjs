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
//
// Design rule: every form is a LITERAL object a visitor already knows —
// a browser window, code brackets, a megaphone, a play button, a magnifier.
// The previous set were abstract "signal instruments" (a torus-knot, an
// octahedron in an orbit, calibrated radar rings) that read as "some blue
// shape" on every page and told the reader nothing about the service. Forms
// are built face-on and bold enough to survive 120px; ServiceEmblem3D keeps
// them inside a shallow yaw so they are never seen edge-on.
function buildSignalGeometries() {
  // 01 / Web — a browser window: chrome bar with three dots, a headline, a
  // body line, and the call-to-action pill that earns the click.
  const frame = mergeSignalParts([
    box([0, 0.66, 0], [1.56, 0.12, 0.16]),
    box([0, -0.66, 0], [1.56, 0.12, 0.16]),
    box([-0.78, 0, 0], [0.12, 1.44, 0.16]),
    box([0.78, 0, 0], [0.12, 1.44, 0.16]),
    box([0, 0.38, 0], [1.44, 0.06, 0.12]),
    sphere(0.055, [-0.58, 0.52, 0.06], 7, 5),
    sphere(0.055, [-0.43, 0.52, 0.06], 7, 5),
    sphere(0.055, [-0.28, 0.52, 0.06], 7, 5),
    box([-0.18, 0.1, 0.05], [0.86, 0.11, 0.1]),
    box([-0.06, -0.13, 0.05], [1.1, 0.06, 0.08]),
    box([-0.33, -0.41, 0.06], [0.56, 0.17, 0.12]),
  ]);

  // 02 / Development — the universal code mark: < / >.
  const development = mergeSignalParts([
    box([-0.56, 0.24, 0], [0.62, 0.13, 0.16], [0, 0, 0.84]),
    box([-0.56, -0.24, 0], [0.62, 0.13, 0.16], [0, 0, -0.84]),
    box([0.56, 0.24, 0], [0.62, 0.13, 0.16], [0, 0, -0.84]),
    box([0.56, -0.24, 0], [0.62, 0.13, 0.16], [0, 0, 0.84]),
    box([0, 0, 0.02], [0.13, 1.1, 0.16], [0, 0, -0.36]),
  ]);

  // 03 / Brand — a tag: the mark that hangs on everything you sell. Chosen
  // because its OUTLINE is iconic — a filled body, a pointed end, and an
  // eyelet ring standing clear of it — so it stays readable as one flat
  // colour, where a stack of same-colour cards fused into a blob. The ring
  // is offset off the point so it is seen against the dark, not the body.
  const facet = mergeSignalParts([
    box([0.1, -0.02, 0], [0.98, 0.62, 0.16], [0, 0, -0.62]),
    transformed(new THREE.CylinderGeometry(0.31, 0.31, 0.16, 3, 1, false, Math.PI / 2), {
      position: [-0.5, 0.46, 0],
      rotation: [Math.PI / 2, 0, -0.62 + Math.PI],
    }),
    torus(0.12, 0.05, [-0.72, 0.64, 0], [0, 0, 0], 6, 24),
    box([0.22, -0.12, 0.09], [0.42, 0.07, 0.04], [0, 0, -0.62]),
    box([0.3, 0.03, 0.09], [0.26, 0.07, 0.04], [0, 0, -0.62]),
  ]);

  // 04 / Logo — a constructed mark inside its registration ring, bold
  // enough to hold at favicon size.
  const logo = mergeSignalParts([
    torus(0.8, 0.05, [0, 0, -0.04], [0, 0, 0], 6, 32),
    box([-0.31, 0.31, 0.03], [0.66, 0.11, 0.15], [0, 0, -Math.PI / 4]),
    box([0.31, 0.31, 0.03], [0.66, 0.11, 0.15], [0, 0, Math.PI / 4]),
    box([0.31, -0.31, 0.03], [0.66, 0.11, 0.15], [0, 0, -Math.PI / 4]),
    box([-0.31, -0.31, 0.03], [0.66, 0.11, 0.15], [0, 0, Math.PI / 4]),
    torus(0.2, 0.06, [0, 0, 0.08], [0, 0, 0], 6, 20),
  ]);

  // 05 / Marketing — a megaphone: bell opening to the right, mouthpiece,
  // handle, and three sound beads leaving the bell.
  const radar = mergeSignalParts([
    transformed(new THREE.ConeGeometry(0.44, 0.92, 14, 1, true), {
      position: [0.16, 0.06, 0],
      rotation: [0, 0, Math.PI / 2],
    }),
    transformed(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 10), {
      position: [-0.44, 0.06, 0],
      rotation: [0, 0, Math.PI / 2],
    }),
    box([-0.3, -0.34, 0], [0.13, 0.46, 0.14], [0, 0, 0.18]),
    sphere(0.06, [0.8, 0.44, 0], 7, 5),
    sphere(0.06, [0.9, 0.06, 0], 7, 5),
    sphere(0.06, [0.8, -0.32, 0], 7, 5),
  ]);

  // 06 / Animation — a play button. Rendered wireframe (SERVICE_SIGNAL_META),
  // so it reads as the outlined play icon everyone knows; segment counts are
  // kept low so the outline stays clean rather than dense.
  const motion = mergeSignalParts([
    torus(0.74, 0.07, [0, 0, 0], [0, 0, 0], 4, 36),
    transformed(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 3, 1, false, Math.PI / 2), {
      position: [0.07, 0, 0],
      rotation: [Math.PI / 2, 0, 0],
    }),
  ]);

  // 07 / AI — one source branching into resolved outcomes, nodes and links
  // thickened so the network reads at emblem size.
  const decisionPoints = [
    [-0.58, 0.12, 0],
    [-0.04, 0.5, 0.04],
    [0.52, 0.26, -0.02],
    [0.44, -0.44, 0.03],
    [-0.22, -0.52, -0.03],
  ];
  const decisions = mergeSignalParts([
    ...decisionPoints.map((point, index) => sphere(index === 0 ? 0.21 : 0.16, point, 10, 7)),
    cylinderBetween(decisionPoints[0], decisionPoints[1], 0.05),
    cylinderBetween(decisionPoints[1], decisionPoints[2], 0.05),
    cylinderBetween(decisionPoints[1], decisionPoints[3], 0.05),
    cylinderBetween(decisionPoints[0], decisionPoints[4], 0.05),
    cylinderBetween(decisionPoints[4], decisionPoints[3], 0.05),
  ]);

  // 08 / Workflow — alternating stations with directional hand-offs, ending
  // in an arrow: the process moves left to right and completes.
  const relayPoints = [
    [-0.66, 0.3, 0],
    [-0.22, -0.22, 0.04],
    [0.22, 0.24, -0.03],
    [0.66, -0.26, 0.02],
  ];
  const relay = mergeSignalParts([
    ...relayPoints.map((point, index) =>
      index % 2 === 0
        ? box(point, [0.28, 0.28, 0.28], [0, 0, Math.PI / 4])
        : transformed(new THREE.CylinderGeometry(0.17, 0.17, 0.22, 8), {
            position: point,
            rotation: [Math.PI / 2, 0, 0],
          }),
    ),
    cylinderBetween(relayPoints[0], relayPoints[1], 0.05),
    cylinderBetween(relayPoints[1], relayPoints[2], 0.05),
    cylinderBetween(relayPoints[2], relayPoints[3], 0.05),
    transformed(new THREE.ConeGeometry(0.13, 0.3, 4), {
      position: [0.82, -0.4, 0.02],
      rotation: [0, 0, -0.75],
    }),
  ]);

  // 09 / SEO — a magnifying glass. Standalone /services/seo pillar only; not
  // part of the rail (not in SERVICES), so it is built here but never enters
  // the ordered array.
  const beacon = mergeSignalParts([
    torus(0.46, 0.08, [-0.2, 0.2, 0], [0, 0, 0], 8, 40),
    cylinderBetween([0.14, -0.14, 0], [0.72, -0.72, 0], 0.085),
    sphere(0.09, [0.72, -0.72, 0], 8, 6),
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

  const standaloneBySignal = { seo: beacon };

  const ordered = SERVICES.map(({ signal }) => {
    const geometry = geometryBySignal[signal];
    if (!geometry) throw new Error(`Missing service signal geometry: ${signal}`);
    return geometry;
  });

  return { ordered, standaloneBySignal };
}

let _built = null;
function built() {
  if (!_built) _built = buildSignalGeometries();
  return _built;
}

// Ordered array (matches SERVICES), used by the homepage rail. Standalone
// pages never appear here, so the rail stays at SERVICES.length.
export function createSignalGeometries() {
  return built().ordered;
}

// Map keyed by signal, used by the inner-page emblem (look up by signal, not index).
let _bySignal = null;
export function getSignalGeometry(signal) {
  if (!_bySignal) {
    const { ordered, standaloneBySignal } = built();
    _bySignal = { ...standaloneBySignal };
    SERVICES.forEach(({ signal: s }, i) => { _bySignal[s] = ordered[i]; });
  }
  const geometry = _bySignal[signal];
  if (!geometry) throw new Error(`Missing service signal geometry: ${signal}`);
  return geometry;
}

export { COUNT };
