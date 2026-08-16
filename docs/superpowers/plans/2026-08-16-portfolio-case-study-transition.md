# Portfolio to Case-Study Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add an original, Awwwards-inspired transition from the existing homepage Motion portfolio rail into the existing `/work/[slug]` case-study routes without changing project data, route names, or the current 3D scene.

**Architecture:** Keep `Motion`, `PROJECTS`, `RailCard`, the existing `motion-card` class, and `/work/[slug]` as the source of truth. Add one new client primitive, `ProjectHandoffLink`, which preserves ordinary anchor semantics and only intercepts an unmodified primary click to run a five-stripe route handoff before calling the existing Next navigation API. The animation is DOM-only and uses transform/opacity, existing easing tokens, a reduced-motion branch, and no new WebGL loop or scroll hijack.

**Tech Stack:** Next.js App Router, React client component, GSAP, existing `EASE_MASK`/`EASE_SETTLE` tokens, CSS transforms/opacity, Playwright/Node tests, Next production build.

**Spec:** Approved in chat on 2026-08-16; based on the Refraction enhancement plan and Awwwards transition reference patterns.

## Global Constraints

- Preserve current component, route, data, and function names unless this plan explicitly creates `ProjectHandoffLink`.
- Use `PROJECTS` and each project’s existing `slug`, `title`, and `category`; do not hard-code project records.
- Preserve `Motion`, `RailCard`, `motion-card`, `data-cursor`, and existing `/work/[slug]` destinations.
- Preserve modifier-click behavior, keyboard activation, browser context-menu behavior, and ordinary anchor fallback.
- Reduced-motion and coarse-pointer environments must remain usable without the handoff animation.
- Do not create a new WebGL scene, R3F component, render loop, scroll-jacking behavior, or route schema.
- Animate only `transform` and `opacity` on the main path; the overlay must be `pointer-events: none` and `aria-hidden`.
- Use the current `EASE_MASK` and `EASE_SETTLE` tokens; do not invent a new easing name.

---

### Task 1: Add the `ProjectHandoffLink` primitive

**Files:**
- Create: `components/ProjectHandoffLink.jsx`
- Read: `lib/easing.js`, `components/SmoothScroll.jsx`, `components/FocusVeil.jsx`
- Test: `tests/projectHandoffLink.test.mjs` if source-level coverage is practical; otherwise validate via Playwright route behavior.

**Interfaces:**
- Consumes: `href`, `label`, `children`, `className`, `style`, and ordinary anchor props.
- Produces: a semantic anchor that renders children plus an `aria-hidden` fixed overlay containing five `[data-project-stripe]` elements and one `[data-project-transition-label]` element.
- Uses: `useRouter` from `next/navigation`, `useRef` from React, GSAP, `EASE_MASK`, and `EASE_SETTLE`.

- [ ] **Step 1: Confirm the current navigation contract.** Verify that `/work/[slug]` exists and that `PROJECTS` slugs resolve to it. Do not rename any route.
- [ ] **Step 2: Implement the minimal primitive.** On an unmodified primary click, call `preventDefault`, guard against duplicate clicks, set the overlay visible, animate stripe `scaleX` from `0` to `1` with alternating transform origins and an edge stagger, reveal the selected label using `y` and `autoAlpha`, and call `router.push(href)` on completion.
- [ ] **Step 3: Preserve fallback behavior.** Return without interception for modified clicks, non-primary buttons, already-prevented events, and reduced-motion mode; those paths must navigate normally or immediately through `router.push`.
- [ ] **Step 4: Add cleanup.** Keep the animation references scoped to the interaction and kill active GSAP work if the component unmounts before navigation.
- [ ] **Step 5: Verify the primitive source.** Check that no `requestAnimationFrame`, `useFrame`, new singleton, or layout-triggering property was added.

### Task 2: Integrate the primitive into `Motion`

**Files:**
- Modify: `components/sections/Motion.jsx`
- Modify: `app/globals.css`
- Preserve: `RailCard`, `PROJECTS`, `RAIL_ACCENTS`, `DEEP_LINK_PROGRESS`, `motion-card`, and existing copy.

**Interfaces:**
- `RailCard` consumes `project.slug`, `project.title`, `project.category`, and the existing per-card accent.
- `Motion` continues to render the same six project records and the existing `/work` link.
- `ProjectHandoffLink` receives `href={`/work/${project.slug}`}`, `label={project.title}`, and the existing `motion-card` class.

