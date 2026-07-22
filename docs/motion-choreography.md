# Crystal Web Solution — Scroll-Driven Motion Choreography

A complete choreography system for the page: hero intro, section transitions, cinematic beats, and a unified motion language grounded in the existing stack (CSS, GSAP ScrollTrigger, Lenis, R3F).

---

## 1. Global motion language

### 1.1 Timing tokens (extend `lib/easing.js`)

Add two domain-specific tokens:

| token | value | use |
|---|---|---|
| `EASE_PULL` | `"power2.in"` | things that compress before releasing |
| `EASE_FLOAT` | `"sine.inOut"` | camera/subtle phenom that needs soft passage |

Keep the existing four tokens; they already cover the site's DNA.

### 1.2 Duration hierarchy

| slot | duration | when |
|---|---|---|
| `DURATION_FAST` | 0.20s | micro-feedback, hover accent |
| `DURATION_NORMAL` | 0.50s | content reveal, row hit |
| `DURATION_SLOW` | 0.90s | section mask, incut |
| `DURATION_CINEMATIC` | 1.30s | loader, camera commits, full-stage transitions |

### 1.3 Stagger vocabulary

| token | value | grid/list use |
|---|---|---|
| `STAGGER_TIGHT` | 0.035 | marquee, tab row |
| `STAGGER_ROW` | 0.065 | card/list entry |
| `STAGGER_BEAT` | 0.18 | loader word cycle |
| `STAGGER_GROUP` | 0.28 | hero headline lines, section head + lede |

### 1.4 Easing policy

- **Enter**: `power4.out` or `power3.out` — decelerate into place.
- **Exit / pass-through**: `power2.in` or `power3.in` — compress to leave quickly.
- **Overshoot subject**: `back.out(1.7)` — only for physical row hit/stamp.
- **Mask incut/decut**: `power4.out` — snappy but soft at the tail.
- **Float / drift**: `sine.inOut` — camera dolly, feather, haze.

### 1.5 Reusable motion motifs (CSS classes + helper functions)

1. **Incrop** — section mask entry. Directional `clipPath` + offset + fade.
   - CSS hook: `.section-reveal` (already exists).
   - Direction tokens: `up|down|left|right`.
   - Default: `left` for reading sections, `up` for facts.

2. **RisePop** — physical row entry with overshoot.
   - Component: `RevealPop` (already exists).
   - Use for Approach rows, Recognition rows.

3. **StaggerRise** — repeated card/grid rising with stagger.
   - Component: wrap each item in `SectionReveal` with `delay={i * STAGGER_ROW}`.

4. **MaskStroke** — accent border flash timed to scroll progress.
   - Already implemented in Approach (`borderBottomColor` lerp).
   - Extract into a reusable `ScrollProgressStroke` primitive for Facts/Recognition.

5. **ScrubOpacity** — element opacity windowed against section progress.
   - Already implemented in About word opacity.
   - Extract into `lib/scrubOpacity.js`: `makeScrubOpacity({ el, wrap, start, curve })`.

6. **DriftFloat** — subtle translate drift on holy-items.
   - CSS: `@keyframes drift { to { transform: translateY(-8px); } }` with `animation: drift 6s ease-in-out infinite alternate`.
   - Apply to `.section-title`, `.hero-eyebrow`, `.eyebrow` at rest.

7. **CursorHalo** — cursor-reactive glow on interactive rows.
   - CSS: `.cursor-halo { background: radial-gradient(...) }` updated from JS on pointermove.
   - Used across Services/Approach/Recognition rows.

8. **PullBack** — compress on leave/recede.
   - Sequence: `gsap.to(el, { scale: 0.97, opacity: 0.3, duration: DURATION_FAST, ease: EASE_PULL })`.
   - Used when section-scrub passes midpoint or FocusVeil engages.

---

## 2. Hero intro choreography

The page's first 3–4 seconds set the tone. Use the existing Loader + Reveal chain.

### 2.1 Loader beat

- **Loader** (`Loader.jsx`): keep the existing counter + word cycle.
- Enhance transition: after loader lifts, delay Hero copy by `0.15s`, then start its incrop sequence. This prevents copy from colliding with the curtain rising.

### 2.2 Hero entry (below loader)

Sequence duration: `1.4s` total.

| time | element | action | motif | easing |
|---|---|---|---|---|
| 0.00 | `.hero-eyebrow` | `y: 18 → 0`, `opacity: 0 → 1` | Incrop (left) | `power4.out` |
| 0.06 | `.hero-line:nth-child(2)` | same + 0.06s delay | Incrop (left) | `power4.out` |
| 0.12 | `.hero-line:nth-child(3)` | same | Incrop (left) | `power4.out` |
| 0.22 | `.hero-sub` | `y: 24 → 0`, `opacity: 0 → 1` | RisePop (no scale) | `power3.out` |
| 0.30 | `.hero-cta` | `y: 16 → 0`, `opacity: 0 → 1` | RisePop (no scale) | `power3.out` |
| 0.00 | `.hero-scroll-line` | `scaleY: 0 → 1`, transformOrigin bottom | StretchPop | `back.out(1.4)` |

