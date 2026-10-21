// Camera stops and WebGL cluster depths follow the DOM section order.
export const CLUSTERS = {
  crystal: 0,
  about: -18,
  services: -34,
  approach: -50,
  stories: -66,
  mark: -82,
  lab: -98,
  motion: -114,
  contact: -130,
};

// One stop per beat in lib/beatProgress.js BEAT_IDS. The production story
// (the hero beat) sits on an opaque ground, so the long hero -> lab segment
// flies past the old about..mark clusters unseen; their lights stay put.
export const STOPS = [
  { pos: [0, 0.25, 7.5], look: [0.9, 0, CLUSTERS.crystal] },
  { pos: [0.4, 0.15, -90], look: [0, 0, CLUSTERS.lab] },
  { pos: [-0.6, -0.15, -106], look: [0, 0, CLUSTERS.motion] },
  { pos: [0, 0, -122], look: [0, 0, CLUSTERS.contact] },
];

// Defaults are replaced with measured section fractions by measureBeats().
// Keeping these as mutable objects lets DOM measurement and the canvas
// share the same scroll baseline without React state.
export const LAB_WINDOW = { start: 1 / 3, end: 2 / 3 };
export const MOTION_WINDOW = { start: 2 / 3, end: 1 };

export const VOLUME = { near: 14, far: -146 };
