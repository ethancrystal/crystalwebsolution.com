# Claude Implementation Prompt — CD Sportswear INC Visual Experience

Copy everything below into Claude Code from the repository root.

---

You are the **lead product designer, creative director, principal animator, and senior frontend engineer** responsible for making this app the most visually striking, interactive, and user-friendly version of itself without breaking its architecture, accessibility, performance, CRM workflows, SEO, or production deployment.

You are not being asked to make a random redesign. You are being asked to lead a controlled product improvement program for an existing Next.js/WebGL experience.

## 1. Project identity — do not confuse these names

- Repository: `ethancrystal/crystalwebsolution.com`
- Business: **CD Sportswear INC**
- Production domain: `https://www.cdsportswearinc.com`
- `crystalwebsolution.com` is the repository name and retired domain, not the business name or live URL.
- Do not introduce `cdsportswearusa.com` or `crystalwebsolution.com` as current business URLs.
- Current contact and identity data must come from `lib/site.js`; do not hardcode new contact details.

## 2. Read these files before changing anything

Read and follow, in this order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `CLAUDE-VISUAL-EXPERIENCE-PLAN.md`
4. `docs/README.md`
5. `docs/ux/crm-jtbd.md`
6. `docs/ux/crm-journey.md`
7. `docs/ux/crm-flow.md`
8. `components/Experience.jsx`
9. `components/Scene.jsx`
10. `lib/journey.js`
11. `lib/beatProgress.js`
12. `lib/scrollState.js`
13. `lib/motionScale.js`
14. `lib/easing.js`
15. `app/globals.css` and the imported `app/styles/*.css` files relevant to each touched area.

Before coding, produce a short **current-state map** in your working notes containing:

- Existing route/section order.
- Existing IDs and beat names.
- Current camera stops and 3D clusters.
- Existing animation singletons and the shared ticker.
- Existing tests and commands.
- Current performance and accessibility risks.
- Files you expect to touch.

Do not begin a broad rewrite before this map is complete.

## 3. North-star outcome

Make the site feel like a living digital instrument: immediately clear about what CD Sportswear INC does, visually unforgettable without being confusing, tactile without being gimmicky, and fast enough that the spectacle never becomes friction.

The visitor journey should feel like:

> **Awe → understanding → proof → confidence → action**

The homepage must still feel cinematic and premium, but a first-time visitor must understand the offer, find Services/Work/Contact without hunting, and complete the primary journey with keyboard, touch, screen reader, or WebGL disabled.

## 4. Non-negotiable engineering rules

- Use plain JSX and global CSS. Do not introduce TypeScript or Tailwind.
- Preserve the existing Next.js App Router architecture.
- Preserve the one fixed WebGL canvas and one shared RAF clock.
- Do not create independent `requestAnimationFrame` loops.
- Do not put high-frequency per-frame values in React state.
- Use module-level singletons for cross-boundary per-frame state, matching the existing architecture.
- Do not allocate vectors, colors, arrays, or objects inside `useFrame`.
- Use frame-rate-independent damping: `1 - Math.exp(-dt * k)`.
- Reuse easing and duration tokens from `lib/easing.js`; do not scatter magic numbers.
- Every animation effect must return a teardown.
- Animate DOM with transform and opacity whenever possible.
- Keep visual assets procedural unless the repository already treats a file as a required compatibility/brand asset.
- Never copy competitor text, logos, client names, testimonials, or media.
- Never delete a file without an owner-approved reason and a route/runtime audit.
- Never change database schema, RLS, auth, billing, ownership, or security behavior as part of visual work.
- Never deploy directly to production or run `vercel --prod`.
- Work on a feature branch and use preview/build/test gates.

## 5. Managerial execution protocol

Operate in phases. Do not mix every idea into one giant commit.

### Phase 0 — Discovery and baseline

Before editing, inspect the current app and report:

- What already works and must be preserved.
- The three largest UX problems.
- The three largest performance risks.
- The three largest accessibility risks.
- The exact files you will change.
- A proposed phase sequence.

Capture a baseline:

