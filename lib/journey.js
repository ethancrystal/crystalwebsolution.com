// The camera journey is declarative data.
// STOPS: one per DOM section (Hero, Services, Showcase, Mark, About, Facts, Contact).
// A stop's scroll progress is index / (STOPS.length - 1).
// CLUSTERS: named anchor depths so 3D objects are authored at the exact z
// the camera flies to. Edit STOPS and CLUSTERS together.

export const CLUSTERS = {
  crystal: 0,
  services: -18,
  showcase: -36,
  mark: -54,
  about: -70,
  facts: -84,
  contact: -100,
};

export const STOPS = [
  // Off-axis: Hero copy moves to a left column (see .hero-off-axis in
  // globals.css); the look target nudges right so the crystal frames
  // beside the text instead of dead behind it.
  { pos: [0, 0.25, 7.5], look: [0.9, 0, CLUSTERS.crystal] },
  // Off-axis: Services text runs left, so the look target nudges right,
  // framing the orbiting crystal beside the copy rather than behind it.
  { pos: [1.6, 0.5, -10], look: [0.6, 0, CLUSTERS.services] },
  { pos: [-1.4, 0.2, -28], look: [0.4, 0, CLUSTERS.showcase] },
  { pos: [0, 0.7, -46], look: [0, 0.2, CLUSTERS.mark] },
  // Off-axis: About's left column of text, object weighted right.
  { pos: [1.2, -0.3, -63], look: [0.7, 0, CLUSTERS.about] },
  // Off-axis: Facts grid reads center-left, nudge object right of the cards.
  { pos: [-1.0, 0.4, -77], look: [0.6, 0, CLUSTERS.facts] },
  { pos: [0, 0, -92], look: [0, 0, CLUSTERS.contact] },
];

// Progress window across which the brand mark assembles.
export const MARK_WINDOW = [0.42, 0.62];

// Depth span the particle field scatters across.
export const VOLUME = { near: 14, far: -112 };
