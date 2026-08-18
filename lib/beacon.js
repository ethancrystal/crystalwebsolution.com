// Services "beacon" singleton — the DOM half is components/sections/
// Services.jsx (row hover), the 3D half is components/three/ServiceRail.jsx
// (emblem springs). Unlike pulse's one-shot timestamp this holds
// level state: index is the row currently hovered, -1 for none, read
// directly every frame — a hover is sustained, not an impulse.
export const beacon = { index: -1 };

export function light(index) {
  beacon.index = index;
}

export function dim() {
  beacon.index = -1;
}

// Approach "beacon" — same mechanism, separate channel. The DOM half is
// components/sections/Approach.jsx (the accordion's expanded step), the 3D
// half is components/three/ApproachCompass.jsx (marker glow). It is a second
// field rather than a second module so both DOM->canvas hand-offs live in one
// place; it is NOT the same field as `beacon.index` because that one carries a
// Services row index (0-7) that ServiceRail reads every frame — one shared
// slot would make an expanded Approach step light a service emblem.
// -1 means "nothing expanded", in which case the compass falls back to its own
// scroll-derived step.
export const approachBeacon = { step: -1 };

export function lightApproach(step) {
  approachBeacon.step = step;
}

export function dimApproach() {
  approachBeacon.step = -1;
}
