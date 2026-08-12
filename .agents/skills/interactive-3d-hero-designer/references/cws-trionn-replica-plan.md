# CWS × Trionn Replica Plan (Binding Reference)

**Source**: User-provided replication plan (2026-06-29)  
**Core Directive**: Replicate the **Trionn design system + interaction language exactly**, but replace every brand identity element with **Crystal Web Solution (CWS)**.

**One Allowed Difference (non-negotiable)**:  
TRIONN® wordmark + geometric mark → **CWS** wordmark + your mark (same size, position, hierarchy).  
All other layout, spacing, motion, scroll behavior, and interaction mechanics must remain 1:1.

---

## What the Recording Actually Shows

| Moment              | Observed in Video |
|---------------------|-------------------|
| **Hero**            | Black canvas, huge headline **“Designed to mean something.”**, **TRIONN®** top-left, **LET’S TALK** + **MENU =** + mute icon, central **angular 3D monolith** with thin orbit lines |
| **Interaction**     | **“HOLD TO ⚡ BLAST”** / **“DARE ⚡ TO TOUCH THE LINES”** prompt |
| **Right column**    | **EST. 2012**, **14+ YEARS SHAPING DIGITAL DIRECTION.**, short service description |
| **Scroll behavior** | Smooth Lenis scroll; mid-scroll **ABOUT** section fades in with large text |
| **3D Mark**         | Angular stacked prism / monolith (not icosahedron). Fragments or reacts on scroll + pointer interaction |

**“TTT → CWS” interpretation**: Replicate the full Trionn experience layer, but apply the **CWS brand layer** on top (name, logo, copy, dates, contact, assets).

---

## Binding Brand Replacement Rules

| Reference (Trionn)              | **CWS Replacement**                          | Keep Layout / Behavior |
|--------------------------------|----------------------------------------------|------------------------|
| TRIONN® wordmark + mark        | Crystal Web Solution / **CWS**               | Yes |
| `hello@trionn.com` + phone     | `hello@crystalwebsolution.com` + your phone  | Yes |
| Est. **2012** / **14+ years**  | Est. **2018** / **6+ years** (or real dates) | Yes — same visual treatment |
| Trionn mission / about copy    | Your studio copy                             | Same typography hierarchy |
| Awards, partners, case studies | Placeholder or your assets                   | Same grid/hover/scroll |
| Audio (if present)             | Optional — keep mute UX                      | Same |
| `/trionn-story`                | `/about` or “Our story”                      | Same navigation pattern |

**Never change**:
- Section order
- Spacing system
- Breakpoints
- Lenis smooth scroll
- Menu animation
- Hero fragment-on-scroll
- Hold-to-blast interaction
- Marquee, count-ups, twisting carousel, work hovers, page transitions

---

## 12-Task Execution Plan (Source of Truth)

**Spec file**: `docs/superpowers/specs/2026-06-29-trionn-replica-design.md`  
**Plan file**: `docs/superpowers/plans/2026-06-29-trionn-replica.md`

### Execution Order (strict — no skipping)

| #  | Task                                      | Definition of “Done” for 1:1 Replica |
|----|-------------------------------------------|--------------------------------------|
| 1  | Reference capture + `tokens.ts` + Lenis   | Full `trionn-reference.md` with colors, typography, easing curves, **every interaction mechanic** documented. All components consume design tokens. |
| 2  | Navbar, Footer, PageTransition, Routes    | Full **LET’S TALK**, **MENU =** fullscreen menu + enquiry form. Routes: `/`, `/work`, `/services`, `/about`, `/contact`. |
| 3  | Home section order (static first)         | Preloader → Hero → Est strip → Mission → Values → Metrics → Work preview → Awards → … (exact order per spec). |
| 4  | **Hero mark fragmentation** (on scroll)   | The 3D mark **breaks apart / reacts** on scroll — signature behavior from recording. |
| 5  | **Blast lines** + magnetic cursor/buttons | Hold/hover triggers lightning-style blast + line interaction exactly as recorded. |
| 6  | Split-text, count-up, marquee             | Animated headlines, key facts numbers, horizontal marquee strips. |
| 7  | **Twisting carousel** (high priority)     | Matches reference 3D/CSS twist behavior at page end. |
| 8  | Work index + hover reveals                | List view + cursor-following preview. `/work/[slug]` stubs. |
| 9  | Services page                             | Scroll-reveal service rows using CWS copy. |
| 10 | About page                                | Story + values + metrics + team placeholders. |
| 11 | Contact + validated form                  | Functional stub submit. |
| 12 | Responsive (375/768/1440) + a11y          | Every heavy effect degrades gracefully on `prefers-reduced-motion`. Full a11y audit. |

**Quality gate for every task**: `npm run build && npm run lint` + one commit.

---

## Current State vs Exact Replica (as of plan date)

**~25% complete** toward 1:1 contract:

**Already done (partial)**:
- Lenis + some GSAP/Framer Motion
- Preloader, split headline
- Shader + crystal hero (visual premium but **not** matching the angular monolith + fragmentation + blast from recording)
- Magnetic cursor/buttons
- Some work strip UX (duplicate — needs consolidation per Task 3)

**Still required for exact match**:
- Task 1: Locked `tokens.ts` + complete reference doc from your video + live site
- Task 4: True scroll-driven **fragmentation** of the hero mark
- Task 5: Full **hold-to-blast** lightning + line interaction
- Task 2: Fullscreen **MENU =** + multi-page shell
- Task 7: Twisting carousel
- Task 12: Full responsive + reduced-motion audit

**Important note from plan**: Current hero uses a **crystal icosahedron + shader**. The reference recording uses an **angular monolith/prism stack** that fragments and reacts to blast. These are visually different — the plan requires matching the recorded angular form + behavior.

---

## Recommended Immediate Next Steps (from plan)

1. **Task 1 first** — Finish `trionn-reference.md` by analyzing your video frame-by-frame + live trionn.com (open menu, trigger blast, observe fragmentation mid-scroll, study carousel). Lock `src/lib/tokens.ts`.
2. **Task 2** — Build fullscreen **MENU =** and the five routes (biggest “feels like Trionn” improvement after hero).
3. **Tasks 4 + 5** — Hero mark fragmentation on scroll + blast interaction (these are the signature moments of the recording).

---

## Clarification on Branding

- Recording clearly shows **TRIONN®**.
- Your message said **“TTT → CWS”**.
- **Default interpretation**: Use the full Trionn design system but apply the **Crystal Web Solution / CWS** brand layer everywhere TRIONN appears.
- If you want a literal **3-letter “CWS” lockup** in the header (like a stylized mark), we treat “CWS” as the wordmark replacement in all instances.

---

## How This Document Integrates with the Skill

This file (`references/cws-trionn-replica-plan.md`) is now the **authoritative source** for any full-site replication work using the `interactive-3d-hero-designer` skill.

When the user requests hero work, page work, or full replica progress, the skill must:
- Respect the **CWS brand replacement rules** above.
- Follow the **12-task order** (no skipping).
- Prioritize **Tasks 4 + 5** (hero fragmentation + blast) when working on the hero, because they are the most distinctive elements from the provided recording.
- Never change layout, spacing, or interaction mechanics — only brand content.

This ensures every generated component or page stays faithful to the reference while correctly applying the CWS identity.