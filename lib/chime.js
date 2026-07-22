// Recognition "chime" singleton — hovering a proof-record row in the DOM briefly
// brightens the matching medal in RecognitionRing. Same timestamp-compare
// pattern as lib/pulse.js: DOM writes, 3D reads in useFrame, no subscriptions.
export const chime = { t: 0, index: -1 };

export function ring(index) {
  chime.t = typeof performance !== 'undefined' ? performance.now() : Date.now();
  chime.index = index;
}
