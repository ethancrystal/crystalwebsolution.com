// Services "beacon" singleton — the DOM half is components/sections/
// Services.jsx (row hover), the 3D half is components/three/ServiceRail.jsx
// (emblem springs). Unlike pulse/chime's one-shot timestamps this holds
// level state: index is the row currently hovered, -1 for none, read
// directly every frame — a hover is sustained, not an impulse.
export const beacon = { index: -1 };

export function light(index) {
  beacon.index = index;
}

export function dim() {
  beacon.index = -1;
}
