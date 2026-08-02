// Per-signal rail motion metadata for components/three/ServiceRail.jsx.
// Keyed by SERVICES[].signal (see lib/services.mjs) rather than array index,
// so a future reorder of the eight rows can't silently misassign rotation
// speed, depth offset, or the wireframe treatment to the wrong emblem — the
// exact bug this file replaces (wireframe stayed pinned to index 2 after the
// six-to-eight-row split moved Animation's torus-knot from index 2 to 5).
export const SERVICE_SIGNAL_META = {
  web: { rotSpeed: 0.19, zOffset: 0.35 },
  development: { rotSpeed: 0.26, zOffset: -0.44 },
  brand: { rotSpeed: 0.24, zOffset: 0.1 },
  logo: { rotSpeed: 0.32, zOffset: -0.28 },
  marketing: { rotSpeed: 0.3, zOffset: 0.54 },
  // The torus-knot has enough facets to catch light as wireframe; it's the
  // one emblem meant to read as an open lattice rather than a solid form.
  motion: { rotSpeed: 0.9, zOffset: -0.12, wireframe: true },
  ai: { rotSpeed: 0.36, zOffset: 0.4 },
  workflow: { rotSpeed: 0.22, zOffset: -0.36 },
};
