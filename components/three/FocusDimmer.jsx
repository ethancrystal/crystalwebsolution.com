'use client';

// FocusDimmer — consensus item: local contrast system (canvas half).
//
// Reads scrollState.focus every frame and damps the renderer's
// toneMappingExposure between BASE (scene fully forward, between beats)
// and QUIET (scene takes a half-step back while a [data-quiet] section
// owns the viewport). Mount once inside <Canvas> in Scene.jsx.
//
// Codebase rules honored:
//   - Per-frame state comes from the scrollState singleton, not React state.
//   - Zero allocation inside useFrame (numbers only).
//   - Frame-rate-independent damping: 1 - exp(-dt * k), delta clamped.
//   - Ratified floor: exposure never drops below 0.8 — bloom, refraction
//     and particle glow all stay alive. The scene is directed, never muted.
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { scrollState } from '../../lib/scrollState';

const EXPOSURE_BASE = 1.0;
const EXPOSURE_QUIET = 0.8; // hard floor — do not lower
const DAMP = 5; // response speed

export default function FocusDimmer() {
  const gl = useThree((s) => s.gl);
  const current = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const goal = scrollState.focus || 0;
    current.current += (goal - current.current) * (1 - Math.exp(-dt * DAMP));
    gl.toneMappingExposure =
      EXPOSURE_BASE + (EXPOSURE_QUIET - EXPOSURE_BASE) * current.current;
  });

  return null;
}
