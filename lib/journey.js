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

export const STOPS = [
  { pos: [0, 0.25, 7.5], look: [0.9, 0, CLUSTERS.crystal] },
  { pos: [1.2, -0.3, -10], look: [0.7, 0, CLUSTERS.about] },
  { pos: [1.6, 0.5, -26], look: [0.6, 0, CLUSTERS.services] },
  { pos: [1.3, 0.4, -42], look: [0.5, 0, CLUSTERS.approach] },
  { pos: [1, 0.35, -58], look: [0.3, 0, CLUSTERS.stories] },
  { pos: [0, 0.7, -74], look: [0, 0.2, CLUSTERS.mark] },
  { pos: [0.4, 0.15, -90], look: [0, 0, CLUSTERS.lab] },
  { pos: [-0.6, -0.15, -106], look: [0, 0, CLUSTERS.motion] },
  { pos: [0, 0, -122], look: [0, 0, CLUSTERS.contact] },
];

// Defaults are replaced with measured section fractions by measureBeats().
// Keeping these as mutable objects lets DOM measurement and the canvas
// share the same scroll baseline without React state.
export const LAB_WINDOW = { start: 6 / 8, end: 7 / 8 };
export const MOTION_WINDOW = { start: 7 / 8, end: 1 };

export const VOLUME = { near: 14, far: -146 };
