// Design-lab flight singleton — the lab beat's counterpart to
// lib/motionFlight.mjs. Deliberately its own tiny state object rather than a
// shared factory so the two flying beats can never entangle lifecycles:
// Lab.jsx writes, LabCarousel.jsx and CameraRig read.
export const labFlight = {
  progress: 0,
  active: false,
  enabled: false,
  prewarm: false,
  ready: false,
};

const listeners = new Set();

function notifyListeners() {
  for (const listener of listeners) listener(labFlight);
}

export function updateLabFlight(patch, { notify = true } = {}) {
  let changed = false;
  for (const [key, value] of Object.entries(patch)) {
    if (labFlight[key] === value) continue;
    labFlight[key] = value;
    changed = true;
  }

  if (changed && notify) {
    notifyListeners();
  }
}

export function setLabReady(ready) {
  if (labFlight.ready === ready) return;
  labFlight.ready = ready;
  notifyListeners();
}

export function subscribeLabFlight(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
