// The recording's cards are editorial landscape canvases. The source orbit
// carries more studies than it ultimately selects, but the governing CWS spec
// calls for exactly six, so the same six travel through orbit and final grid.
export const CARD_WIDTH = 1.44;
export const CARD_HEIGHT = 1;

// Normalized against the complete pinned Motion beat in the supplied video.
export const FLIGHT_PHASES = {
  hold: 0.14,
  ribbonIn: 0.21,
  ribbonOut: 0.5,
  recede: 0.57,
  // Kept as a semantic alias for the start of the selected-card assembly.
  detach: 0.57,
  grid: 0.78,
};

const CARD_COUNT = 6;
const TAU = Math.PI * 2;
const ORBIT_TURNS = 0.94;
const REAR_ARC = 2.44;
const FLYBY_SPLIT = 0.38;
const RETURN_YAW = 0.52;
const MIN_FLIGHT_SCALE = 0.24;
const MAX_FLYBY_SCALE = 1.3;
const REVEAL_STAGGER = 0.012;
const REVEAL_DURATION = 0.085;
const SETTLE_STAGGER = 0.018;
const SETTLE_DURATION = 0.12;

const clamp01 = (value) => Math.min(1, Math.max(0, value));

export function power4Out(value) {
  const t = clamp01(value);
  return 1 - (1 - t) ** 4;
}

function smootherstep(value) {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function createTransform() {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
  };
}

function copyTransformInto(out, transform) {
  out.position[0] = transform.position[0];
  out.position[1] = transform.position[1];
  out.position[2] = transform.position[2];
  out.rotation[0] = transform.rotation[0];
  out.rotation[1] = transform.rotation[1];
  out.rotation[2] = transform.rotation[2];
  out.scale = transform.scale;
  return out;
}

function interpolateInto(out, from, to, progress) {
  const t = clamp01(progress);
  out.position[0] = from.position[0] + (to.position[0] - from.position[0]) * t;
  out.position[1] = from.position[1] + (to.position[1] - from.position[1]) * t;
  out.position[2] = from.position[2] + (to.position[2] - from.position[2]) * t;
  out.rotation[0] = from.rotation[0] + (to.rotation[0] - from.rotation[0]) * t;
  out.rotation[1] = from.rotation[1] + (to.rotation[1] - from.rotation[1]) * t;
  out.rotation[2] = from.rotation[2] + (to.rotation[2] - from.rotation[2]) * t;
  out.scale = from.scale + (to.scale - from.scale) * t;
  return out;
}

// Mutates `out` when supplied, so the R3F useFrame path can sample the orbit
// without allocating. With no `out`, it remains convenient for pure tests.
export function sampleOrbitTransform(card, orbitProgress, out = createTransform()) {
  const progress = clamp01(orbitProgress);
  const angle = card.orbit.offset + progress * ORBIT_TURNS * TAU;
  const depth = Math.cos(angle);
  const near = (1 - depth) * 0.5;

  // Increasing angle produces the recording's direction: the small/far back
  // leg moves left-to-right, then the large/near front leg returns right-to-left.
  out.position[0] = Math.sin(angle) * 4.7 * card.orbit.spatialFit;
  out.position[1] = (0.05 + Math.sin(angle - 0.32) * 0.58) * card.orbit.spatialFit;
  out.position[2] = -depth * 3.05 - 0.72;
  out.rotation[0] = -0.035 * depth;
  out.rotation[1] = -Math.sin(angle) * 0.98;
  out.rotation[2] = -Math.sin(angle - 0.18) * 0.12;
  out.scale = (0.42 + near * 0.82) * card.orbit.scaleFit;
  return out;
}

function createRecede(card, ribbonEnd) {
  const flightDirection = card.id % 2 === 0 ? 1 : -1;
  const exitSide = -flightDirection;
  const verticalBand = (card.id % 3) - 1;

  return {
    position: [
      exitSide * (8.3 + (card.id % 3) * 0.25) * card.orbit.spatialFit,
      verticalBand * 3.4 * card.orbit.spatialFit,
      0.6 + (card.id % 2) * 0.25,
    ],
    rotation: [
      ribbonEnd.rotation[0] + verticalBand * 0.34,
      -flightDirection * RETURN_YAW,
      -flightDirection * (0.92 + (card.id % 3) * 0.13),
    ],
    // Clear the frame by position instead of collapsing the card. Keeping a
    // stable scale makes the off-screen departure and return one continuous
    // flight rather than a vanish followed by a new object appearing.
    scale: MIN_FLIGHT_SCALE * card.orbit.scaleFit,
  };
}

