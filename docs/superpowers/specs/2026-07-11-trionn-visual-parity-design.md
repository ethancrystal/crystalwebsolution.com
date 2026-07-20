# Crystal Web Solution — Trionn Visual-Parity Design Specification

**Status:** Approved direction and canonical source of truth  
**Version:** 2.1  
**Date:** 2026-07-11  
**Implementation branch:** `feature/trionn-visual-parity-v2`

## 1. Source hierarchy

This file is the canonical implementation specification.

The following supplied files are supporting material only:

1. `Crystal_Web_Solution_Trionn_Visual_Parity_Blueprint.docx`
2. `Implementation Plan Crystal Web Sol - REVISED.txt`
3. `#3 - Beats 1–4 Statement to Selected Work - REVISED.txt`
4. `#4 - Beats 5–7 Wipe Services Motion CTA - REVISED.txt`
5. `trionn-visual-parity-stack - REVISED.txt`
6. `PRD Document for Web Design.pdf`
7. `new-session-20260710.json`
8. The current-site full-page screenshot
9. The AI/automation homepage mockup

Where those files conflict, this specification wins.

The PDF is a captured generation transcript, not a clean product specification. The JSON is a historical session log that includes obsolete persistent-3D decisions. Neither is an implementation authority.

## 2. Product positioning

Crystal Web Solution is positioned as a premium digital systems studio, not a generic web-design agency.

Primary offer:

> We design and build websites, AI automations, and operational workflows that help ambitious businesses grow.

The site must make the following clear within ten seconds:

- Crystal builds premium web platforms.
- Crystal delivers practical AI automation.
- Crystal automates business workflows and system integrations.
- Crystal combines strategy, product design, engineering, brand, and growth.
- Visitors can start a direct project conversation without a complicated funnel.

## 3. Service taxonomy

The services sequence contains exactly five cards so the reference carousel choreography remains stable.

1. **AI Automation**
   - AI assistants and chatbots
   - Knowledge-base and retrieval systems
   - AI-assisted support, content, and analysis
   - Outcome: reduce repetitive cognitive work and improve response speed

2. **Workflow Automation**
   - CRM and lead-routing workflows
   - Client onboarding and document generation
   - Email, proposal, invoice, and task automation
   - Outcome: reduce manual handoffs and operational errors

3. **Web Platforms & Development**
   - Marketing websites and conversion landing pages
   - Ecommerce and authenticated web applications
   - CMS, integrations, and performance engineering
   - Outcome: ship a fast, scalable digital platform that supports growth

4. **Product & UX Design**
   - Product discovery and experience architecture
   - UI systems and interaction design
   - Prototypes and usability validation
   - Outcome: make complex systems understandable and usable

5. **Brand, Growth & Optimization**
   - Brand systems and digital identity
   - SEO and conversion optimization
   - Analytics, experimentation, and growth support
   - Outcome: create a coherent brand and continuously improve acquisition

No fabricated percentages, client counts, ratings, hours saved, or awards may appear. Unverified metrics remain absent from the rendered website.

## 4. Experience architecture

The page is a sequence of independently testable stages. It is not one continuous Three.js world.

### Scene 0 — Loader

- Full viewport, minimal mark.
- Wait only for fonts and critical hero media.
- No fake percentage progress.
- Skip or shorten for repeat visits.

### Scene 1 — Hero

- Full-viewport editorial composition.
- Strong two-line value proposition and one primary CTA.
- Isolated hero-only raw WebGL effect or a hero-only crystal compatibility module.
- The hero visual is destroyed or paused after exit and shares no global camera state.

### Scene 2 — Statement / About

- Large line-masked statement with narrow supporting copy.
- Optional lightweight fragments remain local to this scene.
- Text remains dominant.

### Scene 3 — Velocity Marquee

- Full-width oversized rail.
- Base motion responds temporarily to scroll velocity.
- Mobile uses a slower fixed speed.

### Scene 4 — Key Facts / Social Proof

- Contrasting editorial background.
- Grid-aligned evidence cells, not floating glass cards.
- Verified facts only; otherwise use non-numeric proof such as capabilities, industries, and named project categories.

### Scene 5 — Selected Work

- Work appears before the main services pitch.
- Reference-measured project proportions and deterministic entrances.
- Muted hover video on capable desktop devices; posters on touch/reduced-motion.

### Scene 6 — Full-Viewport Wipe

- One measured solid-panel handoff.
- The services composition is precomposed beneath it.
- This is not a reusable transition applied to unrelated sections.

### Scenes 7–8 — Services Intro to Curved Carousel

- Implemented as one authored pinned timeline with two readable states.
- Giant stacked service words transform into the five-card curved sequence.
- One dominant card, neighboring cards partially visible.
- Wheel, touch, and keyboard navigation cannot double-advance.
- Mobile becomes a stable vertical list or snap carousel without fragile pinning.

### Scene 9 — Design in Motion / Gallery

- Two oversized opposing headline rails.
- Six media cards follow explicit authored paths.
- No `Math.random`, generated rotations, or approximate orbital motion.
- Final composition remains stable long enough to inspect.

### Scene 10 — Closing CTA and Wordmark

- One short invitation and one primary action.
- Large Crystal wordmark fills the lower field.
- Contact and social details enter after the primary CTA.