- Homepage at scroll progress 0, 0.25, 0.5, 0.75, and 1.
- Desktop and mobile dimensions.
- FPS/frame time, WebGL draw calls if available, long tasks, and memory.
- axe/Lighthouse accessibility results.
- Console errors and hydration warnings.

If dependencies cannot be installed or the browser cannot run, state that clearly and do not pretend visual QA passed.

### Phase 1 — Information architecture and clarity

Implement only the clarity foundation first:

1. Clarify the hero while retaining its voice:
   - Keep “Built to be unforgettable.” if it still tests well visually.
   - Add an explicit descriptor for websites, brand systems, motion, and AI automation.
   - Add useful proof.
   - Add `Start a project` and `See selected work` paths.
2. Add a persistent, accessible `JourneyNav` using native anchor links and `aria-current="location"`.
3. Use plain-language navigation labels alongside poetic section headlines.
4. Add anchor offsets so fixed chrome never obscures targets.
5. Add global `:focus-visible` styling.

Do not add new 3D effects in this phase.

### Phase 2 — Hero signature interaction

Write a short animation brief before coding. The hero should be a controlled camera/focus pull, not a pile of effects.

Implement only changes that improve:

- Hierarchy.
- Continuity into the next section.
- Feedback from explicit interaction.
- Brand personality.

Requirements:

- The hero remains understandable with the canvas hidden.
- Pointer blast is localized and cannot trigger accidentally on controls.
- Touch gets an equivalent interaction or a clean static state.
- Reduced motion removes nonessential movement while preserving hierarchy.
- Forced colors/high contrast make gradient text readable.
- Intro loader cannot permanently block access and remains under one second.

### Phase 3 — Section choreography

Treat the page as one continuous shot. Define the handoff between each adjacent beat before implementing it:

- Hero → About
- About → Services
- Services → Approach
- Approach → Stories
- Stories → Work
- Work → Contact

Use the existing `journey.js`, `beatProgress.js`, `scrollState`, and shared ticker. Do not invent a second camera system.

At every section, ask:

- What is the focal point?
- What is the user supposed to understand?
- What moves first and why?
- What is the handoff to the next section?
- What is the reduced-motion/static fallback?
- What happens on backward scroll?

### Phase 4 — Services and Work decision UX

Make discovery problem-first and touch-safe.

- Add paths for website, brand clarity, automation, motion/interactive, and “not sure.”
- Convert meaningful expandable service rows into native keyboard/touch controls.
- Use `aria-expanded` and `aria-controls`.
- Keep essential details visible without hover.
- Add problem/service/outcome metadata to work cards.
- Use a restrained filter or category model if it improves matching.

Do not overbuild a dashboard-like filter system for a cinematic marketing page.

### Phase 5 — Contact and CRM

Public contact:

- Explain what happens after a brief is submitted.
- Keep email fallback visible.
- Preserve form labels, validation, hCaptcha behavior, live statuses, and error associations.
- Do not weaken protection or change the API contract.

CRM:

- Make the dashboard action-first.
- Show project health, milestone progress, `Needs your action`, who has the ball, team contact, and latest update.
- Use text/icon/color for status.
- Preserve Supabase auth, RLS, storage, server actions, and contracts.
- Treat CRM visual changes as a separate phase from marketing motion.

### Phase 6 — Performance and resilience

Implement a quality ladder rather than one “best” mode:

```text
high: full effects, capped DPR, full but bounded particles
medium: lower DPR, reduced particles, fewer postprocessing passes
low: simplified materials/particles, no expensive postprocessing, simpler caustics
static: no continuous scene animation; CSS/procedural fallback only
```

Use device capability, coarse pointer, reduced motion, visibility state, and measured frame time as signals.

Specific requirements:

- Cap device pixel ratio.
- Cull off-screen-depth clusters with hysteresis.
- Reuse geometry/materials.
- Disable decorative raycasting.
- Avoid dynamic shadows unless essential.
- Reduce or pause caustics outside the hero viewport.
- Pause work while the tab is hidden.
- Do not animate CSS blur, width, height, top, left, margin, or padding.
- Keep postprocessing minimal and quality-gated.
- Add a WebGL failure path that leaves the DOM experience fully usable.

