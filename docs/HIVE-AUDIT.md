# Creative-Hive Audit — Full Record & Implementation Tracker

A three-agent creative hive (shared responsibility, not adversarial) audited all 11
sections of the site, section by section, proposing the best possible animation /
SVG / graphics upgrades. A single Judge agent then verified every load-bearing claim
against the actual source code and issued one binding ruling. This document is the
complete record plus a checklist of what's implemented, so any item can be "turned on"
independently.

## The agents

| Agent | Specialty | Role |
|---|---|---|
| **NOVA** | Motion & choreography | Timing, easing, scroll choreography, gesture economy |
| **VECTOR** | SVG / 2D craft | CSS, typography, line-work, DOM-side rendering defects |
| **PRISM** | WebGL / shaders | r3f mascots, materials, GPU cost, camera/scene bugs |
| **JUDGE** | Arbiter | Read the debate record, re-verified claims against source, issued the binding ruling |

Evidence base: full-page Playwright captures of all 11 sections (headless Chromium,
SwiftShader) plus direct source reading. The Judge confirmed the two headline bugs
from source alone, so software-rendering artifacts don't undermine the diagnosis.

---

## Judge's verified diagnosis: the dead gradient headlines

The four biggest emotional payoff lines — hero "unforgettable.", Mark "assembled with
intent.", Motion "motion.", Contact "something rare." — rendered as near-invisible
dark smudges. Three theories were debated; the Judge found **two stacked bugs**:

- **Bug A (VECTOR — confirmed, all four lines):** `h1, h2 { text-shadow: var(--text-lift) }`
  (globals.css) is inherited; none of the `-accent` classes overrode it, so a
  44px-blur dark shadow painted per-glyph over the gradient-clipped text. This alone
  explains Motion's dead line, which never goes through any char-splitting.
- **Bug B (PRISM — confirmed, hero/Mark/Contact only):** those three lines render
  through `DecodeText`, whose SplitType call moves the text into `.char` children —
  the parent that owns `background-clip: text; color: transparent` has no glyphs
  left to clip, and the children inherit transparent color with no gradient of their
  own → fully blank.
- **NOVA's compositing/`will-change` theory: demoted.** Her key evidence (Motion dead
  without char-split) is fully explained by Bug A; no case in the codebase isolates
  her mechanism. Revisit only if smudging persists.