## 5. Technical architecture

### Required stack

- Next.js App Router
- React
- GSAP
- `@gsap/react` with `useGSAP`
- ScrollTrigger
- GSAP Observer only for discrete carousel input
- Lenis synchronized to the GSAP ticker
- Tokenized global CSS and CSS custom properties in `app/globals.css`
- Raw WebGL only for the isolated hero when reference capture proves it necessary
- DOM, transforms, clip-path, image, and video for all later stages
- Playwright screenshot capture and pixel-difference reporting

Tailwind is not the design-token authority. It may be introduced later only for narrow utilities if it does not compete with the global token system.

### Global motion rules

- Primary CSS ease: `cubic-bezier(0.16, 1, 0.3, 1)`
- Secondary CSS ease: `cubic-bezier(0.22, 1, 0.36, 1)`
- Fast interaction: 0.4–0.6 seconds
- Standard reveal: 0.8–1.2 seconds
- Line stagger: 0.06–0.10 seconds
- Animate transforms, opacity, filters, and clip-path only
- Do not animate layout properties
- No universal scrub value
- All ScrollTriggers, Observers, Lenis hooks, videos, and RAF/WebGL loops are cleaned up on unmount

## 6. Asset pipeline

### Required media variants

Each project motion asset provides:

- Desktop WebM, VP9, muted, loopable
- Desktop MP4, H.264 fallback
- Mobile MP4, H.264, lower resolution and bitrate
- AVIF or WebP poster
- Width, height, duration, and byte size metadata

### Loading policy

- Hero poster and critical font files may preload.
- Project video files never preload globally.
- Project video mounts or loads only near the viewport.
- Hover playback begins only after metadata is ready.
- Videos pause and release work when the section exits.
- Reduced-motion mode displays posters and does not autoplay decorative motion.

### Initial budgets

- Hero critical media: maximum 1.5 MB transferred on first load
- Individual desktop project loop: maximum 2.5 MB
- Individual mobile project loop: maximum 1.2 MB
- Poster image: maximum 250 KB

Budgets can be revised only with measured LCP and device evidence.

## 7. Responsive rules

Reference viewports:

- 1440 × 900 — primary desktop
- 1920 × 1080 — wide desktop
- 1024 × 768 — tablet
- 390 × 844 — primary mobile
- 375 × 667 — small mobile

Rules:

- Desktop reference is implemented first.
- Tablet preserves hierarchy while reducing simultaneous card visibility.
- Mobile removes long pins, orbit paths, and pointer-dependent effects.
- Every tap target is at least 44 × 44 CSS pixels.
- Information is never hover-only.
- Mobile uses dedicated video encodes and stable readable end states.

## 8. Accessibility and failure behavior

- `prefers-reduced-motion` disables Lenis smoothing, scrubbed timelines, autoplay decorative video, and shader movement.
- Content remains visible if JavaScript fails.
- Heading order is semantic.
- Menu focus is trapped and Escape closes it.
- Service controls and project cards are keyboard operable.
- Contrast is valid in every animated state.
- Canvas and decorative media are ignored by assistive technology.

## 9. Measurement and visual regression

No section is considered reference-matched without captured data.

For each stage and viewport, record:

- Section start and end scroll positions
- Section height
- Grid margins and column gaps
- Heading line breaks and baselines
- Media rectangles and corner radii
- Stable entry, active, and exit frames
- Trigger start/end values
- Pin duration and normalized progress
- Motion direction, duration, stagger, and easing

Required normalized captures:

- 0%
- 25%
- 50%
- 75%
- 100%

Acceptance targets:

- Major geometry within 4 CSS pixels of the approved overlay at the primary viewport
- Mean image-difference below 2% for layout-only comparison zones
- No console, hydration, WebGL, RAF, Observer, Lenis, or ScrollTrigger errors
- Complete mobile and reduced-motion behavior

## 10. Migration from the current repository

The current implementation mounts a fixed React Three Fiber scene behind the complete page and uses `CameraRig`, cluster positions, and beat progression. That architecture is explicitly superseded.

Migration rules:

- Do not extend the existing global `Scene` for new v2 stages.
- New v2 sections must not import `CameraRig`, `CLUSTERS`, or `beatProgress`.
- Build the v2 shell in parallel on this feature branch.
- Keep the old experience available temporarily for comparison until the v2 route passes baseline QA.
- Remove obsolete global 3D dependencies only after no production component imports them.

## 11. Current visual references

### Existing-site screenshot

Use it only to recover legitimate Crystal project names, brand assets, contact details, and content hierarchy. Do not preserve its dense conventional agency layout.

### AI/automation mockup

Use it only as evidence that AI Automation and Workflow Automation must be first-class services. Do not copy its dashboard cards, generic SaaS styling, or unverified metrics.

### Trionn

Use observable layout and motion choreography as reference. Do not copy source code, copywriting, logos, or project media.

## 12. Explicit exclusions

- No site-wide persistent 3D camera journey
- No global rotating crystal behind every section
- No generic horizontal services panel track
- No randomized gallery paths
- No universal reveal wrapper for all sections
- No invented metrics or client logos
- No autoplay project video on initial page load
- No claim of pixel parity without overlay evidence