- [ ] **Step 1: Replace only the project-card wrapper.** Keep the card’s current children, accessibility label, cursor metadata, and accent style unchanged.
- [ ] **Step 2: Add the overlay styles.** Define the fixed overlay, five stripes, label, and reduced-motion fallback in the existing global stylesheet. Keep the overlay above page content only during its active state and `pointer-events: none` at all times.
- [ ] **Step 3: Add a bounded card response.** Use an existing transform-based hover/focus-visible lift and accent underline; do not animate width, height, margin, padding, or `transition: all`.
- [ ] **Step 4: Verify responsive behavior.** At coarse pointer widths, the card remains a normal tappable link and no overlay animation is required.

### Task 3: Add focused transition tests and run the existing suite

**Files:**
- Create or modify: `tests/projectHandoffLink.test.mjs` only if the repository’s existing source-test conventions support it.
- Read: `tests/sectionArchitecture.test.mjs`, `tests/projects.test.mjs`, existing `tests/*.test.mjs` conventions.

- [ ] **Step 1: Add source-contract assertions.** Assert that `Motion.jsx` still uses `PROJECTS`, renders `/work/${project.slug}`, and references `ProjectHandoffLink`; assert that the primitive includes reduced-motion handling, modifier-click guards, five stripes, and `aria-hidden`.
- [ ] **Step 2: Run the focused tests.** Run `pnpm test -- tests/projectHandoffLink.test.mjs` if supported, then run the full `pnpm test` suite.
- [ ] **Step 3: Fix only failures caused by this feature.** Do not alter unrelated CRM or marketing behavior.

### Task 4: Accessibility and performance audit of Hero and Stories

**Files:**
- Audit: `components/sections/Hero.jsx`, `components/sections/Stories.jsx`, `components/FocusVeil.jsx`, `app/globals.css`, and the built homepage.
- Create: `docs/superpowers/audits/2026-08-16-hero-stories-audit.md`.

- [ ] **Step 1: Run a production build.** Use `pnpm build` and record route/build results.
- [ ] **Step 2: Run browser checks.** Test desktop and mobile widths; verify heading order, link names, tab keyboard navigation, `aria-selected`, `aria-controls`, `aria-hidden`, focus visibility, no horizontal overflow, and normal scroll.
- [ ] **Step 3: Run reduced-motion checks.** Emulate `prefers-reduced-motion: reduce`; confirm Hero sweep, Stories transition, handoffs, and card motion do not hide content or remove interaction.
- [ ] **Step 4: Run performance checks.** Capture load timing, console errors, failed network requests, and layout-width/overflow checks. Record animation properties and any warnings. If Lighthouse is available, run it against the production build; otherwise record the browser-based measurements and explain the limitation.
- [ ] **Step 5: Write the audit report.** Include pass/fail evidence, any warnings, and exact follow-up changes if needed.

### Task 5: Merge and prepare deployment

**Files:**
- Git state: `feat/refraction-section-handoff` and `main` in `C:\Users\moizjmj\Crystal Web Solution`.
- Do not modify or delete the pre-existing untracked `MEMORY.md`.

- [ ] **Step 1: Confirm the feature worktree is clean except intended changes.** Review `git diff`, `git diff --check`, tests, audit, and build output.
- [ ] **Step 2: Commit the verified feature branch.** Use a focused commit message describing the Refraction and portfolio transition update.
- [ ] **Step 3: Confirm production checkout before merge.** Verify `main` has no unrelated modifications; preserve `MEMORY.md`.
- [ ] **Step 4: Merge the feature branch into `main` with a non-fast-forward merge** so the integration point is explicit and reversible.
- [ ] **Step 5: Run post-merge tests/build from `main`.** Confirm the merged tree matches the verified feature tree and no deployment configuration changed unexpectedly.
- [ ] **Step 6: Prepare deployment state.** Report the merge commit, working-tree status, build result, and whether a deployment command was intentionally not run. Do not publish or trigger production deployment without a separate explicit instruction.

---

## Self-review

**Spec coverage:** The plan covers the approved stripe handoff, current naming constraints, existing data/routes, reduced-motion behavior, accessibility/performance audit, tests, build, merge, and deployment preparation.

**Placeholder scan:** No `TBD`, `TODO`, or unspecified “handle later” steps remain. Each task names files, interfaces, behavior, and verification commands.

**Type/name consistency:** The only new interface is `ProjectHandoffLink({ href, label, children, className, style, ...props })`. Existing names remain `Motion`, `RailCard`, `PROJECTS`, `RAIL_ACCENTS`, `DEEP_LINK_PROGRESS`, `motion-card`, `EASE_MASK`, `EASE_SETTLE`, and `/work/[slug]`.
