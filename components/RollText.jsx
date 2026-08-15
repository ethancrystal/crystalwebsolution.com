'use client';

// Vertical label swap on hover: the visible face rises out of the mask while an
// identical copy rises in behind it. Purely CSS-driven (see .roll in
// globals.css) so it costs no JS on the pointer path and inherits whatever
// type styles the parent link/button already sets.
//
// The clone is aria-hidden, so the accessible name stays single — a screen
// reader announces "Start a project", not "Start a projectStart a project".
export default function RollText({ children, className = '' }) {
  return (
    <span className={`roll ${className}`.trim()}>
      <span className="roll-face">{children}</span>
      <span className="roll-face roll-face-clone" aria-hidden="true">{children}</span>
    </span>
  );
}
