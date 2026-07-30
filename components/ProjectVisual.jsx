'use client';

// Code-generated project artwork — no image assets.
// A layered gradient composition derived from the project palette.
export default function ProjectVisual({ palette, title, ratio = '4 / 3' }) {
  const [a, b] = palette;
  return (
    <div
      className="project-visual"
      style={{ aspectRatio: ratio }}
      role="img"
      aria-label={`${title} artwork`}
    >
      <div
        className="pv-layer pv-base"
        style={{ background: `linear-gradient(135deg, ${a}22 0%, ${b}33 100%)` }}
      />
      <div
        className="pv-layer pv-orb"
        style={{ background: `radial-gradient(circle at 30% 35%, ${a}88, transparent 55%)` }}
      />
      <div
        className="pv-layer pv-orb2"
        style={{ background: `radial-gradient(circle at 72% 70%, ${b}66, transparent 50%)` }}
      />
      <div className="pv-grid" />
      <span className="pv-mark" style={{ color: a }}>◆</span>
    </div>
  );
}
