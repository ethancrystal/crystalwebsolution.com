'use client';

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { scrollState } from '../../lib/scrollState';
import { STOPS } from '../../lib/journey';
import { beatProgress, BEAT_IDS } from '../../lib/beatProgress';
import { motionScale } from '../../lib/motionScale';
import { motionFlight } from '../../lib/motionFlight.mjs';
import { pointerState } from '../../lib/pointerState';

// Pre-built vectors — never allocate inside useFrame.
const POS = STOPS.map((s) => new THREE.Vector3(...s.pos));
const LOOK = STOPS.map((s) => new THREE.Vector3(...s.look));
const tmpPos = new THREE.Vector3();
const tmpLook = new THREE.Vector3();
const curLook = new THREE.Vector3(0, 0, 0);

function smootherstep(t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

const FOV_BASE = 42;
const FOV_SURGE_MAX = 4.5;
const MOTION_INDEX = BEAT_IDS.indexOf('motion');

export default function CameraRig() {
  const fov = useRef(FOV_BASE);

  useEffect(() => {
    const onMove = (e) => {
      pointerState.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerState.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      pointerState.x = 0;
      pointerState.y = 0;
    };
  }, []);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const p = THREE.MathUtils.clamp(scrollState.progress, 0, 1);
    const segCount = STOPS.length - 1;
    const motionLocked = motionFlight.enabled && motionFlight.active;

    // Segment boundaries come from measured DOM section positions
    // (beatProgress), not a uniform index/(N-1) share of the page — beats
    // vary in scroll length (Showcase's project grid dwarfs Hero/Services).
    if (motionLocked) {
      // The Motion section owns 400% of pinned scroll. Hold its declarative
      // camera stop for the whole pin instead of drifting toward Contact.
      tmpPos.copy(POS[MOTION_INDEX]);
      tmpLook.copy(LOOK[MOTION_INDEX]);
    } else {
      let seg = 0;
      for (let i = 0; i < segCount; i++) {
        if (p >= beatProgress[BEAT_IDS[i]]) seg = i;
      }
      const segStart = beatProgress[BEAT_IDS[seg]];
      const segEnd = beatProgress[BEAT_IDS[seg + 1]];
      const span = Math.max(segEnd - segStart, 0.0001);
      const local = smootherstep(THREE.MathUtils.clamp((p - segStart) / span, 0, 1));

      tmpPos.copy(POS[seg]).lerp(POS[seg + 1], local);
      tmpLook.copy(LOOK[seg]).lerp(LOOK[seg + 1], local);
    }

    // The supplied Motion reference uses a locked camera; its depth comes
    // entirely from the cards' elliptical path. Other beats keep the site's
    // established pointer parallax.
    if (!motionLocked) {
      tmpPos.x += pointerState.x * 0.55;
      tmpPos.y += -pointerState.y * 0.35;
    }

    // Frame-rate-independent damping toward the goal.
    const k = 1 - Math.exp(-dt * 4.2);
    state.camera.position.lerp(tmpPos, k);
    curLook.lerp(tmpLook, k);
    state.camera.lookAt(curLook);

    // Velocity-based roll gives the flight some banking. (× motionScale:
    // the canvas-side reduced-motion gate zeroes velocity theatrics.)
    const roll = motionLocked
      ? 0
      : THREE.MathUtils.clamp(scrollState.velocity * 0.00035, -0.06, 0.06) *
        motionScale.value;
    state.camera.rotation.z += (roll - state.camera.rotation.z) * k;

    // FOV surge — fast scroll widens the lens a touch (42 → ~46.5) so
    // velocity reads as speed, not just displacement. Damped like all else;
    // the projection matrix is only rebuilt when the change is visible.
    const surge = motionLocked
      ? 0
      : Math.min(Math.abs(scrollState.velocity) * 0.004, 1) *
        FOV_SURGE_MAX *
        motionScale.value;
    fov.current += (FOV_BASE + surge - fov.current) * (1 - Math.exp(-dt * 3));
    if (Math.abs(state.camera.fov - fov.current) > 0.01) {
      state.camera.fov = fov.current;
      state.camera.updateProjectionMatrix();
    }
  });

  return null;
}
