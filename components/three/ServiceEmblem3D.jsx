'use client';

// ServiceEmblem3D — a single, self-contained react-three-fiber emblem for one
// service signal. Used on inner marketing pages (the /services/[slug] hero) to
// carry the SAME 3D "signal instrument" the homepage 3D rail (ServiceRail.jsx)
// shows — proving the inner page is the homepage card resolved.
//
// Why it is isolated (not the homepage Scene): the homepage mounts ONE big
// <Canvas> behind the whole page. Inner pages must not import that runtime
// (regression boundary: keep inner pages free of the homepage WebGL mount).
// So this is a tiny independent canvas — exactly one mesh, one material.
//
// Geometry comes from lib/serviceSignalGeometry.mjs (single source of truth
// shared with the homepage rail). Motion comes from SERVICE_SIGNAL_META
// (same rotSpeed/wireframe per signal the rail uses). Hover-light is LOCAL to
// this canvas; it does not touch the homepage beacon singleton, because the
// inner page has no rail to coordinate with.
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getSignalGeometry, EMISSIVE_BASE, EMISSIVE_ACTIVE } from '../../lib/serviceSignalGeometry.mjs';
import { SERVICE_SIGNAL_META } from '../../lib/serviceSignals.mjs';
import { SIGNAL_BLURB } from '../../lib/serviceSignalBlurbs.mjs';

const BASE_SCALE = 1.5;
// How far the emblem is allowed to turn off face-on, in radians. ~23 degrees
// of yaw keeps every form readable while still reading as a real 3D object
// (you can see the depth on its edges); ~7 degrees of pitch adds life.
const YAW_RANGE = 0.4;
const PITCH_RANGE = 0.12;
const EMIS_UNLIT = 0.35;
const EMIS_HOVER = 1.4;
const COLOR_UNLIT = new THREE.Color(EMISSIVE_BASE);
const COLOR_ACTIVE = new THREE.Color(EMISSIVE_ACTIVE);


function EmblemMesh({ signal, onHover }) {
  const meshRef = useRef();
  const matRef = useRef();
  const [hovered, setHovered] = useState(false);
  const glow = useRef(EMIS_UNLIT);

  const meta = SERVICE_SIGNAL_META[signal] || { rotSpeed: 0.3, wireframe: false };
  const geometry = getSignalGeometry(signal);
  const reduceRef = useRef(false);

  // Read prefers-reduced-motion once and keep it current via a listener,
  // rather than calling matchMedia() on every useFrame tick (allocation on
  // the per-frame path, forbidden by this repo's animation conventions).
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduceRef.current = mql.matches;
    const onChange = (e) => { reduceRef.current = e.matches; };
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  useFrame((state, delta) => {
    const reduce = reduceRef.current;
    if (meshRef.current && !reduce) {
      // Bounded presentation sway, NOT a full spin.
      //
      // These signal forms are built to be read face-on: 01/Web is a viewport
      // with a cursor, 02/Development a layered stack, 08/Workflow a left-to-
      // right relay. Rotating a flat pictogram a full 360 degrees means the
      // visitor spends half of every cycle looking at it edge-on, where it
      // collapses into an unreadable blue sliver — the emblem stops saying
      // anything about the service. So the yaw oscillates inside a shallow
      // arc (rotSpeed still sets each signal's tempo, so the rail's per-signal
      // character is preserved) and the form always faces the reader.
      const t = state.clock.elapsedTime;
      meshRef.current.rotation.y = Math.sin(t * meta.rotSpeed * 0.9) * YAW_RANGE;
      meshRef.current.rotation.x = Math.sin(t * 0.34) * PITCH_RANGE;
    }
    if (reduce) return;
    // Smooth hover glow (no spring lib needed for a single emblem).
    const target = hovered ? EMIS_HOVER : EMIS_UNLIT;
    glow.current += (target - glow.current) * Math.min(1, delta * 8);
    if (matRef.current) {
      matRef.current.emissiveIntensity = glow.current;
      const heat = THREE.MathUtils.clamp((glow.current - EMIS_UNLIT) / (EMIS_HOVER - EMIS_UNLIT), 0, 1);
      matRef.current.emissive.lerpColors(COLOR_UNLIT, COLOR_ACTIVE, heat);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      scale={BASE_SCALE}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); onHover?.(true); }}
      onPointerOut={() => { setHovered(false); onHover?.(false); }}
    >
      <meshStandardMaterial
        ref={matRef}
        color={EMISSIVE_BASE}
        emissive={EMISSIVE_BASE}
        emissiveIntensity={EMIS_UNLIT}
        metalness={0.35}
        roughness={0.3}
        wireframe={meta.wireframe === true}
      />
    </mesh>
  );
}

export default function ServiceEmblem3D({ signal, className = '' }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const blurb = SIGNAL_BLURB[signal] || '';

  return (
    <div className={`mkt-emblem3d ${className}`}>
      {/* The WebGL canvas is decorative; the interactive summary is the button below. */}
      <Canvas
        aria-hidden="true"
        dpr={[1, 2]}
        camera={{ fov: 45, position: [0, 0, 4] }}
        gl={{ antialias: true, alpha: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[3, 3, 4]} intensity={1.1} color="#bfe9ff" />
        <pointLight position={[-3, -2, 2]} intensity={0.5} color="#3c6cff" />
        <EmblemMesh
          signal={signal}
          onHover={setShowTooltip}
        />
      </Canvas>
      {blurb && (
        <button
          type="button"
          className="mkt-em-tooltip-toggle"
          aria-label={showTooltip ? 'Hide service summary' : 'Show service summary'}
          aria-expanded={showTooltip}
          onClick={() => setShowTooltip((v) => !v)}
        >
          {showTooltip ? '−' : '?'}
        </button>
      )}
      {showTooltip && blurb && (
        <div className="mkt-em-tooltip" role="tooltip">
          <p className="mkt-em-tooltip__text">{blurb}</p>
        </div>
      )}
    </div>
  );
}