## 6. Quality bar for visual design

Do not use generic fade-ins as the primary design language. Every animation must answer which of these it serves:

- Hierarchy: what appears first matters most.
- Relationship: elements moving together belong together.
- Continuity: the next section feels connected to the previous one.
- Personality: spring, settle, drag, refraction, or precision communicates the studio’s character.

Use:

- Scrub for camera/scene relationships.
- Springs for interactive feedback.
- Curves for editorial/cinematic transitions.
- Stagger only when it establishes hierarchy.
- Quiet zones around decision moments.

Cut any effect that does not improve understanding, continuity, feedback, or personality.

## 7. Accessibility requirements

Every phase must preserve:

- One useful `h1` and logical heading hierarchy.
- Native links/buttons for interactive controls.
- Visible `:focus-visible` indicators.
- Keyboard operation without hover or pointer.
- Touch equivalents for pointer interactions.
- `aria-current="location"` for the active JourneyNav item.
- `aria-expanded`/`aria-controls` for expandable service content.
- Decorative canvas/effects hidden from the accessibility tree.
- Live regions only for meaningful status changes, not scroll-frame updates.
- Reduced-motion behavior that shows content immediately.
- Forced-colors/high-contrast fallback for gradient text and borders.
- Deterministic contrast behind critical text.
- No core content blocked by loaders or failed WebGL.

## 8. Performance acceptance criteria

Do not claim the experience is optimized without measurements.

Minimum goals:

- 60fps target on a 2019 MacBook Air during normal hero interaction.
- 30fps minimum on a mid-range mobile device before quality degradation.
- No second RAF loop.
- No per-frame allocations in `useFrame`.
- No unbounded particle or DOM node growth.
- No permanent high-cost effects when the relevant beat is not active.
- No long tasks introduced by the visual layer during scrolling.
- No console errors, WebGL context warnings, or hydration warnings.

Record before/after measurements in the PR or phase notes.

## 9. Testing requirements

After each phase, run the smallest relevant gate. Before claiming completion, run:

```bash
pnpm test
pnpm test:marketing
pnpm build
```

Also run browser verification against a real running build. The repository has Playwright dependencies and a planned e2e location; do not claim Cypress exists unless you explicitly add and configure it.

Test:

- Desktop and mobile.
- Forward and backward scroll.
- Anchor navigation.
- Keyboard-only flow.
- NVDA/VoiceOver smoke pass.
- Reduced motion.
- Forced colors.
- WebGL disabled/failing.
- 200% and 400% zoom.
- Slow CPU/GPU.
- Hidden tab/visibility change.

## 10. Deliverables per phase

For every phase, provide:

1. A short design/animation brief.
2. A list of files changed and why.
3. A small, reviewable diff.
4. Tests added or updated.
5. Performance measurements.
6. Accessibility checks.
7. Browser screenshots or video for the touched section.
8. Known risks and rollback notes.
9. A statement of what was intentionally not changed.

## 11. Stop conditions — pause and report instead of guessing

Stop and ask the owner when:

- The change would alter product behavior or CRM permissions.
- A new external asset/service/API is required.
- A contact identity, domain, email, legal text, or business fact is uncertain.
- A deletion or route removal is proposed.
- A design choice materially changes the business positioning.
- The current architecture cannot support the change without a broad rewrite.
- Performance or accessibility gates fail and the tradeoff is not obvious.

For ordinary reversible code/design choices, choose the simplest coherent option and document it.

## 12. Final shipping gate

Before opening or updating a PR:

- Confirm no source files were accidentally generated or rewritten.
- Check `git diff` and `git status`.
- Verify `VERSION`/`CHANGELOG.md` rules if targeting `main`.
- Run tests and build.
- Verify real browser behavior.
- Verify the production URL is never changed in SEO metadata.
- Do not merge, deploy, publish, or send external messages without the owner’s appropriate authorization.

Your final report must be concise but complete: what changed, why, evidence, test results, performance result, accessibility result, remaining risk, and exact next step.

Start now with **Phase 0 only**. Do not code until you have completed the current-state map and baseline plan.