- Hero remains **centered by default**; off-axis media query already handles ≥900px.
- Keep `data-quiet` on Hero so FocusVeil engages.
- Crystal's first idle float should begin as copy finishes — hook into Loader `onComplete` queue.

---

## 3. Section-transition grammar

The site has three rhythm families:

1. **Quiet reading** — About, Facts, Services, Approach, Stories, Recognition, Contact.
2. **Statement** — Hero, Mark, Motion.
3. **Ceremony** — Loader, FocusVeil turn.

### 3.1 Quiet reading transition

Every quiet section opens with a directional incrop, closes by compressing slightly as FocusVeil engages.

- **Open**: `SectionReveal direction="left"` reads the whole block in one go.
- **Mid**: `ScrubOpacity` on individual cards/rows as user reads.
- **Close**: as section reaches `center` to `bottom 35%`, apply `PullBack` to the section wrapper (`scale: 1 → 1.005`, `opacity: 1 → 0.85`). Soft elastic fade — no mask out, no leave clip.

### 3.2 Statement transition

Mark and Motion are **not** quiet. They should not use FocusVeil.

- **Mark**: keep currect left-to-right incrop but add a `0.12s` drift to `.mark-line` (translateY `-4px` → `0`).
- **Motion**: already pinned; its "transition" is the stage change from `hold → arc → grid`. Maintain that but add a subtle camera dolly `power3.inOut` during each stage boundary (leveraging existing `motionFlight.progress`).

### 3.3 Ceremony (FocusVeil / dim)

- **Enter quiet**: FocusVeil fades to `opacity: 0.55` over `0.65s` with `power2.out`.
- **Leave quiet**: fade to `0` over `0.55s` with `power2.in`.
- Tie section wrapper opacity to FocusVeil active set: when veil is on, section content sits at `opacity: 0.95`; when off, `1`. This prevents the text from feeling buried.

---

## 4. Per-section choreography

Below is a compact spec for each section beyond the patterns already in place.

### 4.1 About (word field)

- Keep row-reveal from `clipPath: inset(0 100% 0 0)`.
- Add a `DriftFloat` class to `.about-kicker` so it floats at rest.
- Word opacity already scrubs against scroll progress — good.
- Raise opacity floor from `0.14` to `0.18` so words feel alive before the scrub lands.

### 4.2 Facts

- Wrap each `.fact-card` in `SectionReveal direction="up"` (already done).
- Add `ScrollProgressStroke` to the fact index circle — a `stroke-dashoffset` tween directed at `self.progress` in a ScrollTrigger. The ring draws itself as you read.
- Add a subtle `DriftFloat` to `.section-title` in Facts.

### 4.3 Services

- Service rows already `SectionReveal direction="left"` with stagger.
- Add a **sliding rail** background (`.services-catalogue::before`) that translates on x according to scroll progress inside the section. Low opacity (`0.04`), `EASE_PULL`/`sine.inOut`.
- Marquee already scrolls — add a `DriftFloat` to the whole `.services-marquee` wrapper for breathing space.

### 4.4 Approach

- Use existing row-hover hit (`scale: 1.018` + border flash).
- Add `ScrollProgressStroke` to the step number (`.approach-num`) ring. Progress-driven rather than hover-driven, so the ring fills as you reach each step.
- Section close: `PullBack` on `.approach-list` over `DURATION_SLOW`, `ease: EASE_PULL`.

### 4.5 Stories

- Tabs and panels already work via ARIA.
- Add a `StaggerRise` to the tabs container (already wrapping in SectionReveal, just ensure stagger).
- Quote change transition: fade out `opacity 0.18s`, swap, fade in `0.28s` with `power2.out`. No crossfade complexity — crisp is brand accurate.

### 4.6 Mark (statement)

- **Don't** quiet this section. Remove `data-quiet`.
- Lines enter with Incrop left.
- Add a slow `translateY(-4px)` drift to `.mark-sub` once in place.
- Allow camera through without FocusVeil dimming.

### 4.7 Recognition

- Rows use `RevealPop` already.
- Add `ScrollProgressStroke` to the year badge (`.recognition-year` ring). Hover/click/ring uses the existing `chime` singleton.
- Interaction: on hover, row lifts `y: -4px` + box-shadow pulse over `DURATION_FAST`. Off-release: `PullBack` style ease.

### 4.8 Motion

