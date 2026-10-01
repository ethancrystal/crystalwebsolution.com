import { render, cleanup } from '@testing-library/react';
import * as THREE from 'three';
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { scrollState } from '@/lib/scrollState';
import { pointerState } from '@/lib/pointerState';
import { motionScale } from '@/lib/motionScale';
import { STOPS } from '@/lib/journey';

// CameraRig renders nothing, so it mounts fine in jsdom once useFrame is
// captured: the tests then drive the frame callback by hand.
const frame = vi.hoisted(() => ({ cb: null }));
vi.mock('@react-three/fiber', () => ({
  useFrame: (cb) => {
    frame.cb = cb;
  },
}));

import CameraRig from '@/components/three/CameraRig';

const DT = 1 / 60;

function makeState() {
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 260);
  camera.position.set(0, 0.25, 7.5);
  const looks = [];
  const lookAt = camera.lookAt.bind(camera);
  camera.lookAt = (target) => {
    looks.push(target.clone()); // curLook is reused, so snapshot it.
    lookAt(target);
  };
  return { camera, looks };
}

function run(state, frames) {
  for (let i = 0; i < frames; i += 1) frame.cb(state, DT);
}

function pointerEvent(type, pointerType) {
  const event = new Event(type);
  Object.defineProperty(event, 'pointerType', { value: pointerType });
  return event;
}

beforeEach(() => {
  scrollState.progress = 0;
  scrollState.velocity = 0;
  pointerState.x = 0;
  pointerState.y = 0;
  motionScale.value = 1;
});

afterEach(() => {
  cleanup();
  scrollState.progress = 0;
  pointerState.x = 0;
  pointerState.y = 0;
  motionScale.value = 1;
  frame.cb = null;
});

describe('CameraRig look target across visits (R12)', () => {
  it('starts from the origin on every mount, not from the last visit', () => {
    const k = 1 - Math.exp(-DT * 4.2);
    const goal = STOPS[0].look;

    // First visit: scroll deep into the journey so the look target travels far.
    scrollState.progress = 0.5;
    const first = render(<CameraRig />);
    run(makeState(), 240);
    first.unmount();

    // Return to '/': hero stop, fresh Canvas camera.
    scrollState.progress = 0;
    render(<CameraRig />);
    const state = makeState();
    run(state, 1);

    const look = state.looks[0];
    // One damping step from (0, 0, 0) toward the hero look target.
    expect(look.x).toBeCloseTo(goal[0] * k, 6);
    expect(look.y).toBeCloseTo(goal[1] * k, 6);
    expect(look.z).toBeCloseTo(goal[2] * k, 6);
  });
});

describe('CameraRig touch parallax (R19)', () => {
  it('follows the pointer while it moves', () => {
    render(<CameraRig />);
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: window.innerWidth, clientY: 0 }));
    expect(pointerState.x).toBeCloseTo(1);
    expect(pointerState.y).toBeCloseTo(-1);
  });

  it.each(['pointerup', 'pointercancel'])('centres the offset on touch %s', (type) => {
    render(<CameraRig />);
    pointerState.x = 0.8;
    pointerState.y = -0.4;
    window.dispatchEvent(pointerEvent(type, 'touch'));
    expect(pointerState.x).toBe(0);
    expect(pointerState.y).toBe(0);
  });

  it('centres the offset on pen release too', () => {
    render(<CameraRig />);
    pointerState.x = 0.8;
    window.dispatchEvent(pointerEvent('pointerup', 'pen'));
    expect(pointerState.x).toBe(0);
  });

  it('keeps a mouse cursor offset on mouse button release', () => {
    render(<CameraRig />);
    pointerState.x = 0.8;
    pointerState.y = -0.4;
    window.dispatchEvent(pointerEvent('pointerup', 'mouse'));
    window.dispatchEvent(pointerEvent('pointercancel', 'mouse'));
    expect(pointerState.x).toBe(0.8);
    expect(pointerState.y).toBe(-0.4);
  });

  it('removes its listeners on unmount', () => {
    const { unmount } = render(<CameraRig />);
    unmount();
    pointerState.x = 0.5;
    window.dispatchEvent(pointerEvent('pointerup', 'touch'));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 0, clientY: 0 }));
    expect(pointerState.x).toBe(0.5);
  });
});

describe('CameraRig reduced-motion parallax (R7)', () => {
  function settledCameraX(scale) {
    motionScale.value = scale;
    const { unmount } = render(<CameraRig />);
    pointerState.x = 1;
    pointerState.y = 0;
    const state = makeState();
    run(state, 400);
    unmount();
    return state.camera.position.x;
  }

  it('offsets the camera toward the pointer at full motion', () => {
    // POS[0].x is 0 and the rig adds pointer.x * 0.55.
    expect(settledCameraX(1)).toBeCloseTo(STOPS[0].pos[0] + 0.55, 2);
  });

  it('holds the camera at its centred position under reduced motion', () => {
    expect(settledCameraX(0)).toBeCloseTo(STOPS[0].pos[0], 2);
  });
});
