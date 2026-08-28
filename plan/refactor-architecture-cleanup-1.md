---
goal: Full codebase refactor — modularize CSS, consolidate components, add type safety, and remove dead code
version: 1.2
date_created: 2026-08-28
last_updated: 2026-08-28
owner: Crystal Web Solution
status: In Progress — Phase 1 done (PR #133), Phase 2 done (branch refactor/phase2-component-cleanup)
tags: [refactor, architecture, css, typescript, cleanup]
---

> **Progress note (2026-08-28):** Phase 0/1 were picked up from a Desktop
> Commander AI session that ran out of credits mid-edit on `app/globals.css`
> (a dangling duplicate `@import` was left behind and is fixed in PR #133).
> Phase 1 shipped as a 27-file CSS split, verified byte-identical to the
> original via checksum — see PR #133. Phase 2 shipped several tasks below
> as originally scoped; several others turned out, on investigation, not to
> match the actual code (no real duplication to extract) and were closed
> without a change rather than forced through — see the per-task notes in
> the tables below and PR for `refactor/phase2-component-cleanup`.

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan delivers a surgical, phased refactor of the crystalwebsolution.com Next.js codebase. The site is a high-end immersive agency portfolio (Next.js 15, React 19, GSAP, Three.js, Supabase) that has grown organically. The goal is to improve maintainability, build performance, and developer experience without changing any visual output or user-facing behavior.

## 1. Requirements & Constraints

- **REQ-001**: Zero visual regression — every pixel, animation timing, and interaction must remain identical
- **REQ-002**: Zero functional regression — all routes, API endpoints, auth flows, and CRM behavior preserved
- **REQ-003**: All existing tests must continue passing (`pnpm test`, `pnpm test:e2e`, `pnpm test:db`)
- **REQ-004**: Next.js build (`pnpm build`) must complete without new warnings or errors
- **REQ-005**: Preserve all GSAP + Three.js animation behavior including reduced-motion paths
- **REQ-006**: Preserve all SEO metadata, structured data, OpenGraph, and sitemap generation
- **REQ-007**: Keep `lib/inMotionCards.mjs` untouched per existing contractual constraint
- **CON-001**: No runtime dependency additions unless strictly necessary for type safety
- **CON-002**: Must stay on Next.js App Router (no migration to Pages Router)
- **CON-003**: Must support existing deployment pipeline (Vercel + Docker)
- **GUD-001**: Prefer surgical edits over wholesale rewrites
- **GUD-002**: Extract reusable patterns into `components/shared/` or `lib/utils/`
- **GUD-003**: Leave comments explaining *why* a pattern exists, not just *what*

## 2. Implementation Steps

### Implementation Phase 0: Pre-Flight Baseline Capture

- GOAL-000: Record build, test, visual, and performance baselines so every phase can prove "zero regression"

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000a | Run `pnpm build`, record build time + total bundle size + route count | | |
| TASK-000b | Run `pnpm test`, record pass/fail counts per suite | | |
| TASK-000c | Run `pnpm test:e2e`, record pass/fail counts | | |
| TASK-000d | Take Playwright screenshots of `/`, `/work`, `/services`, `/contact`, `/about` and archive | | |
| TASK-000e | Run Lighthouse (mobile + desktop) on `/`, `/work`, `/services`; archive scores JSON | | |
| TASK-000f | Record `globals.css` line count, `@keyframes` count, and `var(--` token count | | |
| TASK-000g | Verify `ImageBlock.module.css` works (confirms CSS Modules pipeline is live) | | |

### Implementation Phase 1: CSS Modularization

- GOAL-001: Split the 4,324-line `app/globals.css` into scoped CSS modules and a thin global reset

> **Risk note:** CSS Modules are **already proven working** via `components/marketing/ImageBlock.module.css`. No Next.js config changes are required — the only work is *moving* CSS, not *enabling* the feature.

> **Revised approach (2026-08-28):** true CSS Modules (TASK-002/003/004 as
> originally written) turned out to be unsafe here — `Menu.jsx`,
> `Services.jsx`, and `WorkLibrary.jsx` select DOM nodes with
> `querySelectorAll('.menu-link' / '.service-row' / '.work-row')` and GSAP
> animates those exact class names. CSS Modules hash class names, which
> would silently break those animations with no build error. Shipped
> instead: a 27-file split of `app/globals.css` into `app/styles/*.css`,
> imported in original cascade order, **class names left global on
> purpose**. Verified byte-identical to the pre-split file by checksum. See
> PR #133 (`worktree-refactor+css-modularization-phase1`).

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Audit `globals.css` and group rules by section/component ownership; map every `@keyframes` and `var(--` reference | Done (superseded scope — see note above) | 2026-08-28 |
| TASK-002 | ~~Extract `components/sections/*.module.css`~~ | Superseded — CSS Modules unsafe, see note above | 2026-08-28 |
| TASK-003 | ~~Extract `components/ui/*.module.css`~~ | Superseded — CSS Modules unsafe, see note above | 2026-08-28 |
| TASK-004 | ~~Extract `components/marketing/*.module.css`~~ | Superseded — CSS Modules unsafe, see note above | 2026-08-28 |
| TASK-005 | Create `app/styles/reset.css` + `app/styles/tokens.css` (design tokens: colors, fonts, spacing, z-index scale) | Done | 2026-08-28 |
| TASK-006 | Reduce `globals.css` to imports + keyframes + utility classes only (< 200 lines target) | Done — 41-line import manifest, 27 files under `app/styles/` | 2026-08-28 |
| TASK-007 | Update all components to import their module CSS; verify no class name collisions via build | Done — not applicable in the global-class approach; `pnpm build` clean | 2026-08-28 |
| TASK-008 | Run visual regression checklist: compare screenshots against Phase 0 baseline; every pixel must match | Done — MD5 checksum of resolved stylesheet vs. original is identical; 9 tests that read `globals.css` directly updated to resolve the `@import` chain | 2026-08-28 |

### Implementation Phase 2: Component Architecture Cleanup

- GOAL-002: Eliminate duplicated patterns, standardize props, and extract shared UI primitives

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Verify `components/sections/Contact.jsx` has no leftover inline form markup — it already delegates to `ContactForm variant="home"`; if clean, mark complete | Done — confirmed clean, no change needed | 2026-08-28 |
| TASK-009b | Audit `app/signup/page.jsx` inline `<style>` block — the "redundant" comment suggests dead CSS rules that should be extracted or removed | Done — investigated; the comment describes a deliberate visually-hidden-but-focusable radio input for keyboard/screen-reader nav, not dead code. No change needed | 2026-08-28 |
| TASK-010a | Extract `hooks/useReducedMotion.js` from duplicated `window.matchMedia('(prefers-reduced-motion: reduce)')` checks in `Services.jsx` (lines 47–50 and 114–117) | Done — as `lib/interactionGuards.mjs` `skipsPointerAnimation()`, a plain function rather than a hook (see TASK-010d note) | 2026-08-28 |
| TASK-010b | Extract `hooks/usePointerCoarse.js` from duplicated `window.matchMedia('(pointer: coarse)')` checks in `Services.jsx` | Done — folded into the same `skipsPointerAnimation()` helper; the two checks were always used together, never independently | 2026-08-28 |
| TASK-010c | Extract `hooks/useScrollTrigger(ref, options)` from `Mark.jsx`, `Lab.jsx`, `Hero.jsx` — consolidate GSAP ScrollTrigger setup + cleanup | Not done — investigated, premise didn't hold. `Mark.jsx`/`Hero.jsx` each have exactly one inline `scrollTrigger: {...}` config with different values; `Lab.jsx` doesn't use ScrollTrigger at all. No real duplication to extract | 2026-08-28 |
| TASK-010d | Replace both duplicated pointer/reduced-motion checks in `Services.jsx` with new hooks; verify no behavioral change | Done — kept as a plain function, not a hook: both call sites check once at effect-mount, no live reactivity existed before and none was added. `pnpm build` + `pnpm test` (448/448) clean | 2026-08-28 |
| TASK-011 | Create `components/shared/SectionHeader.jsx` to replace duplicated eyebrow + h2 patterns across sections | Done — used in `Services.jsx`/`Approach.jsx`/`Stories.jsx` (byte-identical markup, copy only differs). `Mark.jsx`/`Motion.jsx` left alone — genuinely different markup. Verified against built HTML that rendered output is unchanged | 2026-08-28 |
| TASK-012 | Create `components/shared/HandoffLink.jsx` to replace `ProjectHandoffLink.jsx` if pattern is generic | Not done — investigated, premise didn't hold. It's a single-purpose stripe-wipe transition (specific markup, specific CSS classes), not a generic pattern | 2026-08-28 |
| TASK-013 | Standardize `data-cursor` prop usage — audit all components for consistent cursor label patterns | Investigated, not acted on — 31 `data-cursor="..."` attributes exist but nothing (no JS, no CSS) reads any of them. Looks like dead markup, possibly reserved for an unbuilt custom-cursor feature. Flagging for owner confirmation rather than editing/removing — see repo's "confirm before deleting" rule | 2026-08-28 |
| TASK-014 | Extract `components/shared/ErrorBoundary.jsx` for Three.js canvas and heavy animation components | Already done — `components/three/CanvasFeatureBoundary.jsx` already exists, and with better scoping (per scene-feature, not the whole `<Canvas>`) than this task proposed | 2026-08-28 |
| TASK-015 | Audit `components/three/` for duplicate geometry/material setup — consolidate into `lib/three/` helpers | Not done — investigated, premise didn't hold. Every `new THREE.*Geometry`/`*Material` call across the directory is a distinct shape/material for a distinct visual purpose; no copy-pasted setup to consolidate | 2026-08-28 |

### Implementation Phase 3: Type Safety & Developer Experience

- GOAL-003: Add JSDoc types across `lib/` and key components; prepare TypeScript migration path

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-016 | Upgrade `jsconfig.json` → `tsconfig.json` with `allowJs: true`, `checkJs: true`, `noEmit: true` | | |
| TASK-017 | Add JSDoc `@typedef` blocks to `lib/projects.js`, `lib/services.mjs`, `lib/site.js` | | |
| TASK-018 | Type the CRM contract in `lib/crm/project-contract.mjs` with JSDoc | | |
| TASK-019 | Add JSDoc to all `components/ui/*.jsx` exports | | |
| TASK-020 | Create `types/index.d.ts` for shared shapes (Project, Service, Review, etc.) | | |
| TASK-021 | Run `tsc --noEmit` to validate types without blocking build | | |

### Implementation Phase 4: Dead Code & Performance Audit

- GOAL-004: Remove unused code, optimize bundle, and fix known issues

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-022 | Run `pnpm dlx depcheck` to find unused dependencies | | |
| TASK-023 | Audit all `dynamic()` imports — verify `ssr: false` is only where needed (`Scene` is correct; audit others) | | |
| TASK-024 | Audit Three.js component tree-shaking — ensure `three` and `@react-three/*` are not in initial bundle | | |
| TASK-025 | Remove `_tmp_clients_full/` and other temp artifacts from repo; add to `.gitignore` | | |
| TASK-026 | Optimize `public/d/02-messenger.gif` (322 KB) — all WebM files are already tiny (4–341 KB); only the GIF needs attention | | |
| TASK-027 | Review CSP in `next.config.js` — the inline comment notes "tightening them needs a nonce refactor, tracked separately"; document current state, do not change unless nonce refactor is also in scope | | |
| TASK-028 | Run Lighthouse on all major routes; compare against Phase 0 baseline; document any regression | | |

### Implementation Phase 5: Testing & Documentation

- GOAL-005: Ensure every phase is verified and documented

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-029 | Add `components/ui/work-marquee.test.jsx` for the new video rendering path | | |
| TASK-030 | Add `components/sections/Motion.test.jsx` to verify `CLIENT_TILE_IMAGES` + `REPLACEMENT_IMAGES` wiring | | |
| TASK-031 | Update `README.md` with component directory conventions and CSS module rules | | |
| TASK-032 | Create `docs/ARCHITECTURE.md` with dependency graph of sections → components → hooks → lib | | |
| TASK-033 | Run full test suite (`pnpm test && pnpm test:e2e && pnpm test:db`) — all green required | | |

## 3. Alternatives

- **ALT-001**: Full TypeScript migration now — rejected because it would touch 80+ files simultaneously, creating massive merge-conflict risk and review burden. JSDoc + `.d.ts` gives 80% of the value with 20% of the churn.
- **ALT-002**: Migrate to Tailwind CSS — rejected because the site relies heavily on bespoke CSS animations, GSAP targets, and Three.js shaders that don't map cleanly to utility classes. The current CSS-in-JS-modules approach is more appropriate for this design fidelity.
- **ALT-003**: Replace Three.js with lighter WebGL library — rejected because the crystal, flying carousel, and service rail are core brand experiences. Migration would be high-risk with minimal performance gain.
- **ALT-004**: Introduce a component library (shadcn/ui, Radix) — rejected because the site has zero standard UI patterns (no forms, dialogs, or tables in the marketing surface). The CRM dashboard could benefit later but is out of scope for this refactor.

## 4. Dependencies

- **DEP-001**: Node.js 20+ (already satisfied)
- **DEP-002**: `typescript` as devDependency (for `tsc --noEmit` checking)
- **DEP-003**: `@types/react`, `@types/react-dom` (for `.d.ts` files)
- **DEP-004**: Existing build toolchain: `next`, `pnpm`, `vitest`, `playwright`
- **DEP-005**: Optional: `purgecss` or `cssnano` for CSS optimization (evaluate in Phase 4)

## 5. Files

- **FILE-001**: `app/globals.css` → split into `app/styles/*` + `*.module.css` files
- **FILE-002**: `components/sections/*.jsx` → add `*.module.css` imports
- **FILE-003**: `components/ui/*.jsx` → add `*.module.css` imports
- **FILE-004**: `components/sections/Contact.jsx` → verify clean delegation to ContactForm
- **FILE-005**: `app/signup/page.jsx` → audit inline `<style>` block
- **FILE-006**: `lib/projects.js`, `lib/services.mjs`, `lib/site.js` → add JSDoc types
- **FILE-007**: `lib/crm/project-contract.mjs` → add JSDoc types
- **FILE-008**: `next.config.js` → CSP documentation (no change unless nonce refactor in scope)
- **FILE-009**: `README.md` → update conventions
- **FILE-010**: `docs/ARCHITECTURE.md` → new file
- **FILE-011**: `jsconfig.json` → `tsconfig.json` migration
- **FILE-012**: `components/marketing/ImageBlock.module.css` → reference proof that CSS Modules already work

## 6. Testing

- **TEST-001**: `pnpm build` must pass with zero errors and zero new warnings
- **TEST-002**: `pnpm test` (unit tests) — all existing + new tests pass
- **TEST-003**: `pnpm test:e2e` (Playwright) — all existing tests pass
- **TEST-004**: Visual regression: compare key pages (/, /work, /services, /contact, /about) against Phase 0 baseline screenshots — pixel-perfect match required
- **TEST-005**: Performance: Lighthouse scores must not decrease on mobile or desktop vs Phase 0 baseline
- **TEST-006**: Animation: all GSAP timelines and Three.js scenes must start, loop, and cleanup correctly

## 7. Risks & Assumptions

| ID | Risk / Assumption | Level | Mitigation |
|----|---------------------|-------|------------|
| RISK-001 | CSS modularization may introduce class name collisions | **Medium** | Use `[hash]` suffix in CSS Modules config; `ImageBlock.module.css` already proves the pipeline works |
| RISK-002 | `globals.css` keyframes and CSS custom properties may have hidden dependencies | **Medium** | TASK-001 maps every `@keyframes` and `var(--` reference before any move |
| RISK-003 | Three.js `useFrame` and GSAP `ScrollTrigger` cleanup may be missed during component reorganization | **Medium** | Add explicit `useEffect` return cleanup in every moved component; verify via build + e2e |
| RISK-004 | CRM tests (`crm-read-model-hardening.test.mjs`) are tightly coupled to file paths | **Low** | No `lib/` file moves planned in this refactor; only JSDoc additions |
| RISK-005 | Hook extraction in `Services.jsx` may change timing if hooks are not pure | **Low** | Extract only media-query checks (pure, no side effects); keep GSAP timeline logic inline |
| ASSUMPTION-001 | The user will approve each phase before the next begins (stop-gate per phase) | — | Built into plan structure |
| ASSUMPTION-002 | No new features will be merged into `main` during the refactor window | — | Coordinate with team |

## 8. Related Specifications / Further Reading

- [TRIONN-ADAPTATION.md](C:\Users\moizjmj\Crystal Web Solution\TRIONN-ADAPTATION.md) — current motion/animation architecture decisions
- [MOTION-BUNDLE-AUDIT.md](C:\Users\moizjmj\Crystal Web Solution\MOTION-BUNDLE-AUDIT.md) — existing bundle analysis
- [ADR-001-auth-flow.md](C:\Users\moizjmj\Crystal Web Solution\ADR-001-auth-flow.md) — auth architecture
- [ADR-002-contact-form-rate-limiting.md](C:\Users\moizjmj\Crystal Web Solution\ADR-002-contact-form-rate-limiting.md) — contact form decisions
- Next.js CSS Modules docs: https://nextjs.org/docs/app/building-your-application/styling/css-modules
