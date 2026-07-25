---
applyTo: '.copilot-tracking/changes/20260724-awwwards-parity-changes.md'
---

<!-- markdownlint-disable-file -->

# Task Checklist: Awwwards Site of the Month readiness

## Overview

Raise crystalwebsolution.com's actual craft level (not just its concept) to the bar Awwwards
scores against, so a Site of the Day submission has a real shot at Site of the Month recognition.

## Objectives

- Close out visual QA debt on already-shipped, browser-unverified CSS work before adding more.
- Establish a performance/accessibility baseline (Usability is 30% of the Awwwards score).
- Extend the homepage's 3D/motion design language into the subpages, which currently drop into a
  flat template the moment a visitor leaves `/`.
- Add depth to real content within the existing "no invented case studies" house rule.
- Leave the site in a submission-ready state (favicon, metadata, no broken states).

## Open decision needed before Phase 5

Live QA on `/reviews` surfaced a 1-star review whose reproduced text includes an ethnicity-based
generalization ("they all are asian") alongside the scam accusation. The page's stated policy is
"we publish the complete supplied archive, not only the positive reviews." Phase 5 (content depth)
cannot proceed on the reviews surface until you decide: leave verbatim, quote the substantive
complaint only and drop that clause, or add a visible company reply beneath it. Everything else in
this plan is independent of that decision.

## Research Summary

- #file:../research/20260724-awwwards-parity-research.md — full research: Awwwards' actual
  evaluation weights and process, what's listed on their US page, current CWS stack/architecture
  facts, and the gap analysis this plan is built from.

## Already verified this session (no further action needed)

- [x] Motion rail hover-crop bug (BorderGlow `overflow: auto` clipping the card's hover lift) —
      fixed in `app/globals.css`, committed (`cf2c682`), pushed to branch
      `claude/21st-services-approach-glow` (PR #34), and confirmed live in-browser: hovered cards
      now render a complete, uncropped top corner.
- [x] `/reviews` page "text too big / too basic" complaint — confirmed live in-browser as resolved
      by the prior round's CSS pass; card typography, spacing, and stat tiles read cleanly.

## Implementation Checklist

### [ ] Phase 1: Visual QA close-out on already-shipped work

- [ ] Task 1.1: Live-browser QA pass over the rest of PR #34's unverified changes (Services hover,
      Approach connector animation, Marquee edge-mask, footer hierarchy) — same method just used
      for Motion/Reviews (dev server + claude-in-chrome navigate/screenshot/hover).
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 1-40)
- [ ] Task 1.2: Fix anything Task 1.1 finds; re-run `npm run build` after each fix.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 1-40)

### [ ] Phase 2: Performance & accessibility baseline (Usability, 30% of score)

- [ ] Task 2.1: Reduced-motion audit — confirm every animated component checks
      `prefers-reduced-motion`; research found 12 of ~19 components with the guard already
      (`About`, `Approach`, `Lab`, `Marquee`, `SectionReveal`, `Magnetic`, etc.) — audit the rest
      (`BorderGlow`, `Motion`, `ProjectVisual`, `three/*`, `ScrollProgress`, `FocusVeil`).
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 42-70)
- [ ] Task 2.2: Focus-state audit for custom-cursor / magnetic / `data-cursor` interactive elements
      — confirm keyboard-only navigation has a visible focus fallback everywhere the custom cursor
      assumes a mouse.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 42-70)
- [ ] Task 2.3: Add `noindex` to `/admin`, `/dashboard`, `/login`, `/signup`, `/api/auth/*` —
      product surfaces that currently have no `robots` override in their route metadata.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 72-90)
- [ ] Task 2.4: Run a Lighthouse/Core Web Vitals pass (mobile + desktop) via the connected browser
      against the dev build, focused on LCP (WebGL canvas first paint) and INP (GSAP/Lenis input
      responsiveness) — no baseline currently exists.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 92-105)

### [ ] Phase 3: Carry the 3D/motion language into the subpages

- [ ] Task 3.1: `/work`, `/work/[slug]`, and `/reviews` currently render inside a flat `.subpage`
      template with no Canvas — this breaks the homepage's "one continuous space" premise the
      moment a visitor clicks through. Design and implement a lightweight carried-over treatment
      (does not need the full journey/CameraRig system — even a static crystal-adjacent backdrop
      or consistent particle field would close the gap) for these routes.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 107-130)

### [ ] Phase 4: One signature interaction moment (Creativity, 20% of score)

- [ ] Task 4.1: Design (in this plan's details file first, not in code) one deliberate "wow moment"
      distinct from the existing crystal/particle/carousel work — sound design, an Easter egg, or
      a hero-scale interaction unique to CWS. Do not implement until reviewed; this is the highest-
      risk, most subjective item in the plan.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 132-145)

### [ ] Phase 5: Deepen real content (Content, 10% of score) — blocked on the open decision above

- [ ] Task 5.1: Resolve the reviews-content decision (see "Open decision needed" above).
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 147-155)
- [ ] Task 5.2: Restructure `/work/[slug]` case studies into a clearer problem/approach/outcome
      shape using only the real body copy already in `lib/projects.js` — no invented metrics.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 147-165)

### [ ] Phase 6: Awwwards submission readiness

- [ ] Task 6.1: Favicon/app-icon audit, confirm no dev-only artifacts ship, confirm `/robots.txt`
      and `/sitemap.xml` reflect the noindex changes from Phase 2, remove the unused `shadcn`
      devDependency.
  - Details: .copilot-tracking/details/20260724-awwwards-parity-details.md (Lines 167-180)

## Dependencies

- Working dev server + connected `claude-in-chrome` browser tools for all visual QA phases.
- A decision from you on the reviews-content question before Phase 5 can proceed.
- Your review/prioritization of this plan before implementation begins (per your instruction).

## Success Criteria

- No CSS/behavior shipped without live-browser confirmation.
- A recorded Lighthouse/Core Web Vitals baseline exists where none did before.
- `/work`, `/work/[slug]`, `/reviews` visually belong to the same world as `/`.
- One new signature interaction has been proposed, reviewed, and (if approved) implemented.
- Case studies read as problem → approach → outcome using only real supplied content.
- Site is free of dev-only noindex gaps and has a clean, current favicon/metadata pass.
