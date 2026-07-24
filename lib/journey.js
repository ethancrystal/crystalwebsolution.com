// Camera stops and WebGL cluster depths follow the DOM section order.
export const CLUSTERS = {
  crystal: 0,
  about: -18,
  facts: -34,
  showcase: -50,
  services: -66,
  approach: -82,
  stories: -98,
  mark: -114,
  recognition: -130,
  motion: -146,
  contact: -162,
};

export const STOPS = [
  { pos: [0, 0.25, 7.5], look: [0.9, 0, CLUSTERS.crystal] },
  { pos: [1.2, -0.3, -10], look: [0.7, 0, CLUSTERS.about] },
  { pos: [-1, 0.4, -26], look: [0.6, 0, CLUSTERS.facts] },
  { pos: [-1.4, 0.2, -42], look: [0.4, 0, CLUSTERS.showcase] },
  { pos: [1.6, 0.5, -58], look: [0.6, 0, CLUSTERS.services] },
  { pos: [1.3, 0.4, -74], look: [0.5, 0, CLUSTERS.approach] },
  { pos: [1, 0.35, -90], look: [0.3, 0, CLUSTERS.stories] },
  { pos: [0, 0.7, -106], look: [0, 0.2, CLUSTERS.mark] },
  { pos: [1, 0.3, -122], look: [0.5, 0, CLUSTERS.recognition] },
  { pos: [-0.6, -0.15, -138], look: [0, 0, CLUSTERS.motion] },
  { pos: [0, 0, -154], look: [0, 0, CLUSTERS.contact] },
];

export const VOLUME = { near: 14, far: -178 };