**Fix shipped:** accent classes set `text-shadow: none` + `filter: drop-shadow(...)`
for lift; DecodeText reads a `--accent-grad` custom property and repaints the gradient
per-char with computed per-char `background-position` (NOT `background-attachment:
fixed`, which is unreliable under Lenis's transformed scroll wrapper).

---

## Per-section verdicts (Judge-final) and implementation status

| # | Section | Verdict | Package | Status |
|---|---|---|---|---|
| 1 | Hero | UPGRADE | Systemic text package only (gradient A+B, words,chars split, reduced-motion) | ✅ Done |
| 2 | Services | UPGRADE | ServiceRail emblem rail (restored after revert #6) + RAIL_X 2.0→2.3 | ✅ Done |
| 3 | Approach | UPGRADE | "Process arc": dash-drawn luminous ellipse through the four compass markers, scrubbed by the markers' existing spring `ease` | ⬜ To do |
| 4 | Showcase | UPGRADE | Generative per-slug SVG line-work in ProjectVisual, hover-drawn via stroke-dashoffset — **intensity-capped** per the Judge (reads as texture, not a third competing gesture) | ⬜ To do |
| 5 | Stories | UPGRADE | Masked quote-swap + sliding tab ink-bar (DOM/GSAP) + three palette-tinted "client motes" at CLUSTERS.stories (currently empty 3D space), lit via a new hover singleton (chime.js idiom), spring 90/9 | ⬜ To do |
| 6 | Mark | OK | No dedicated package; receives the systemic gradient fix | ✅ Done (via systemic fix) |
| 7 | About | OK | Ink-in proposal rejected — no change | ✅ N/A |
| 8 | Facts | UPGRADE | Count-up stat numerals on first scroll-trigger, rendered through DecodeText's glyph-scramble cipher (house language) | ⬜ To do |
| 9 | Recognition | FIX | Year slot-reel leaked its duplicate at rest: wrap height 1.15em resolved against the row's font-size, not the year's 0.75rem → wrap now sets its own font-size | ✅ Done |
| 10 | Motion | UPGRADE | (a) per-char scroll-scrubbed shear wave; (b) aria-hidden ghost-stroke outline duplicate sheared opposite; (c) velocity-driven torus-knot mascot at CLUSTERS.motion; (d) **camera fix first**: STOPS[9] z=-104 sits 1 unit from CLUSTERS.recognition=-105, so medal toruses swim across the pinned headline | ⬜ To do |
| 11 | Contact | UPGRADE | "Closing roar": mailto CTA onPointerEnter fires lib/pulse.js blast() on the Contact crystal + a Sparks instance in the contact group — mirrors the hero's click-blast at the closing gesture, zero new systems | ⬜ To do |

### Systemic fixes (cross-section)

| Fix | Status |
|---|---|
| Gradient accent lines (Bug A + Bug B, all four lines) | ✅ Done |
| `SplitType types: 'words,chars'` — kills mid-word wraps ("unforgettab / le.", "No sh / ortcuts.") | ✅ Done |
| `prefers-reduced-motion` in DecodeText + Reveal (RevealPop already compliant) | ✅ Done |
| Beat-proximity render culling (PRISM's refined version only: materials stay mounted, re-enable ~2.5 beats out while still fogged, cull at ~3, never cull Particles/BackdropMorph) | ⬜ To do — **last**, highest risk |

---

## Contested items — hive votes and Judge rulings

1. **Services RAIL_X → 2.3** — hive 3-0 ADOPT → **ratified**. One-constant change. ✅ Done
2. **Approach process arc** — 3-0 ADOPT → **ratified**. Additive, reuses existing spring ease.
3. **Showcase SVG line-work** — 2-1 ADOPT (NOVA dissented: third simultaneous hover effect
   dilutes the gesture) → **ratified with binding modification**: cap stroke opacity/width
   so it reads as texture. Fixes a real defect (identical composition on all 4 cards)
   while honoring the dissent.
4. **About scroll-scrubbed word ink-in** — 3-0 REJECT → **ratified**. 0.25-opacity unread
   text is an accessibility regression; also fights FocusDimmer's contrast system.
5. **Contact closing roar** — 3-0 ADOPT → **ratified**. 100% existing systems.
6. **Beat-proximity culling** — 3-0 ADOPT → **intent ratified, naive implementation
   overruled**. `group.visible = false` alone risks a stale/black transmission-FBO first
   frame on re-entry; ship only the hysteresis version. Judge independently verified the
   1-unit STOPS[9]/recognition gap proving this depth chain is too tight for visible pops.

## Judge's implementation priority order

1. ✅ Systemic gradient fix (Bug A + B) — legibility bug on the four biggest payoff lines
2. ✅ words,chars split + reduced-motion in DecodeText/Reveal — same file, same window of work
3. ✅ Recognition year-flip font-size fix — one line, isolated
4. ⬜ Motion camera fix (STOPS[9] vs recognition cluster) — must land before the Motion package
5. ✅ Services RAIL_X nudge
6. ⬜ Contact closing roar
7. ⬜ Approach process arc
8. ⬜ Stories package
9. ⬜ Facts count-up (sequenced after 1-2 so it builds on the fixed DecodeText)
10. ⬜ Motion 3-part package (after 4, tuned against the corrected camera frame)
11. ⬜ Showcase SVG line-work (cosmetic, anytime)
12. ⬜ Beat-proximity culling — LAST: cross-cutting, and cull distances key off the final
    positions of the new Stories/Motion/Contact 3D additions above

## Rejected, for the record

- **About word ink-in** — accessibility regression, unanimous, upheld.
- **NOVA's will-change/compositing theory** as the gradient cause — unproven as distinct;
  revisit only if smudging persists after the shipped fix.
- **Naive `group.visible` culling** — superseded by the hysteresis variant.
- **Full-strength Showcase SVG** — shipping the intensity-capped variant instead.

---

## Where the implemented work lives

- Branch: `claude/designer-agents-app-debate-octs8v` (restarted from main after PR #5
  was merged and then reverted by PR #6) — PR #7.
- `components/three/ServiceRail.jsx` + `lib/beacon.js` / `lib/focusBeacon.js` /
  `lib/motionScale.js` — restored ServiceRail system (emblem rail, Showcase spotlight,
  FOV surge, canvas-side reduced-motion gate).
- `app/globals.css` — accent-class text-shadow/gradient fixes, `--accent-grad` custom
  properties, recognition-year-wrap font-size.
- `components/DecodeText.jsx` — words,chars split, per-char gradient repaint,
  reduced-motion bypass.
- `components/Reveal.jsx` — reduced-motion bypass.
