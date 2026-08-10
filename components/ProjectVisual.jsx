'use client';

// Code-generated project artwork — no image assets.
// A layered gradient composition derived from the project palette.
// `variant` picks an alternate orb/gradient layout so repeated tiles of the
// same palette (e.g. a case-study gallery grid) read as distinct compositions
// instead of identical copies; variant 0 is byte-identical to the original
// single-layout output so every existing call site is unaffected.
const VARIANTS = [
  { angle: 135, o1: '30% 35%', o2: '72% 70%' },
  { angle: 200, o1: '65% 25%', o2: '20% 75%' },
  { angle: 60, o1: '80% 60%', o2: '25% 20%' },
  { angle: 300, o1: '40% 80%', o2: '75% 30%' },
];

export default function ProjectVisual({ palette, title, ratio = '4 / 3', variant = 0, label }) {
  const [a, b] = palette;
  const { angle, o1, o2 } = VARIANTS[variant % VARIANTS.length];
  return (
    <div
      className="project-visual"
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={label || `${title} artwork`}
    >
      <div
        className="pv-layer pv-base"
        style={{ background: `linear-gradient(${angle}deg, ${a}22 0%, ${b}33 100%)` }}
      />
      <div
        className="pv-layer pv-orb"
        style={{ background: `radial-gradient(circle at ${o1}, ${a}88, transparent 55%)` }}
      />
      <div
        className="pv-layer pv-orb2"
        style={{ background: `radial-gradient(circle at ${o2}, ${b}66, transparent 50%)` }}
      />
      <div className="pv-grid" />
      <span className="pv-mark" style={{ color: a }}>◆</span>
    </div>
  );
}
