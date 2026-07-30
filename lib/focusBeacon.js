// Showcase focus singleton — the DOM half is components/sections/
// Showcase.jsx (card hover / keyboard focus), the 3D half is
// components/three/ShowcaseBoxes.jsx (slab spotlight). index is the card
// currently under the pointer or focused, -1 for none. Level state read
// every frame, same shape as lib/beacon.js.
export const focusBeacon = { index: -1 };

export function focusSlab(index) {
  focusBeacon.index = index;
}

export function blurSlab() {
  focusBeacon.index = -1;
}
