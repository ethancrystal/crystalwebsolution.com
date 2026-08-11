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

const BASE_SCALE = 1.35;
const EMIS_UNLIT = 0.35;
const EMIS_HOVER = 1.4;
const COLOR_UNLIT = new THREE.Color(EMISSIVE_BASE);
const COLOR_ACTIVE = new THREE.Color(EMISSIVE_ACTIVE);

// Visitor-focused PAS one-liners, surfaced when the emblem is clicked.
const SIGNAL_BLURB = {
  web: 'Your site looks like everyone else and quietly loses the deal before a word is read — so we design with intent, clarity and craft that earns the click and the close.',
  development: 'That internal tool or product idea keeps stalling in hand-off limbo while technical debt piles up — we architect and ship web apps your team can own and extend.',
  brand: 'Your brand reads as a logo file somebody sent once, not a system buyers recognise — so we build a simple, ownable identity that compounds across every touchpoint.',
  logo: 'Your mark does not survive a favicon, a stamp, or a phone lock screen — so we design a logo that holds up at 16px and at billboard scale.',
  marketing: 'Your campaigns earn clicks that bounce because the page underneath breaks the promise — so we align the message and the experience so traffic converts.',
  motion: 'Your story sits still while competitors move, and attention moves on — so we add motion that guides the eye to the one thing that matters.',
  ai: 'AI is either a buzzword in your copy or a black box nobody trusts — so we wire practical, explainable automation into the work you already do.',
  workflow: 'Your team reinvents the hand-off on every project and momentum dies in the gaps — so we design the workflow once, clearly, and let it scale.',
};

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
      meshRef.current.rotation.y += delta * meta.rotSpeed;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.16;
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
