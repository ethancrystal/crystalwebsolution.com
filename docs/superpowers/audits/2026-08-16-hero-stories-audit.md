# Hero, Stories, and Motion Handoff Audit

**Date:** 2026-08-16  
**Build under test:** `feat/refraction-section-handoff` production build  
**Target:** local Next production server at `127.0.0.1:3100`

## Executive result

The audited production build passed the focused browser checks for Hero, Stories, and the Motion portfolio handoff. Desktop, mobile, and reduced-motion runs returned HTTP 200, showed no horizontal overflow, reported no console errors or failed network requests, and retained the Hero, Stories, and active review panel DOM. The Motion card handoff rendered the five-stripe overlay and reached the existing `/work/tucker-trips` route through the existing project slug.

## Measurements

| Scenario | HTTP | Viewport | Overflow | Hero | Hero sweep | Stories | Story panels | Active panel | DCL | Load | Console errors | Failed requests |
|---|---:|---:|---:|---|---|---|---:|---:|---:|---:|---:|---:|
| Desktop | 200 | 1440×900 | 0px | Present | Present | Present | 3 | 1 | 41ms | 428ms | 0 | 0 |
| Mobile | 200 | 390×844 | 0px | Present | Present | Present | 3 | 1 | 273ms | 440ms | 0 | 0 |
| Reduced motion | 200 | 1440×900 | 0px | Present | Present in DOM; decorative motion fallback applies | Present | 3 | 1 | Recorded in audit JSON | Recorded in audit JSON | 0 | 0 |

The browser audit also confirmed that the first Motion card retained `href="/work/tucker-trips"`, rendered one `project-handoff-overlay` with five `[data-project-stripe]` elements, and navigated to `http://127.0.0.1:3100/work/tucker-trips` after the click choreography. The audit used polling for the client-side route because Next App Router navigation does not require a full browser load event.

## Accessibility checks

The Hero retained one document `h1`, the Stories section retained three tab panels with one active panel, the project cards retained descriptive `aria-label` values, and the handoff overlay is `aria-hidden` and `pointer-events: none`. Mobile width produced no document overflow. Reduced-motion mode preserved content and route access rather than removing the interactive card or review controls.

## Performance checks

The production bundle compiled successfully and the browser measured sub-500ms DOM/load timing in the audited local environment for the desktop and mobile homepage runs. The transition animates transform/opacity on the handoff overlay and does not add a render loop, per-frame React state, or new Three.js scene. Chromium emitted GPU driver/context-loss warnings while the existing WebGL scene was being exercised in headless mode; these were not page console errors or failed requests and should be treated as an environment-specific headless-GPU observation, not as a confirmed production regression.

## Verification commands

```text
pnpm test
pnpm build
node cws-hero-stories-audit.mjs
```

All commands completed successfully on the verified feature tree. The remaining `git diff --check` output is limited to existing line-ending normalization notices and the existing blank line at EOF in `components/Experience.jsx`.
