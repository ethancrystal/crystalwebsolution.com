# CD Sportswear USA — Frontend Enhancement & "Bold / Enigmatic" Homepage Synthesis (v2)

**Date:** June 2026
**Status:** Proposed for approval
**Scope:** Isolated worktree; production branch unchanged
**Intent:** Make the existing homepage feel bold, authored and enigmatic — award-level transition rhythm — **without** a rebrand or an IA rebuild.

> Rewritten against the real component tree. Tags:
> **[EXISTS]** already there · **[UPDATE]** extend existing · **[ADD]** new primitive.

## 1. Ground truth — what the homepage actually is

Homepage is `app/page.jsx` → `<Experience/>` (`components/Experience.jsx`), which renders, in order:

`Hero → About → Services → Approach → Stories → Mark → Lab → Motion → Contact`

plus persistent chrome: `Scene` (R3F/Three.js, client-only), `Nav`, `ScrollProgress`, `FocusVeil`, `SmoothScroll` (Lenis), `Loader`.

**Name map — the previous plan used generic names that don't exist by that label:**

| Previous plan term | Real component | Status |
|---|---|---|
| "Service section" | `sections/Services.jsx` | **[EXISTS]** |
| "Work section" | `sections/Motion.jsx` ("Selected Work", links `/work/[slug]`) + `sections/Lab.jsx` | **[EXISTS]** |
| "Process section (four-step)" | `sections/Approach.jsx` — "How we work / Four steps. No shortcuts." (STEPS array of 4) | **[EXISTS]** |
| "Reviews" | `sections/Stories.jsx` (reads `lib/reviews`) | **[EXISTS]** |
| "Navigation" | `components/Nav.jsx` | **[EXISTS]** |
| "Ink veil / route veil" | `components/FocusVeil.jsx` already exists as a contrast veil | **[EXISTS]** — extend, don't invent |

**Design tokens already in `app/globals.css` (reuse verbatim):**
`--bg:#04060c` · `--ink:#eaf2ff` · `--muted:#8b98b8` · `--cyan:#59f3ff` · `--blue:#3c6cff` · `--violet:#c084fc` · fonts `Space Grotesk` (display) / `Inter` (body) / `Space Mono` (mono) · `--accent-grad` · standard easing `cubic-bezier(0.22, 1, 0.36, 1)` · existing `clip-path: inset()` reveals.
Existing motion primitives to reuse: `DecodeText`, `Reveal`, `SectionReveal`, `GlyphMask`, `Magnetic`, `CardHoverReveal`, `ScrollProgress`, `SmoothScroll`, `data-quiet` + `FocusVeil` contrast system, `data-cursor` labels.

## 2. Awwwards transitions synthesis → the direction