function createFlyby(card, recede, seed) {
  const random = createRandom(seed + card.id * 0x9e3779b1);
  const endAngle = card.orbit.offset + ORBIT_TURNS * TAU;
  const tangentX = Math.cos(endAngle);
  // Alternate the return edge so the six selected studies re-form from a
  // spatially balanced burst instead of bunching on one side of the camera.
  const directionX = card.id % 2 === 0 ? 1 : -1;
  const distance = 3.7 + Math.abs(tangentX) * 3.1 + random() * 0.75;
  const vertical = Math.sin(endAngle) * 1.35 + (random() - 0.5) * 1.25;
  const foreground = 2.15 + random() * 2.2;
  const emphasis = card.id === 0
    ? MAX_FLYBY_SCALE
    : 0.96 + random() * (MAX_FLYBY_SCALE - 0.96);

  return {
    position: [
      recede.position[0] + directionX * distance * card.orbit.spatialFit,
      recede.position[1] + vertical * card.orbit.spatialFit,
      foreground,
    ],
    rotation: [
      (random() - 0.5) * 0.42,
      -directionX * (0.46 + random() * 0.1),
      -directionX * (0.18 + random() * 0.2),
    ],
    scale: emphasis * card.orbit.scaleFit,
  };
}

export function createFlyingCarouselLayout({
  viewportWidth = 10,
  seed = 0xc5a11,
} = {}) {
  const fit = Math.min(1, Math.max(0.72, viewportWidth / 10));
  const spatialFit = 0.72 + fit * 0.28;
  const xGap = (CARD_WIDTH + 0.12) * fit;
  const yGap = (CARD_HEIGHT + 0.12) * fit;

  return Array.from({ length: CARD_COUNT }, (_, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const orbit = {
      // All six first populate the shallow/far ribbon seen in the recording,
      // then each follows nearly one complete lap of the same closed path.
      offset: -REAR_ARC * 0.5 + index * (REAR_ARC / (CARD_COUNT - 1)),
      spatialFit,
      scaleFit: fit,
    };
    const card = {
      id: index,
      revealDelay: index * REVEAL_STAGGER,
      settleDelay: index * SETTLE_STAGGER,
      orbit,
    };
    const ribbonStart = sampleOrbitTransform(card, 0);
    const ribbonEnd = sampleOrbitTransform(card, 1);
    const hold = {
      position: [...ribbonStart.position],
      rotation: [...ribbonStart.rotation],
      scale: 0.001,
    };
    const recede = createRecede(card, ribbonEnd);
    const flyby = createFlyby(card, recede, seed ^ 0x5f3759df);

    return {
      ...card,
      hold,
      ribbonStart,
      ribbonEnd,
      // Compatibility aliases retained for the additive scaffold's consumers.
      ribbon: ribbonStart,
      recede,
      flyby,
      detach: flyby,
      scatter: flyby,
      target: {
        position: [(column - 1) * xGap, (0.5 - row) * yGap, 0],
        rotation: [0, 0, 0],
        scale: fit,
      },
    };
  });
}

// Full recording-derived choreography. Pass a stable `out` object from
// useFrame to keep this sampler allocation-free in the render loop.
export function sampleFlyingCard(card, progress, out = createTransform()) {
  const value = clamp01(progress);
  const revealProgress = power4Out(
    (value - FLIGHT_PHASES.hold - card.revealDelay) / REVEAL_DURATION,
  );

  if (value <= FLIGHT_PHASES.hold) {
    return copyTransformInto(out, card.hold);
  }

  if (value < FLIGHT_PHASES.ribbonIn) {
    sampleOrbitTransform(card, 0, out);
    out.scale *= revealProgress;
    return out;
  }

  if (value <= FLIGHT_PHASES.ribbonOut) {
    const local =
      (value - FLIGHT_PHASES.ribbonIn) /
      (FLIGHT_PHASES.ribbonOut - FLIGHT_PHASES.ribbonIn);
    sampleOrbitTransform(card, local, out);
    out.scale *= revealProgress;
    return out;
  }

  if (value < FLIGHT_PHASES.recede) {
    const local = smootherstep(
      (value - FLIGHT_PHASES.ribbonOut) /
      (FLIGHT_PHASES.recede - FLIGHT_PHASES.ribbonOut),
    );
    return interpolateInto(out, card.ribbonEnd, card.recede, local);
  }

  if (value < FLIGHT_PHASES.grid) {
    const local = clamp01(
      (value - FLIGHT_PHASES.recede - card.settleDelay) / SETTLE_DURATION,
    );

    if (local < FLYBY_SPLIT) {
      return interpolateInto(
        out,
        card.recede,
        card.flyby,
        smootherstep(local / FLYBY_SPLIT),
      );
    }

    return interpolateInto(
      out,
      card.flyby,
      card.target,
      power4Out((local - FLYBY_SPLIT) / (1 - FLYBY_SPLIT)),
    );
  }

  return copyTransformInto(out, card.target);
}