- Keep existing pin + scrub + stage machine.
- On each stage boundary (`motionStageAt` change), add a tiny camera dolly seek: `tmpPos.z += 0.6` then damp back (`1 - exp(-dt * 3)`). This reads as the camera *inhaling* into the new stage.
- Stage names already encode narrative: `hold → arc → grid`. Maintain but rename tokens:
  - `hold`: camera settles before launch
  - `arc`: studies orbit in
  - `grid`: they land

### 4.9 Contact

- Already quiet, covered by FocusVeil.
- Add a **glow sweep** on the CTA email button: an internal `::after` pseudo animated via `background-position` on hover. No new assets — just CSS gradient.
- Footer links: add `PullBack` micro-feedback on hover-release.

---

## 5. Cinematic beats and camera choreography

The camera uses `smootherstep` and frame-rate-independent damping. Extend `lib/journey.js` segments with bezier sub-samples only if a section is *heavily* stretched (e.g. Showcase grid). Otherwise leave `STOPS` untouched.

### 5.1 Beat annotations (extend `lib/beatProgress.js`)

Tag each beat with a mood token that `CameraRig` reads to shift FOV/roll sensitivity:

```js
export const BEAT_MOOD = {
  hero:         'dolly',
  about:        'float',
  facts:        'settle',
  services:     'float',
  approach:     'track',
  stories:      'float',
  mark:         'crest',
  recognition:  'float',
  motion:       'lock',   // zero roll / fixed camera
  contact:      'shore',
};
```

- Track: slightly stronger pointer parallax than float.
- Crest: brief `FOV_SURGE_MAX` burst as Mark line assembles.
- Shore: gentle return to `FOV_BASE`.

### 5.2 Cinematic moments

| beat | drama | implementation |
|---|---|---|
| Loader release | curtain ascent | existing `yPercent: -100` `power4.inOut` |
| Hero enter | title incrop | per §2.2 |
| Mark resolve | camera hold still | keep `motionLocked` false; camera drifts more slowly during Mark |
| Motion pin | zero-roll lock | existing `motionLocked = true` path |
| Recognition ring | camera bobbing | `scrollState.velocity` filtered gentle sine wave added to `tmpPos.y` over `0.8s` |
| Contact shore | drop FocusVeil | `scrollState.focus → 0`, camera fov back to `FOV_BASE` with `sine.inOut` |

---

## 6. Transition catalog between sections

Use this language when describing/authoring new handoffs:

```
Section A (exhaust) → Section B (arrive)
  Exhaust pattern: PullBack on A wrapper.
  Drift window:   pure camera flight; DOM slows staggers.
  Arrive pattern: Incrop + StaggerRise on B headline + row set.
  Focus:          data-quiet on/off toggles FocusVeil.
  Camera:         Journey segment lerp + smootherstep.
```

For quiet-to-quiet handoffs (e.g. About → Facts), FocusVeil never fully rests — it shorts through 0 opacity. The code already handles this.

---

## 7. Accessibility and reduced-motion gate

Every new motion primitive must honor:

- `window.matchMedia('(prefers-reduced-motion: reduce)')` → skip tweens, set final state immediately.
- Existing `ScrollTrigger` ScrollTriggers scrub their values, but GSAP scrub already respects reduced motion by not adding offset tweening. Verify new primitives follow.

Pattern:

```js
if (reduced) {
  gsap.set(el, finalState);
  return;
}
```

---

## 8. Performance guardrails

1. **No allocation inside `useFrame`** — pre-build temporaries in module scope; mutate only.
2. **One RAF clock** — Lenis already driven by `gsap.ticker`; never attach a second `requestAnimationFrame`.
3. **GPU-composited properties only** — animate `transform`, `opacity`, `clipPath`, `filter: blur()` (small radii only).
4. **ScrollTrigger scope** — pin only Motion; keep all other content non-pinned.
5. **will-change lifecycle** — set during animation, removed after (`clearProps`).

---

## 9. Migration checklist

Small, incremental changes:

- [ ] Add `EASE_PULL`, `EASE_FLOAT`, `STAGGER_GROUP` to `lib/easing.js`.
- [ ] Add `BEAT_MOOD` map to `lib/beatProgress.js`.
- [ ] Extract `lib/scrubOpacity.js` and `ScrollProgressStroke` primitive.
- [ ] Refine Hero entry sequence in `Hero.jsx` / `Loader.jsx` per §2.2.
- [ ] Add `PullBack` close transition to quiet reading sections.
- [ ] Add camera mood reactions in `CameraRig.jsx` per §5.1.
- [ ] Verify `Mark.jsx`, `Motion.jsx` stay non-quiet with section-level data attributes updated.

No new 3D assets, no image imports, no CSS framework changes — pure procedural motion within the existing stack.
