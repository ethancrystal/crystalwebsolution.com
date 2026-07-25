# Stories attention synthesis

## Three positions

1. **Editorial evidence stripe**
   - Do: add a visible reviewer block under the quote and tighten typography.
   - Pro: keeps homepage minimal; adds real social proof without breaking layout.
   - Con: only 1–2 design features; may still feel sparse.

2. **Active tab system + immersive quote pane**
   - Do: make the quote occupy a wider reading lane, add tab indicators, glow rule, and a compact reviewer summary.
   - Pro: strongest attention with minimal assets; preserves dark cinematic feel.
   - Con: slightly larger DOM/CSS footprint but well inside current style system.

3. **Full-width card carousel**
   - Do: replace single quote with vertical cards or horizontal slider.
   - Pro: maximizes attention.
   - Con: risky in a quiet section on a WebGL page; high chance of visual noise and motion conflicts.

## Selected: option 2

Rationale:
- keeps the Stories section quiet and readable;
- improves attention through hierarchy, readability, and active-state feedback;
- no image/video assets required;
- limited scope reduces build breakage risk.

## Implementation plan

Files to change:
- components/sections/Stories.jsx
- app/globals.css

Behavior:
- quote pane widens for readability;
- reviewer identity + meta recap is shown beneath each quote;
- tab row gets stronger active indicator and hover treatment;
- small text size/spacing harmony improved.