Reviewed the current Awwwards *Transitions* collection (Southern Lifts, Mosby's Files [SOTD], Mehdi Bouayaben, Shaun Scholtz, AHA, LxL Creative, Léo Parpeix, a-lign studio, s0, The Eight / BONHOMME, Depth 3D, KIM SEUNGHYUK, Vibe3D, Neoconda, Warm & Fuzzy, METRIC., …). The recurring, award-winning moves — filtered to what fits a **dark, procedural, single-accent** identity:

1. **Masked handoffs, not fades.** Winners move between beats with `clip-path` wipes / shutter reveals synced to scroll — never a lazy opacity crossfade.
2. **Shared-element continuity.** A card, image or word visually *becomes* the next view (project card → case study). The eye never loses the subject.
3. **Withholding = enigmatic.** The boldest sites reveal less: heavy negative space, one loud element per screen, cryptic monospace micro-labels, content that resolves only on interaction (decode/scramble, mask lift).
4. **One accent, high contrast.** Near-black canvas, a single luminous accent, everything else monochrome. (You already have this: `--bg` + `--cyan`.)
5. **Kinetic type as the hero act.** Letter-by-letter decode / mask, oversized display type, off-axis placement.
6. **Authored first-scroll.** The hero doesn't just scroll away — it *refracts / sweeps* into the next beat, tying the 3D scene to the DOM story.
7. **Clean fallbacks.** Every one degrades to static on reduced-motion / touch.

### The synthesized homepage concept — "Refraction"

**Bold + enigmatic = a dark crystal that only reveals its facets as you move through it.** Keep all 9 sections and copy; change the *connective tissue and reveal choreography* so the long scroll reads as one authored descent through the crystal rather than nine stacked blocks.

- **A single accent discipline.** Retire the incidental purple/cyan mixing in per-section inline styles; drive every accent from `--accent-grad`/`--cyan` so the page reads as one material. (Enigmatic palettes are monochrome + one light.)
- **The scene is the transition engine.** Use the existing R3F `Scene` refraction between beats instead of decorative loops — camera/exposure already hook through `scrollState` + `FocusVeil`.

## 3. What changes, section by section

| Beat | Enhancement | Reuse / new |
|---|---|---|
| **Hero** (`Hero.jsx`) | Keep `DecodeText` title + blast pulse. **[UPDATE]** Replace the abrupt hero→About cut with a short **refraction / light-sweep exit**: a `clip-path` shutter + scene exposure dip driven by scroll. | reuse `FocusVeil`, `scrollState`; **[ADD]** one `SectionHandoff` primitive |
| **About → Services** | **[UPDATE]** masked `clip-path: inset()` handoff (already the language in `globals.css:1182`) so "positioning" resolves into services. | reuse existing keyframe |
| **Services** (`Services.jsx`) | **[UPDATE]** active service gets a more tactile highlight + supporting description + procedural visual response (crystal facet reacts). | reuse `CardHoverReveal`, `ProjectVisual` |
| **Approach** (`Approach.jsx`) | **[UPDATE]** the existing SVG dashed path becomes an **active-step progress path** — the step under the viewport lights on the `--accent-grad`; keep the 4 STEPS + copy. | reuse existing `m.path`, tie offset to scroll not `Infinity` loop |
| **Stories** (`Stories.jsx`) | **[UPDATE]** deliberate quote **crossfade + mask** on selection; keep it readable, not a hidden-content carousel. | reuse `GlyphMask` |
| **Mark / Lab** | leave as procedural interludes; **[UPDATE]** only to obey the single-accent + handoff rules. | — |
| **Motion** ("Selected Work") | **[UPDATE]** sharper hover/focus, clearer metadata hierarchy + progress cues, and a **project-card → case-study continuity cue** into `/work/[slug]`. | reuse `Magnetic`, `ProjectVisual` |
| **Contact** | **[UPDATE]** arrival handoff so the descent lands, not stops. | reuse `Reveal` |
| **Nav** (`Nav.jsx`) | **[UPDATE]** clearer **active-section indication** + route-aware continuity; keep glass/light-tone logic. | extend existing IntersectionObserver |
| **Route change (home ↔ /work/[slug])** | **[UPDATE]** promote `FocusVeil` into a shared **ink-veil route transition** for entering case studies. | extend `FocusVeil` |
| **Mobile / reduced-motion** | **[ADD]** static + native-scroll fallbacks; mobile never depends on hover. | `prefers-reduced-motion` (already gated in `Approach`/`FocusVeil`) |

## 4. New primitives to add (small, isolated)

- **[ADD] `components/SectionHandoff.jsx`** — one scroll-driven `clip-path`/opacity mask primitive used for every beat-to-beat handoff, reading the shared easing token. Keeps choreography in one place instead of scattered per section.
- **[ADD] one accent-discipline pass** in `globals.css` — replace ad-hoc per-section `rgba(192,132,252…)`/`rgba(89,243,255…)` inline styles with the token gradient.
- Everything else is **[UPDATE]** to existing sections/components.

## 5. Technical boundaries (unchanged conventions)

Plain JSX + global CSS. Reuse existing GSAP / Lenis / R3F / DOM-canvas singleton / motion-token boundaries. No broad refactors, no removing public compatibility assets, procedural visuals stay procedural. Isolate new behavior into `SectionHandoff` + section-level edits.

## 6. Acceptance criteria

Existing routes/content intact; homepage has visibly smoother masked section handoffs; hero exits via refraction into About; Services/Approach/Stories/Motion interactions feel more intentional; Motion→case-study entry feels connected; Nav shows active section; page reads as **one dark single-accent material** (bold + enigmatic); keyboard + touch usable; reduced-motion strips nonessential choreography; mobile never hover-dependent; `pnpm test` + `pnpm test:e2e` + `next build` pass.
