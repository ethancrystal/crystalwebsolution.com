export const motionFlight = {
  progress: 0,
  active: false,
  enabled: false,
  ready: false,
};

const listeners = new Set();

function notifyListeners() {
  for (const listener of listeners) listener(motionFlight);
}

export function updateMotionFlight(patch, { notify = true } = {}) {
  let changed = false;
  for (const [key, value] of Object.entries(patch)) {
    if (motionFlight[key] === value) continue;
    motionFlight[key] = value;
    changed = true;
  }

  if (changed && notify) {
    notifyListeners();
  }
}

export function setMotionReady(ready) {
  if (motionFlight.ready === ready) return;
  motionFlight.ready = ready;
  notifyListeners();
}

export function subscribeMotionFlight(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetMotionFlight() {
  updateMotionFlight({
    progress: 0,
    active: false,
    enabled: false,
    ready: false,
  });
}
